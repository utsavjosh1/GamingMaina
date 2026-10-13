"use server";

import { updateTag } from "next/cache";
import { and, asc, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { requireAdmin, requirePermission, requireStaff } from "@/lib/auth/server";
import { getDelhiDate, getDelhiDayOfWeek, getNextDelhiDates, toDelhiInstant } from "@/lib/dates";
import { assertBookingTransition, assertSessionTransition } from "@/lib/domain/transitions";
import { quoteSessionPrice } from "@/lib/domain/pricing";
import { AUDIT_ACTIONS, writeAudit } from "@/lib/domain/audit";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/lib/domain/idempotency";
import {
  assignStationSchema,
  cashMovementSchema,
  checkInSchema,
  closeRegisterSchema,
  collectPaymentSchema,
  openRegisterSchema,
  stationStatusSchema,
} from "@/lib/domain/validation";
import { conflict, notFound, paymentError, validationError } from "@/lib/domain/errors";
import { db } from "@/lib/db";
import {
  auditLogs,
  bookings,
  cashMovements,
  cashRegisters,
  payments,
  pricingRules,
  profiles,
  sessions,
  stationTypes,
  stations,
} from "@/lib/db/schema";
import { toBooking, toSession, toStation } from "@/lib/db/queries";
import type { AdminBooking, AdminSession, AdminStation, Payment, Session, StationStatus } from "@/lib/supabase/types";

const isUuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value);
const STATION_TYPE_AVAILABILITY_TAG = "station-type-availability";

export async function getBookingsForDate(date: string) {
  const { user, org, branch } = await requireStaff();
  // Lazy expiry: held bookings past their 15-minute window expire on read
  // so the floor never shows stale holds. Explicit runs via runBookingExpiry.
  await db.transaction((tx) => expireStaleBookingsTx(tx, user.id, org.id, branch.id)).catch(() => undefined);
  const rows = await db
    .select({ booking: bookings, stationType: stationTypes, station: stations, profile: profiles })
    .from(bookings)
    .leftJoin(stationTypes, eq(bookings.stationTypeId, stationTypes.id))
    .leftJoin(stations, eq(bookings.stationId, stations.id))
    .leftJoin(profiles, eq(bookings.userId, profiles.id))
    .where(and(eq(bookings.bookingDate, date), eq(bookings.branchId, branch.id)))
    .orderBy(asc(bookings.startTime));

  return rows.map(({ booking, stationType, station, profile }) => ({
    ...toBooking(booking, stationType, profile),
    station: station ? toStation(station, stationType) : null,
  })) as unknown as AdminBooking[];
}

export async function getAllStations() {
  const { branch } = await requireStaff();
  const rows = await db
    .select({ station: stations, stationType: stationTypes })
    .from(stations)
    .leftJoin(stationTypes, eq(stations.stationTypeId, stationTypes.id))
    .where(eq(stations.branchId, branch.id))
    .orderBy(asc(stations.name));
  return rows.map(({ station, stationType }) => toStation(station, stationType)) as unknown as AdminStation[];
}

export async function getActiveSessions() {
  const { branch } = await requireStaff();
  const rows = await db
    .select({ session: sessions, station: stations, stationType: stationTypes, profile: profiles })
    .from(sessions)
    .leftJoin(stations, eq(sessions.stationId, stations.id))
    .leftJoin(stationTypes, eq(stations.stationTypeId, stationTypes.id))
    .leftJoin(profiles, eq(sessions.userId, profiles.id))
    .where(and(inArray(sessions.status, ["active", "paused"]), eq(sessions.branchId, branch.id)))
    .orderBy(desc(sessions.startedAt));

  return rows.map(({ session, station, stationType, profile }) => toSession(
    session,
    station ? toStation(station, stationType) : null,
    profile,
  )) as unknown as AdminSession[];
}

