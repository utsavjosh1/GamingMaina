"use server";

import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { requireAdmin, requireStaff } from "@/lib/auth/server";
import { getDelhiDate, getDelhiDayOfWeek, getNextDelhiDates, toDelhiInstant } from "@/lib/dates";
import { db } from "@/lib/db";
import {
  auditLogs,
  bookings,
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

export async function getBookingsForDate(date: string) {
  await requireStaff();
  const rows = await db
    .select({ booking: bookings, stationType: stationTypes, station: stations, profile: profiles })
    .from(bookings)
    .leftJoin(stationTypes, eq(bookings.stationTypeId, stationTypes.id))
    .leftJoin(stations, eq(bookings.stationId, stations.id))
    .leftJoin(profiles, eq(bookings.userId, profiles.id))
    .where(eq(bookings.bookingDate, date))
    .orderBy(asc(bookings.startTime));

  return rows.map(({ booking, stationType, station, profile }) => ({
    ...toBooking(booking, stationType, profile),
    station: station ? toStation(station, stationType) : null,
  })) as unknown as AdminBooking[];
}

export async function getAllStations() {
  await requireStaff();
  const rows = await db
    .select({ station: stations, stationType: stationTypes })
    .from(stations)
    .leftJoin(stationTypes, eq(stations.stationTypeId, stationTypes.id))
    .orderBy(asc(stations.name));
  return rows.map(({ station, stationType }) => toStation(station, stationType)) as unknown as AdminStation[];
}

export async function getActiveSessions() {
  await requireStaff();
  const rows = await db
    .select({ session: sessions, station: stations, stationType: stationTypes, profile: profiles })
    .from(sessions)
    .leftJoin(stations, eq(sessions.stationId, stations.id))
    .leftJoin(stationTypes, eq(stations.stationTypeId, stationTypes.id))
    .leftJoin(profiles, eq(sessions.userId, profiles.id))
    .where(inArray(sessions.status, ["active", "paused"]))
    .orderBy(desc(sessions.startedAt));

  return rows.map(({ session, station, stationType, profile }) => toSession(
    session,
    station ? toStation(station, stationType) : null,
    profile,
  )) as unknown as AdminSession[];
}

export async function startSession(stationId: string, userId?: string) {
  if (!isUuid(stationId)) throw new Error("Invalid station");
  if (userId && userId.length > 120) throw new Error("Invalid user");
  const { user } = await requireStaff();

  const session = await db.transaction(async (tx) => {
    const [station] = await tx.update(stations)
      .set({ status: "in_use" })
      .where(and(eq(stations.id, stationId), eq(stations.status, "available")))
      .returning();
    if (!station) throw new Error("Station is not available");

    const [created] = await tx.insert(sessions).values({
      stationId,
      userId: userId || null,
      startedBy: user.id,
      status: "active",
    }).returning();
    await tx.update(stations).set({ currentSessionId: created.id }).where(eq(stations.id, stationId));
    return created;
  });

  return toSession(session) as Session;
}

export async function endSession(sessionId: string) {
  if (!isUuid(sessionId)) throw new Error("Invalid session");
  await requireStaff();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ session: sessions, station: stations, stationType: stationTypes, profile: profiles })
      .from(sessions)
      .leftJoin(stations, eq(sessions.stationId, stations.id))
      .leftJoin(stationTypes, eq(stations.stationTypeId, stationTypes.id))
      .leftJoin(profiles, eq(sessions.userId, profiles.id))
      .where(eq(sessions.id, sessionId))
      .limit(1);
    if (!row || !row.station || !row.stationType || !["active", "paused"].includes(row.session.status)) {
      throw new Error("Session cannot be ended");
    }

    const now = new Date();
    const extraPause = row.session.pausedAt ? Math.ceil((now.getTime() - row.session.pausedAt.getTime()) / 60000) : 0;
    const pausedMinutes = row.session.totalPausedMinutes + extraPause;
    const billableMinutes = Math.max(Math.ceil((now.getTime() - row.session.startedAt.getTime()) / 60000) - pausedMinutes, 0);
    let total = row.stationType.basePricePerHour * billableMinutes / 60;
    const rules = await tx.select().from(pricingRules).where(eq(pricingRules.isActive, true)).orderBy(desc(pricingRules.priority));
    const packageRule = rules.find((rule) => rule.ruleType === "package"
      && (!rule.stationTypeId || rule.stationTypeId === row.stationType!.id)
      && Number((rule.conditions as Record<string, unknown>).min_hours) <= billableMinutes / 60);

    if (packageRule?.fixedPrice != null) {
      total = packageRule.fixedPrice;
    } else {
      const day = getDelhiDayOfWeek(getDelhiDate(now));
      const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
      for (const rule of rules) {
        const conditions = rule.conditions as Record<string, unknown>;
        if (rule.ruleType === "happy_hour" && Array.isArray(conditions.days)
          && conditions.days.includes(day)
          && currentTime >= String(conditions.start)
          && currentTime < String(conditions.end)) {
          total -= Math.round(total * Number(rule.discountPercent ?? 0) / 100);
        }
        if (rule.ruleType === "membership_discount" && row.profile?.membershipType === conditions.membership) {
          total -= Math.round(total * Number(rule.discountPercent ?? 0) / 100);
        }
      }
    }

    const charge = Math.max(Math.ceil(total), 0);
    await tx.update(sessions).set({
      status: "completed",
      endedAt: now,
      pausedAt: null,
      totalPausedMinutes: pausedMinutes,
    }).where(eq(sessions.id, sessionId));
    await tx.update(stations).set({ status: "available", currentSessionId: null })
      .where(and(eq(stations.id, row.station.id), eq(stations.currentSessionId, sessionId)));
    if (charge > 0) {
      await tx.insert(payments).values({
        sessionId,
        bookingId: row.session.bookingId,
        userId: row.session.userId,
        amount: charge,
        paymentStatus: "pending",
        paymentMethod: null,
        collectedBy: null,
        notes: "Session charge awaiting collection",
      });
    }

    return {
      sessionId,
      totalMinutes: billableMinutes,
      totalPrice: charge,
      stationName: row.station.name,
    };
  });
}

