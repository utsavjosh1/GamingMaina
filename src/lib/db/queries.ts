import "server-only";

import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { getDelhiDate, getDelhiDayOfWeek, toDelhiInstant } from "@/lib/dates";
import { quoteBookingPrice } from "@/lib/domain/pricing";
import { AUDIT_ACTIONS, writeAudit } from "@/lib/domain/audit";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/lib/domain/idempotency";
import { conflict, notFound } from "@/lib/domain/errors";
import { getDefaultBranch, resolveActingContext } from "@/lib/db/tenancy";
import { db } from "./index";
import { bookings, pricingRules, profiles, stationTypes, stations } from "./schema";

/** Nested customer identity for booking/session payloads — display data only.
 *  AuthZ roles never ride along here (memberships own roles since Phase 4). */
export function toProfile(row: typeof profiles.$inferSelect) {
  return {
    id: row.id,
    full_name: row.fullName,
    avatar_url: row.avatarUrl,
    phone: row.phone,
    membership_type: row.membershipType,
    created_at: row.createdAt.toISOString(),
  };
}

export function toStationType(row: typeof stationTypes.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    base_price_per_hour: row.basePricePerHour,
    image_url: row.imageUrl,
    created_at: row.createdAt.toISOString(),
  };
}

export async function getStationTypeAvailability(branchId?: string) {
  // Tenant scope (§4): counts only this branch's stations. Public callers
  // fall back to the default branch; the cache is single-branch keyed.
  const branch = branchId ?? (await getDefaultBranch()).id;
  const rows = await db
    .select({
      id: stationTypes.id,
      name: stationTypes.name,
      category: stationTypes.category,
      basePricePerHour: stationTypes.basePricePerHour,
      imageUrl: stationTypes.imageUrl,
      orgId: stationTypes.orgId,
      createdAt: stationTypes.createdAt,
      available: sql<number>`count(${stations.id}) filter (where ${stations.status} = 'available' and ${stations.branchId} = ${branch})`,
      total: sql<number>`count(${stations.id}) filter (where ${stations.status} in ('available', 'booked') and ${stations.branchId} = ${branch})`,
    })
    .from(stationTypes)
    .leftJoin(stations, and(eq(stations.stationTypeId, stationTypes.id), eq(stations.branchId, branch)))
    .groupBy(
      stationTypes.id,
      stationTypes.name,
      stationTypes.category,
      stationTypes.basePricePerHour,
      stationTypes.imageUrl,
      stationTypes.orgId,
      stationTypes.createdAt,
    )
    .orderBy(asc(stationTypes.name));

  return rows.map((row) => ({
    ...toStationType(row),
    available: Number(row.available),
    total: Number(row.total),
  }));
}

export const getCachedStationTypeAvailability = unstable_cache(
  getStationTypeAvailability,
  ["station-type-availability"],
  { revalidate: 60, tags: ["station-type-availability"] },
);

export async function getAvailableSlots(stationTypeId: string, date: string, durationHours: number, branchId?: string) {
  const branch = branchId ?? (await getDefaultBranch()).id;
  const [stationCountResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(stations)
      .where(and(eq(stations.stationTypeId, stationTypeId), eq(stations.branchId, branch), inArray(stations.status, ["available", "booked"]))),
    db
      .select({ startTime: bookings.startTime, endTime: bookings.endTime })
      .from(bookings)
      .where(and(eq(bookings.stationTypeId, stationTypeId), eq(bookings.bookingDate, date), eq(bookings.branchId, branch), inArray(bookings.status, ["confirmed", "checked_in"]))),
  ]);
  const total = Number(stationCountResult[0]?.count ?? 0);
  if (total === 0) return [];

  const nowDate = getDelhiDate();
  const nowTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const slots: Array<{ startTime: string; endTime: string; available: number; total: number }> = [];

  for (let hour = 10; hour <= 23 - durationHours; hour += 1) {
    const startTime = `${String(hour).padStart(2, "0")}:00:00`;
    const endTime = `${String(hour + durationHours).padStart(2, "0")}:00:00`;
    if (date === nowDate && startTime.slice(0, 5) <= nowTime) continue;

    const overlapping = rows.filter((booking) => booking.startTime < endTime && booking.endTime > startTime).length;
    slots.push({
      startTime: startTime.slice(0, 5),
      endTime: endTime.slice(0, 5),
      available: Math.max(total - overlapping, 0),
      total,
    });
  }
  return slots;
}