export async function startSession(stationId: string, userId?: string, idempotencyKey?: string, bookingId?: string) {
  if (!isUuid(stationId)) throw validationError("Invalid station");
  if (userId && userId.length > 120) throw validationError("Invalid user");
  if (bookingId && !isUuid(bookingId)) throw validationError("Invalid booking");
  if (idempotencyKey && (idempotencyKey.length < 8 || idempotencyKey.length > 100)) {
    throw validationError("Invalid idempotency key");
  }
  const { user, org, branch } = await requirePermission("station.start_session");

  const session = await db.transaction(async (tx) => {
    if (idempotencyKey) {
      const claim = await claimIdempotencyKey(tx, {
        key: idempotencyKey,
        userId: user.id,
        action: "session.start",
        ttlHours: 24,
      });
      if (claim.replay) return claim.response as typeof sessions.$inferSelect;
    }

    // A linked booking must be checked in and (if assigned) point at this station.
    // The session bills to the booking's customer to prevent misattribution.
    let effectiveUserId: string | null = userId || null;
    if (bookingId) {
      const [booking] = await tx.select().from(bookings)
        .where(and(eq(bookings.id, bookingId), eq(bookings.branchId, branch.id)))
        .limit(1);
      if (!booking) throw notFound("Booking not found");
      if (booking.status !== "checked_in") {
        throw conflict("Only checked-in bookings can start a session", { status: booking.status });
      }
      if (booking.stationId && booking.stationId !== stationId) {
        throw conflict("Booking is assigned to a different station");
      }
      if (userId && userId !== booking.userId) {
        throw conflict("Session customer does not match the booking");
      }
      effectiveUserId = booking.userId;
    }

    const [station] = await tx.update(stations)
      .set({ status: "in_use" })
      .where(and(eq(stations.id, stationId), eq(stations.branchId, branch.id), inArray(stations.status, ["available", "booked"])))
      .returning();
    if (!station) throw conflict("Station is not available");

    const [created] = await tx.insert(sessions).values({
      bookingId: bookingId || null,
      branchId: branch.id,
      stationId,
      userId: effectiveUserId,
      startedBy: user.id,
      status: "active",
    }).returning();
    if (!created) throw conflict("Session could not be started");
    await tx.update(stations).set({ currentSessionId: created.id }).where(eq(stations.id, stationId));
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.sessionStarted,
      entityType: "session",
      entityId: created.id,
      orgId: org.id,
      branchId: branch.id,
      newValue: { station_id: stationId, user_id: effectiveUserId, booking_id: bookingId ?? null },
    });
    if (idempotencyKey) {
      await completeIdempotencyKey(tx, idempotencyKey, created);
    }
    return created;
  });

  updateTag(STATION_TYPE_AVAILABILITY_TAG);
  return toSession(session) as Session;
}

