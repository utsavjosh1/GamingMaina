import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { getDelhiDate, getDelhiDayOfWeek, toDelhiInstant } from "@/lib/dates";
import { db } from "./index";
import { bookings, pricingRules, profiles, stationTypes, stations } from "./schema";

export function toProfile(row: typeof profiles.$inferSelect) {
  return {
    id: row.id,
    full_name: row.fullName,
    avatar_url: row.avatarUrl,
    phone: row.phone,
    role: row.role,
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

export async function getStationTypeAvailability() {
  const types = await db.select().from(stationTypes).orderBy(asc(stationTypes.name));
  const allStations = await db.select({ typeId: stations.stationTypeId, status: stations.status }).from(stations);

  return types.map((type) => {
    const typeStations = allStations.filter((station) => station.typeId === type.id);
    return {
      ...toStationType(type),
      available: typeStations.filter((station) => station.status === "available").length,
      total: typeStations.filter((station) => ["available", "booked"].includes(station.status)).length,
    };
  });
}

export async function getAvailableSlots(stationTypeId: string, date: string, durationHours: number) {
  const [stationCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(stations)
    .where(and(eq(stations.stationTypeId, stationTypeId), inArray(stations.status, ["available", "booked"])));
  const total = Number(stationCount?.count ?? 0);
  if (total === 0) return [];

  const rows = await db
    .select({ startTime: bookings.startTime, endTime: bookings.endTime })
    .from(bookings)
    .where(and(eq(bookings.stationTypeId, stationTypeId), eq(bookings.bookingDate, date), inArray(bookings.status, ["confirmed", "checked_in"])));

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

export async function createBooking(userId: string, input: {
  stationTypeId: string;
  date: string;
  startTime: string;
  hours: number;
}) {
  const endTime = addHours(input.startTime, input.hours);
  const booking = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${input.stationTypeId}:${input.date}`}, 0))`);

    const [stationType] = await tx.select().from(stationTypes).where(eq(stationTypes.id, input.stationTypeId)).limit(1);
    if (!stationType) throw new Error("Station type not found");
    const [stationCount] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(stations)
      .where(and(eq(stations.stationTypeId, input.stationTypeId), inArray(stations.status, ["available", "booked"])));
    const [bookingCount] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(and(
        eq(bookings.stationTypeId, input.stationTypeId),
        eq(bookings.bookingDate, input.date),
        inArray(bookings.status, ["confirmed", "checked_in"]),
        lt(bookings.startTime, endTime),
        gt(bookings.endTime, input.startTime),
      ));
    if (Number(bookingCount?.count ?? 0) >= Number(stationCount?.count ?? 0)) {
      throw new Error("No stations available for this time slot");
    }

    const [profile] = await tx.select({ membershipType: profiles.membershipType }).from(profiles).where(eq(profiles.id, userId)).limit(1);
    let total = stationType.basePricePerHour * input.hours;
    const dayName = getDelhiDayOfWeek(input.date);
    const rules = await tx.select().from(pricingRules).where(eq(pricingRules.isActive, true)).orderBy(desc(pricingRules.priority));
    const packageRule = rules.find((rule) => rule.ruleType === "package"
      && (!rule.stationTypeId || rule.stationTypeId === input.stationTypeId)
      && Number((rule.conditions as Record<string, unknown>).min_hours) <= input.hours);

    if (packageRule?.fixedPrice != null) {
      total = packageRule.fixedPrice;
    } else {
      for (const rule of rules) {
        const conditions = rule.conditions as Record<string, unknown>;
        if (rule.ruleType === "happy_hour" && Array.isArray(conditions.days)
          && conditions.days.includes(dayName)
          && input.startTime >= String(conditions.start)
          && input.startTime < String(conditions.end)) {
          total -= Math.round(total * Number(rule.discountPercent ?? 0) / 100);
        }
        if (rule.ruleType === "membership_discount" && profile?.membershipType === conditions.membership) {
          total -= Math.round(total * Number(rule.discountPercent ?? 0) / 100);
        }
      }
    }

    const [result] = await tx.insert(bookings).values({
      userId,
      stationTypeId: input.stationTypeId,
      bookingDate: input.date,
      startTime: input.startTime,
      endTime,
      durationHours: String(input.hours),
      estimatedPrice: Math.max(Math.round(total), 0),
      status: "confirmed",
      expiresAt: new Date(toDelhiInstant(input.date, input.startTime).getTime() + 15 * 60 * 1000),
    }).returning();
    return result;
  });

  return {
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
  };
}

export async function cancelBooking(userId: string, bookingId: string) {
  const [result] = await db.update(bookings)
    .set({ status: "cancelled" })
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId), eq(bookings.status, "confirmed")))
    .returning({ id: bookings.id });
  if (!result) throw new Error("Booking cannot be cancelled");
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

export function toSession(row: typeof import("./schema").sessions.$inferSelect, station?: ReturnType<typeof toStation> | null, profile?: typeof profiles.$inferSelect | null) {
  return {
    id: row.id,
    booking_id: row.bookingId,
    user_id: row.userId,
    station_id: row.stationId,
    started_at: row.startedAt.toISOString(),
    paused_at: row.pausedAt?.toISOString() ?? null,
    ended_at: row.endedAt?.toISOString() ?? null,
    total_paused_minutes: row.totalPausedMinutes,
    status: row.status,
    started_by: row.startedBy,
    created_at: row.createdAt.toISOString(),
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