function addHours(startTime: string, hours: number) {
  const endHour = Number(startTime.slice(0, 2)) + hours;
  return `${String(endHour).padStart(2, "0")}:00:00`;
}

export interface BookingResponse {
  id: string;
  user_id: string;
  station_type_id: string;
  station_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  estimated_price: number;
  status: string;
  expires_at: string | null;
  created_at: string;
}

export async function createBooking(userId: string, input: {
  stationTypeId: string;
  date: string;
  startTime: string;
  hours: number;
  idempotencyKey?: string;
}): Promise<BookingResponse> {
  const endTime = addHours(input.startTime, input.hours);
  // Tenant scope (§4): the booking lands in the customer's acting branch.
  const acting = await resolveActingContext(userId);
  return db.transaction(async (tx) => {
    if (input.idempotencyKey) {
      const claim = await claimIdempotencyKey(tx, {
        key: input.idempotencyKey,
        userId,
        action: "booking.create",
        ttlHours: 24,
      });
      // Replay returns the exact response the first attempt produced.
      if (claim.replay) return claim.response as BookingResponse;
    }

    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${acting.branch.id}:${input.stationTypeId}:${input.date}`}, 0))`);

    const [stationType] = await tx.select().from(stationTypes).where(eq(stationTypes.id, input.stationTypeId)).limit(1);
    if (!stationType) throw notFound("Station type not found");
    const [stationCount] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(stations)
      .where(and(eq(stations.stationTypeId, input.stationTypeId), eq(stations.branchId, acting.branch.id), inArray(stations.status, ["available", "booked"])));
    const [bookingCount] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(and(
        eq(bookings.stationTypeId, input.stationTypeId),
        eq(bookings.bookingDate, input.date),
        eq(bookings.branchId, acting.branch.id),
        inArray(bookings.status, ["confirmed", "checked_in"]),
        lt(bookings.startTime, endTime),
        gt(bookings.endTime, input.startTime),
      ));
    if (Number(bookingCount?.count ?? 0) >= Number(stationCount?.count ?? 0)) {
      throw conflict("No stations available for this time slot", {
        stationTypeId: input.stationTypeId,
        date: input.date,
      });
    }

    const [profile] = await tx.select({ membershipType: profiles.membershipType }).from(profiles).where(eq(profiles.id, userId)).limit(1);
    const dayName = getDelhiDayOfWeek(input.date);
    const rules = await tx.select().from(pricingRules)
      .where(and(eq(pricingRules.isActive, true), eq(pricingRules.branchId, acting.branch.id)))
      .orderBy(desc(pricingRules.priority));
    // One pricing engine (contract §9) — scoped to this station type or global.
    const scopedRules = rules.filter((rule) => !rule.stationTypeId || rule.stationTypeId === input.stationTypeId);
    const quote = quoteBookingPrice({
      basePricePerHourPaise: stationType.basePricePerHour,
      hours: input.hours,
      rules: scopedRules,
      dayOfWeek: dayName,
      startTimeHHMM: input.startTime.slice(0, 5),
      membershipType: profile?.membershipType ?? "none",
    });
    const total = quote.totalPaise;

    const [result] = await tx.insert(bookings).values({
      userId,
      branchId: acting.branch.id,
      stationTypeId: input.stationTypeId,
      bookingDate: input.date,
      startTime: input.startTime,
      endTime,
      durationHours: String(input.hours),
      estimatedPrice: Math.max(Math.round(total), 0),
      status: "confirmed",
      expiresAt: new Date(toDelhiInstant(input.date, input.startTime).getTime() + 15 * 60 * 1000),
    }).returning();
    if (!result) throw conflict("Booking could not be created");

    const response = {
      id: result.id,
      user_id: result.userId,
      station_type_id: result.stationTypeId,
      station_id: result.stationId,
      booking_date: result.bookingDate,
      start_time: result.startTime,
      end_time: result.endTime,
      duration_hours: Number(result.durationHours),
      estimated_price: result.estimatedPrice,
      status: result.status,
      expires_at: result.expiresAt?.toISOString() ?? null,
      created_at: result.createdAt.toISOString(),
    };

    await writeAudit(tx, {
      actorId: userId,
      action: AUDIT_ACTIONS.bookingCreated,
      entityType: "booking",
      entityId: result.id,
      orgId: acting.org.id,
      branchId: acting.branch.id,
      newValue: { ...response },
    });
    if (input.idempotencyKey) {
      await completeIdempotencyKey(tx, input.idempotencyKey, response);
    }
    return response;
  });
}