export async function endSession(sessionId: string, idempotencyKey?: string) {
  if (!isUuid(sessionId)) throw validationError("Invalid session");
  if (idempotencyKey && (idempotencyKey.length < 8 || idempotencyKey.length > 100)) {
    throw validationError("Invalid idempotency key");
  }
  const { user, org, branch } = await requirePermission("station.end_session");

  return db.transaction(async (tx) => {
    if (idempotencyKey) {
      const claim = await claimIdempotencyKey(tx, {
        key: idempotencyKey,
        userId: user.id,
        action: "session.end",
        ttlHours: 24,
      });
      if (claim.replay) {
        return claim.response as { sessionId: string; totalMinutes: number; totalPrice: number; stationName: string };
      }
    }

    const [row] = await tx
      .select({ session: sessions, station: stations, stationType: stationTypes, profile: profiles })
      .from(sessions)
      .leftJoin(stations, eq(sessions.stationId, stations.id))
      .leftJoin(stationTypes, eq(stations.stationTypeId, stationTypes.id))
      .leftJoin(profiles, eq(sessions.userId, profiles.id))
      .where(and(eq(sessions.id, sessionId), eq(sessions.branchId, branch.id)))
      .limit(1);
    if (!row || !row.station || !row.stationType || !["active", "paused"].includes(row.session.status)) {
      throw conflict("Session cannot be ended");
    }
    assertSessionTransition(row.session.status, "completed");

    const now = new Date();
    const extraPause = row.session.pausedAt ? Math.ceil((now.getTime() - row.session.pausedAt.getTime()) / 60000) : 0;
    const pausedMinutes = row.session.totalPausedMinutes + extraPause;
    const billableMinutes = Math.max(Math.ceil((now.getTime() - row.session.startedAt.getTime()) / 60000) - pausedMinutes, 0);
    const rules = await tx.select().from(pricingRules)
      .where(and(eq(pricingRules.isActive, true), eq(pricingRules.branchId, branch.id)))
      .orderBy(desc(pricingRules.priority));
    // One pricing engine (contract §9) — same rules, scoped to station type.
    const scopedRules = rules.filter((rule) => !rule.stationTypeId || rule.stationTypeId === row.stationType!.id);
    const day = getDelhiDayOfWeek(getDelhiDate(now));
    const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
    const quote = quoteSessionPrice({
      basePricePerHourPaise: row.stationType.basePricePerHour,
      billableMinutes,
      rules: scopedRules,
      dayOfWeek: day,
      startTimeHHMM: currentTime.slice(0, 5),
      membershipType: row.profile?.membershipType ?? null,
    });

    const charge = quote.totalPaise;
    const [ended] = await tx.update(sessions).set({
      status: "completed",
      endedAt: now,
      pausedAt: null,
      totalPausedMinutes: pausedMinutes,
    }).where(eq(sessions.id, sessionId)).returning({ id: sessions.id });
    if (!ended) throw conflict("Session cannot be ended");
    await tx.update(stations).set({ status: "available", currentSessionId: null })
      .where(and(eq(stations.id, row.station.id), eq(stations.currentSessionId, sessionId)));
    if (charge > 0) {
      await tx.insert(payments).values({
        sessionId,
        branchId: branch.id,
        bookingId: row.session.bookingId,
        userId: row.session.userId,
        amount: charge,
        paymentStatus: "pending",
        paymentMethod: null,
        collectedBy: null,
        notes: "Session charge awaiting collection",
      });
    }
    // A linked booking completes with its session; collection happens
    // against the pending session charge via collectPayment(sessionId).
    if (row.session.bookingId) {
      const [bookingDone] = await tx.update(bookings)
        .set({ status: "completed" })
        .where(and(eq(bookings.id, row.session.bookingId), eq(bookings.branchId, branch.id), inArray(bookings.status, ["confirmed", "checked_in"])))
        .returning({ id: bookings.id });
      if (bookingDone) {
        await writeAudit(tx, {
          actorId: user.id,
          action: AUDIT_ACTIONS.bookingCompleted,
          entityType: "booking",
          entityId: bookingDone.id,
          orgId: org.id,
          branchId: branch.id,
          oldValue: { status: "checked_in" },
          newValue: { status: "completed" },
        });
      }
    }

    const result = {
      sessionId,
      totalMinutes: billableMinutes,
      totalPrice: charge,
      stationName: row.station.name,
    };
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.sessionCompleted,
      entityType: "session",
      entityId: sessionId,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { status: row.session.status },
      newValue: { ...result, status: "completed" },
    });
    if (idempotencyKey) {
      await completeIdempotencyKey(tx, idempotencyKey, result);
    }
    return result;
  }).finally(() => updateTag(STATION_TYPE_AVAILABILITY_TAG));
}

export async function pauseSession(sessionId: string) {
  if (!isUuid(sessionId)) throw validationError("Invalid session");
  const { user, org, branch } = await requirePermission("session.pause_resume");
  return db.transaction(async (tx) => {
    const [result] = await tx.update(sessions)
      .set({ status: "paused", pausedAt: new Date() })
      .where(and(eq(sessions.id, sessionId), eq(sessions.branchId, branch.id), eq(sessions.status, "active")))
      .returning();
    if (!result) throw conflict("Session is not active");
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.sessionPaused,
      entityType: "session",
      entityId: result.id,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { status: "active" },
      newValue: { status: "paused" },
    });
    return toSession(result) as Session;
  });
}