export async function pauseSession(sessionId: string) {
  if (!isUuid(sessionId)) throw new Error("Invalid session");
  await requireStaff();
  const [result] = await db.update(sessions)
    .set({ status: "paused", pausedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.status, "active")))
    .returning();
  if (!result) throw new Error("Session is not active");
  return toSession(result) as Session;
}

export async function resumeSession(sessionId: string) {
  if (!isUuid(sessionId)) throw new Error("Invalid session");
  await requireStaff();
  const [current] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.status, "paused"))).limit(1);
  if (!current?.pausedAt) throw new Error("Session is not paused");
  const pauseMinutes = Math.ceil((Date.now() - current.pausedAt.getTime()) / 60000);
  const [result] = await db.update(sessions).set({
    status: "active",
    pausedAt: null,
    totalPausedMinutes: current.totalPausedMinutes + pauseMinutes,
  }).where(eq(sessions.id, sessionId)).returning();
  return toSession(result) as Session;
}

export async function updateStationStatus(stationId: string, status: Extract<StationStatus, "available" | "maintenance" | "offline">) {
  if (!isUuid(stationId)) throw new Error("Invalid station");
  await requireStaff();
  const [result] = await db.update(stations).set({ status })
    .where(and(eq(stations.id, stationId), eq(stations.status, "available")))
    .returning({ id: stations.id });
  if (!result) throw new Error("Station is busy or no longer exists");
  return { success: true };
}

export async function collectPayment(data: {
  bookingId?: string;
  sessionId?: string;
  userId?: string;
  amount: number;
  method: "cash" | "upi" | "card";
  upiReference?: string;
  notes?: string;
}) {
  if (!Number.isInteger(data.amount) || data.amount <= 0) throw new Error("Invalid payment amount");
  if (data.method === "upi" && !data.upiReference?.trim()) throw new Error("UPI reference is required");
  if (data.bookingId && data.sessionId) throw new Error("Choose a booking or session, not both");
  const { user } = await requireStaff();

  return db.transaction(async (tx) => {
    let expected: number | null = null;
    let targetUser: string | null = data.userId || null;
    if (data.bookingId) {
      const [booking] = await tx.select({ amount: bookings.estimatedPrice, userId: bookings.userId })
        .from(bookings).where(eq(bookings.id, data.bookingId)).limit(1);
      if (!booking) throw new Error("Booking not found");
      expected = booking.amount;
      targetUser = booking.userId;
    } else if (data.sessionId) {
      const [pending] = await tx.select({ amount: payments.amount, userId: payments.userId })
        .from(payments).where(and(eq(payments.sessionId, data.sessionId), eq(payments.paymentStatus, "pending"))).limit(1);
      if (!pending) throw new Error("No pending session charge");
      expected = pending.amount;
      targetUser = pending.userId;
    }
    if (expected !== null && data.amount !== expected) throw new Error("Payment amount does not match charge");

    const pending = data.bookingId
      ? (await tx.select().from(payments).where(and(eq(payments.bookingId, data.bookingId), eq(payments.paymentStatus, "pending"))).limit(1))[0]
      : data.sessionId
        ? (await tx.select().from(payments).where(and(eq(payments.sessionId, data.sessionId), eq(payments.paymentStatus, "pending"))).limit(1))[0]
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
          sessionId: data.sessionId || null,
          userId: targetUser,
          amount: data.amount,
          ...values,
        }).returning();
    if (!payment) throw new Error("Unable to record payment");
    if (data.bookingId) {
      await tx.update(bookings).set({ status: "completed" })
        .where(and(eq(bookings.id, data.bookingId), inArray(bookings.status, ["confirmed", "checked_in"])));
    }
    return payment as unknown as Payment;
  });
}

export async function getTodayRevenue() {
  await requireStaff();
  const [today, tomorrow] = getNextDelhiDates(2);
  const rows = await db.select({ amount: payments.amount, method: payments.paymentMethod })
    .from(payments)
    .where(and(eq(payments.paymentStatus, "paid"), gte(payments.createdAt, toDelhiInstant(today, "00:00")), lt(payments.createdAt, toDelhiInstant(tomorrow, "00:00"))));
  const byMethod: Record<string, number> = {};
  let total = 0;
  for (const payment of rows) {
    total += payment.amount;
    if (payment.method) byMethod[payment.method] = (byMethod[payment.method] || 0) + payment.amount;
  }
  return { total, byMethod, count: rows.length };
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