export async function cancelBooking(userId: string, bookingId: string) {
  const acting = await resolveActingContext(userId);
  return db.transaction(async (tx) => {
    // Conditional update = concurrency-safe: only confirmed → cancelled, own branch.
    const [result] = await tx.update(bookings)
      .set({ status: "cancelled" })
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId), eq(bookings.branchId, acting.branch.id), eq(bookings.status, "confirmed")))
      .returning({ id: bookings.id });
    if (!result) throw conflict("Booking cannot be cancelled");
    await writeAudit(tx, {
      actorId: userId,
      action: AUDIT_ACTIONS.bookingCancelled,
      entityType: "booking",
      entityId: result.id,
      orgId: acting.org.id,
      branchId: acting.branch.id,
      oldValue: { status: "confirmed" },
      newValue: { status: "cancelled" },
    });
    return { success: true };
  });
}

export function toStation(row: typeof stations.$inferSelect, stationType?: typeof stationTypes.$inferSelect | null) {
  return {
    id: row.id,
    station_type_id: row.stationTypeId,
    name: row.name,
    status: row.status,
    current_session_id: row.currentSessionId,
    updated_at: row.updatedAt.toISOString(),
    created_at: row.createdAt.toISOString(),
    station_type: stationType ? toStationType(stationType) : undefined,
  };
}

export function toBooking(row: typeof bookings.$inferSelect, stationType?: typeof stationTypes.$inferSelect | null, profile?: typeof profiles.$inferSelect | null) {
  return {
    id: row.id,
    user_id: row.userId,
    station_type_id: row.stationTypeId,
    station_id: row.stationId,
    booking_date: row.bookingDate,
    start_time: row.startTime,
    end_time: row.endTime,
    duration_hours: Number(row.durationHours),
    estimated_price: row.estimatedPrice,
    status: row.status,
    expires_at: row.expiresAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    station_type: stationType ? toStationType(stationType) : undefined,
    profile: profile ? toProfile(profile) : undefined,
  };
}

// Accepts rows revived from idempotency JSON (ISO strings) as well as live
// Drizzle rows (Date objects) — replays must serialize identically.
export function toSession(row: typeof import("./schema").sessions.$inferSelect, station?: ReturnType<typeof toStation> | null, profile?: typeof profiles.$inferSelect | null) {
  return {
    id: row.id,
    booking_id: row.bookingId,
    user_id: row.userId,
    station_id: row.stationId,
    started_at: new Date(row.startedAt).toISOString(),
    paused_at: row.pausedAt ? new Date(row.pausedAt).toISOString() : null,
    ended_at: row.endedAt ? new Date(row.endedAt).toISOString() : null,
    total_paused_minutes: row.totalPausedMinutes,
    status: row.status,
    started_by: row.startedBy,
    created_at: new Date(row.createdAt).toISOString(),
    station: station ?? undefined,
    profile: profile ? toProfile(profile) : undefined,
  };
}

export async function getUserBookings(userId: string) {
  const rows = await db
    .select({ booking: bookings, stationType: stationTypes })
    .from(bookings)
    .leftJoin(stationTypes, eq(bookings.stationTypeId, stationTypes.id))
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.bookingDate), desc(bookings.startTime));

  return rows.map(({ booking, stationType }) => ({
    id: booking.id,
    user_id: booking.userId,
    station_type_id: booking.stationTypeId,
    station_id: booking.stationId,
    booking_date: booking.bookingDate,
    start_time: booking.startTime,
    end_time: booking.endTime,
    duration_hours: Number(booking.durationHours),
    estimated_price: booking.estimatedPrice,
    status: booking.status,
    expires_at: booking.expiresAt?.toISOString() ?? null,
    created_at: booking.createdAt.toISOString(),
    station_type: stationType ? toStationType(stationType) : undefined,
  }));
}