export async function resumeSession(sessionId: string) {
  if (!isUuid(sessionId)) throw validationError("Invalid session");
  const { user, org, branch } = await requirePermission("session.pause_resume");
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.branchId, branch.id), eq(sessions.status, "paused")))
      .limit(1);
    if (!current?.pausedAt) throw conflict("Session is not paused");
    assertSessionTransition(current.status, "active");
    const pauseMinutes = Math.ceil((Date.now() - current.pausedAt.getTime()) / 60000);
    const [result] = await tx.update(sessions).set({
      status: "active",
      pausedAt: null,
      totalPausedMinutes: current.totalPausedMinutes + pauseMinutes,
    }).where(eq(sessions.id, sessionId)).returning();
    if (!result) throw conflict("Session cannot be resumed");
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.sessionResumed,
      entityType: "session",
      entityId: result.id,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { status: "paused" },
      newValue: { status: "active" },
    });
    return toSession(result) as Session;
  });
}

export async function updateStationStatus(stationId: string, status: Extract<StationStatus, "available" | "maintenance" | "offline">) {
  if (!isUuid(stationId)) throw validationError("Invalid station");
  const parsedStatus = stationStatusSchema.safeParse(status);
  if (!parsedStatus.success) throw validationError("Invalid station status");
  const { user, org, branch } = await requirePermission("station.update_status");

  const allowedCurrentStatuses = status === "available"
    ? ["maintenance", "offline"]
    : ["available"];

  return db.transaction(async (tx) => {
    const [result] = await tx.update(stations).set({ status, updatedAt: new Date() })
      .where(and(eq(stations.id, stationId), eq(stations.branchId, branch.id), inArray(stations.status, allowedCurrentStatuses)))
      .returning({ id: stations.id });
    if (!result) throw conflict(status === "available" ? "Station is still occupied or no longer exists" : "Station is busy or no longer exists");
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.stationStatusChanged,
      entityType: "station",
      entityId: result.id,
      orgId: org.id,
      branchId: branch.id,
      newValue: { status },
    });
    updateTag(STATION_TYPE_AVAILABILITY_TAG);
    return { success: true };
  });
}

export async function collectPayment(raw: {
  bookingId?: string;
  sessionId?: string;
  userId?: string;
  amount: number;
  method: "cash" | "upi" | "card";
  upiReference?: string;
  notes?: string;
  idempotencyKey?: string;
}) {
  const parsed = collectPaymentSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid payment", { issues: parsed.error.issues });
  const data = parsed.data;
  const { user, org, branch } = await requirePermission("payment.collect");

  return db.transaction(async (tx) => {
    if (data.idempotencyKey) {
      const claim = await claimIdempotencyKey(tx, {
        key: data.idempotencyKey,
        userId: user.id,
        action: "payment.collect",
        ttlHours: 24 * 30,
      });
      if (claim.replay) return claim.response as Payment;
    }

    let expected: number | null = null;
    let targetUser: string | null = data.userId || null;
    if (data.bookingId) {
      const [booking] = await tx.select({ amount: bookings.estimatedPrice, userId: bookings.userId })
        .from(bookings).where(and(eq(bookings.id, data.bookingId), eq(bookings.branchId, branch.id))).limit(1);
      if (!booking) throw notFound("Booking not found");
      expected = booking.amount;
      targetUser = booking.userId;
    } else if (data.sessionId) {
      const [pending] = await tx.select({ amount: payments.amount, userId: payments.userId })
        .from(payments).where(and(eq(payments.sessionId, data.sessionId), eq(payments.branchId, branch.id), eq(payments.paymentStatus, "pending"))).limit(1);
      if (!pending) throw notFound("No pending session charge");
      expected = pending.amount;
      targetUser = pending.userId;
    }
    if (expected !== null && data.amount !== expected) throw paymentError("Payment amount does not match charge", { expected, got: data.amount });

    const pending = data.bookingId
      ? (await tx.select().from(payments).where(and(eq(payments.bookingId, data.bookingId), eq(payments.branchId, branch.id), eq(payments.paymentStatus, "pending"))).limit(1))[0]
      : data.sessionId
        ? (await tx.select().from(payments).where(and(eq(payments.sessionId, data.sessionId), eq(payments.branchId, branch.id), eq(payments.paymentStatus, "pending"))).limit(1))[0]
        : undefined;
    const values = {
      paymentStatus: "paid",
      paymentMethod: data.method,
      collectedBy: user.id,
      upiReference: data.upiReference?.trim() || null,
      notes: data.notes?.trim() || null,
    } as const;
    const [payment] = pending
      ? await tx.update(payments).set(values).where(eq(payments.id, pending.id)).returning()
      : await tx.insert(payments).values({
          bookingId: data.bookingId || null,
          branchId: branch.id,
          sessionId: data.sessionId || null,
          userId: targetUser,
          amount: data.amount,
          ...values,
        }).returning();
    if (!payment) throw paymentError("Unable to record payment");
    if (data.bookingId) {
      await tx.update(bookings).set({ status: "completed" })
        .where(and(eq(bookings.id, data.bookingId), eq(bookings.branchId, branch.id), inArray(bookings.status, ["confirmed", "checked_in"])));
    }
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.paymentCollected,
      entityType: "payment",
      entityId: payment.id,
      orgId: org.id,
      branchId: branch.id,
      newValue: {
        amount: payment.amount,
        method: payment.paymentMethod,
        booking_id: payment.bookingId,
        session_id: payment.sessionId,
      },
    });
    // Cash sales post to the open register in the same transaction.
    // The payment-method unique index makes replays/post-retries safe.
    if (data.method === "cash") {
      const [register] = await tx.select({ id: cashRegisters.id })
        .from(cashRegisters)
        .where(and(eq(cashRegisters.status, "open"), eq(cashRegisters.branchId, branch.id)))
        .limit(1);
      if (register) {
        await tx.insert(cashMovements).values({
          registerId: register.id,
          type: "sale",
          amount: payment.amount,
          paymentId: payment.id,
          actorId: user.id,
          notes: data.notes?.trim() || null,
        }).onConflictDoNothing();
      }
    }
    if (data.idempotencyKey) {
      await completeIdempotencyKey(tx, data.idempotencyKey, payment);
    }
    return payment as unknown as Payment;
  });
}

// ─── Phase 2: booking lifecycle + floor assignment ─────────────────────

type BookingTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Release a booking's reserved station. Never touches live sessions. */
async function releaseBookingStation(tx: BookingTx, stationId: string | null) {
  if (!stationId) return;
  await tx.update(stations)
    .set({ status: "available", updatedAt: new Date() })
    .where(and(eq(stations.id, stationId), eq(stations.status, "booked"), isNull(stations.currentSessionId)));
}

/** Expire held bookings whose 15-minute check-in window has passed. Branch-scoped. */
async function expireStaleBookingsTx(tx: BookingTx, actorId: string | null, orgId: string, branchId: string) {
  const now = new Date();
  const stale = await tx
    .select({ id: bookings.id, stationId: bookings.stationId })
    .from(bookings)
    .where(and(eq(bookings.status, "confirmed"), eq(bookings.branchId, branchId), lt(bookings.expiresAt, now)));
  let expired = 0;
  for (const booking of stale) {
    const [updated] = await tx.update(bookings)
      .set({ status: "expired" })
      .where(and(eq(bookings.id, booking.id), eq(bookings.status, "confirmed")))
      .returning({ id: bookings.id });
    if (!updated) continue;
    await releaseBookingStation(tx, booking.stationId);
    await writeAudit(tx, {
      actorId,
      action: AUDIT_ACTIONS.bookingExpired,
      entityType: "booking",
      entityId: booking.id,
      orgId,
      branchId,
      oldValue: { status: "confirmed" },
      newValue: { status: "expired" },
    });
    expired += 1;
  }
  return expired;
}

export async function runBookingExpiry() {
  const { user, org, branch } = await requireStaff();
  const expired = await db.transaction((tx) => expireStaleBookingsTx(tx, user.id, org.id, branch.id));
  return { expired };
}

export async function checkInBooking(raw: { bookingId: string; stationId?: string }) {
  const parsed = checkInSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid check-in");
  const { user, org, branch } = await requirePermission("booking.manage");
  const today = getDelhiDate();

  return db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings)
      .where(and(eq(bookings.id, parsed.data.bookingId), eq(bookings.branchId, branch.id)))
      .limit(1);
    if (!booking) throw notFound("Booking not found");
    assertBookingTransition(booking.status, "checked_in");
    // Same-day check-in only: prevents checking in tomorrow's reservations
    // against today's floor and revenue.
    if (booking.bookingDate !== today) {
      throw conflict("Only today's bookings can be checked in", { bookingDate: booking.bookingDate });
    }

    let assignedStation: { id: string; name: string } | null = null;
    if (parsed.data.stationId) {
      const [station] = await tx.select().from(stations)
        .where(and(eq(stations.id, parsed.data.stationId), eq(stations.branchId, branch.id)))
        .limit(1);
      if (!station) throw notFound("Station not found");
      if (station.stationTypeId !== booking.stationTypeId) {
        throw conflict("Station type does not match the booking");
      }
      const [reserved] = await tx.update(stations)
        .set({ status: "booked", updatedAt: new Date() })
        .where(and(eq(stations.id, station.id), eq(stations.branchId, branch.id), eq(stations.status, "available")))
        .returning({ id: stations.id, name: stations.name });
      if (!reserved) throw conflict("Station is no longer available");
      await tx.update(bookings)
        .set({ stationId: station.id })
        .where(eq(bookings.id, booking.id));
      assignedStation = reserved;
      await writeAudit(tx, {
        actorId: user.id,
        action: AUDIT_ACTIONS.bookingStationAssigned,
        entityType: "booking",
        entityId: booking.id,
        orgId: org.id,
        branchId: branch.id,
        newValue: { station_id: station.id, station_name: station.name },
      });
    }

    const [checkedIn] = await tx.update(bookings)
      .set({ status: "checked_in" })
      .where(and(eq(bookings.id, booking.id), eq(bookings.branchId, branch.id), eq(bookings.status, "confirmed")))
      .returning({ id: bookings.id });
    if (!checkedIn) throw conflict("Booking cannot be checked in");
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.bookingCheckedIn,
      entityType: "booking",
      entityId: booking.id,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { status: "confirmed" },
      newValue: { status: "checked_in", station_id: assignedStation?.id ?? booking.stationId },
    });
    updateTag(STATION_TYPE_AVAILABILITY_TAG);
    return { id: booking.id, station: assignedStation };
  });
}

export async function assignStation(raw: { bookingId: string; stationId: string }) {
  const parsed = assignStationSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid assignment");
  const { user, org, branch } = await requirePermission("booking.manage");

  return db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings)
      .where(and(eq(bookings.id, parsed.data.bookingId), eq(bookings.branchId, branch.id)))
      .limit(1);
    if (!booking) throw notFound("Booking not found");
    if (!["confirmed", "checked_in"].includes(booking.status)) {
      throw conflict(`Station cannot be assigned to a ${booking.status} booking`);
    }
    const [station] = await tx.select().from(stations)
      .where(and(eq(stations.id, parsed.data.stationId), eq(stations.branchId, branch.id)))
      .limit(1);
    if (!station) throw notFound("Station not found");
    if (station.stationTypeId !== booking.stationTypeId) {
      throw conflict("Station type does not match the booking");
    }
    if (booking.stationId && booking.stationId !== station.id) {
      await releaseBookingStation(tx, booking.stationId);
    }
    const [reserved] = await tx.update(stations)
      .set({ status: "booked", updatedAt: new Date() })
      .where(and(eq(stations.id, station.id), eq(stations.branchId, branch.id), eq(stations.status, "available")))
      .returning({ id: stations.id, name: stations.name });
    if (!reserved) throw conflict("Station is no longer available");
    await tx.update(bookings).set({ stationId: station.id }).where(eq(bookings.id, booking.id));
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.bookingStationAssigned,
      entityType: "booking",
      entityId: booking.id,
      orgId: org.id,
      branchId: branch.id,
      newValue: { station_id: station.id, station_name: station.name },
    });
    updateTag(STATION_TYPE_AVAILABILITY_TAG);
    return { id: booking.id, station: reserved };
  });
}

export async function markNoShow(bookingId: string) {
  if (!isUuid(bookingId)) throw validationError("Invalid booking");
  const { user, org, branch } = await requirePermission("booking.manage");
  return db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.branchId, branch.id)))
      .limit(1);
    if (!booking) throw notFound("Booking not found");
    assertBookingTransition(booking.status, "no_show");
    const [updated] = await tx.update(bookings)
      .set({ status: "no_show" })
      .where(and(eq(bookings.id, booking.id), eq(bookings.branchId, branch.id), inArray(bookings.status, ["confirmed", "checked_in"])))
      .returning({ id: bookings.id });
    if (!updated) throw conflict("Booking cannot be marked no-show");
    await releaseBookingStation(tx, booking.stationId);
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.bookingNoShow,
      entityType: "booking",
      entityId: booking.id,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { status: booking.status },
      newValue: { status: "no_show" },
    });
    updateTag(STATION_TYPE_AVAILABILITY_TAG);
    return { success: true };
  });
}

export async function cancelBookingAsStaff(bookingId: string) {
  if (!isUuid(bookingId)) throw validationError("Invalid booking");
  const { user, org, branch } = await requirePermission("booking.manage");
  return db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.branchId, branch.id)))
      .limit(1);
    if (!booking) throw notFound("Booking not found");
    assertBookingTransition(booking.status, "cancelled");
    const [updated] = await tx.update(bookings)
      .set({ status: "cancelled" })
      .where(and(eq(bookings.id, booking.id), eq(bookings.branchId, branch.id), inArray(bookings.status, ["confirmed", "checked_in"])))
      .returning({ id: bookings.id });
    if (!updated) throw conflict("Booking cannot be cancelled");
    await releaseBookingStation(tx, booking.stationId);
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.bookingCancelled,
      entityType: "booking",
      entityId: booking.id,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { status: booking.status },
      newValue: { status: "cancelled" },
    });
    updateTag(STATION_TYPE_AVAILABILITY_TAG);
    return { success: true };
  });
}

// ─── Phase 2b: cash register ───────────────────────────────────────────

/** Expected cash = opening + signed movements. History is never rewritten. */
export async function getCashStatus() {
  const { branch } = await requireStaff();
  const [register] = await db.select().from(cashRegisters)
    .where(and(eq(cashRegisters.status, "open"), eq(cashRegisters.branchId, branch.id)))
    .limit(1);
  if (!register) return { register: null, expected: 0, movements: [] as typeof cashMovements.$inferSelect[] };
  const movements = await db.select().from(cashMovements)
    .where(eq(cashMovements.registerId, register.id))
    .orderBy(desc(cashMovements.createdAt))
    .limit(200);
  const expected = register.openingAmount + movements.reduce((sum, m) => sum + m.amount, 0);
  return { register, expected, movements };
}

export async function getCashHistory(limit = 20) {
  const { branch } = await requireStaff();
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  return db.select().from(cashRegisters)
    .where(eq(cashRegisters.branchId, branch.id))
    .orderBy(desc(cashRegisters.createdAt))
    .limit(safeLimit);
}

export async function openRegister(raw: { name?: string; openingAmount: number }) {
  const parsed = openRegisterSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid register");
  const { user, org, branch } = await requirePermission("cash.manage");
  try {
    const [register] = await db.insert(cashRegisters).values({
      name: parsed.data.name ?? "Counter",
      branchId: branch.id,
      status: "open",
      openedBy: user.id,
      openingAmount: parsed.data.openingAmount,
    }).returning();
    await writeAudit(db, {
      actorId: user.id,
      action: AUDIT_ACTIONS.cashOpened,
      entityType: "cash_register",
      entityId: register.id,
      orgId: org.id,
      branchId: branch.id,
      newValue: { name: register.name, opening_amount: register.openingAmount },
    });
    return register;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw conflict("A cash register is already open");
    }
    throw error;
  }
}

export async function recordCashMovement(raw: { type: string; amount: number; notes?: string; idempotencyKey?: string }) {
  const parsed = cashMovementSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid movement");
  const { user, org, branch } = await requirePermission("cash.manage");
  return db.transaction(async (tx) => {
    if (parsed.data.idempotencyKey) {
      const claim = await claimIdempotencyKey(tx, {
        key: parsed.data.idempotencyKey,
        userId: user.id,
        action: "cash.movement",
        ttlHours: 24 * 30,
      });
      if (claim.replay) return claim.response as typeof cashMovements.$inferSelect;
    }
    const [register] = await tx.select({ id: cashRegisters.id })
      .from(cashRegisters)
      .where(and(eq(cashRegisters.status, "open"), eq(cashRegisters.branchId, branch.id)))
      .limit(1);
    if (!register) throw conflict("No open cash register");
    const [movement] = await tx.insert(cashMovements).values({
      registerId: register.id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      actorId: user.id,
      notes: parsed.data.notes?.trim() || null,
    }).returning();
    if (!movement) throw conflict("Movement could not be recorded");
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.cashMovement,
      entityType: "cash_movement",
      entityId: movement.id,
      orgId: org.id,
      branchId: branch.id,
      newValue: { type: movement.type, amount: movement.amount },
    });
    if (parsed.data.idempotencyKey) {
      await completeIdempotencyKey(tx, parsed.data.idempotencyKey, movement);
    }
    return movement;
  });
}

export async function closeRegister(raw: { registerId: string; countedAmount: number }) {
  const parsed = closeRegisterSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid close");
  const { user, org, branch } = await requirePermission("cash.manage");
  // Deterministic key: a register closes exactly once; re-close replays the settlement.
  const key = `cash-close:${parsed.data.registerId}`;
  return db.transaction(async (tx) => {
    const claim = await claimIdempotencyKey(tx, { key, userId: user.id, action: "cash.close", ttlHours: 24 * 90 });
    if (claim.replay) {
      return claim.response as { registerId: string; expected: number; counted: number; variance: number };
    }
    const [register] = await tx.select().from(cashRegisters)
      .where(and(eq(cashRegisters.id, parsed.data.registerId), eq(cashRegisters.branchId, branch.id)))
      .limit(1);
    if (!register) throw notFound("Register not found");
    if (register.status !== "open") throw conflict("Register is already closed");
    const movements = await tx.select({ amount: cashMovements.amount })
      .from(cashMovements)
      .where(eq(cashMovements.registerId, register.id));
    const expected = register.openingAmount + movements.reduce((sum, m) => sum + m.amount, 0);
    const variance = parsed.data.countedAmount - expected;
    const [closed] = await tx.update(cashRegisters).set({
      status: "closed",
      closedBy: user.id,
      closedAt: new Date(),
      countedAmount: parsed.data.countedAmount,
      variance,
    }).where(and(eq(cashRegisters.id, register.id), eq(cashRegisters.status, "open")))
      .returning({ id: cashRegisters.id });
    if (!closed) throw conflict("Register is already closed");
    const result = { registerId: register.id, expected, counted: parsed.data.countedAmount, variance };
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.cashClosed,
      entityType: "cash_register",
      entityId: register.id,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { status: "open" },
      newValue: { ...result, status: "closed" },
    });
    await completeIdempotencyKey(tx, key, result);
    return result;
  });
}

export async function getTodayRevenue() {
  const { branch } = await requireStaff();
  const [today, tomorrow] = getNextDelhiDates(2);
  const rows = await db.select({ amount: payments.amount, method: payments.paymentMethod })
    .from(payments)
    .where(and(eq(payments.paymentStatus, "paid"), eq(payments.branchId, branch.id), gte(payments.createdAt, toDelhiInstant(today, "00:00")), lt(payments.createdAt, toDelhiInstant(tomorrow, "00:00"))));
  const byMethod: Record<string, number> = {};
  let total = 0;
  for (const payment of rows) {
    total += payment.amount;
    if (payment.method) byMethod[payment.method] = (byMethod[payment.method] || 0) + payment.amount;
  }
  return { total, byMethod, count: rows.length };
}

/** Acting tenancy for the signed-in staffer — drives branch labels in the UI. */
export async function getActingContext() {
  const { org, branch, effectiveRole } = await requireStaff();
  return { org, branch, effectiveRole };
}

export async function getAuditLogs(limit = 50) {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
  await requireAdmin();
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(safeLimit);
  return rows.map((row) => ({
    id: row.id,
    actor_id: row.actorId,
    action: row.action,
    entity_type: row.entityType,
    entity_id: row.entityId,
    old_value: row.oldValue,
    new_value: row.newValue,
    ip_address: row.ipAddress,
    created_at: row.createdAt.toISOString(),
  }));
}
