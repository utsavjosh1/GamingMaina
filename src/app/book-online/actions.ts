"use server";

import { requireUser } from "@/lib/auth/server";
import {
  cancelBooking as cancelBookingQuery,
  createBooking as createBookingQuery,
  getAvailableSlots as getAvailableSlotsQuery,
  getCachedStationTypeAvailability,
  getUserBookings as getUserBookingsQuery,
} from "@/lib/db/queries";
import { bookingInputSchema, uuidSchema, dateSchema } from "@/lib/domain/validation";
import { validationError } from "@/lib/domain/errors";
import type { Booking } from "@/lib/supabase/types";

export async function getStationTypes() {
  return getCachedStationTypeAvailability();
}

export async function getAvailableSlots(stationTypeId: string, date: string, durationHours = 1) {
  const parsed = bookingInputSchema.safeParse({ stationTypeId, date, startTime: "10:00", hours: durationHours });
  // Availability needs only type+date+duration; reuse schema for format checks.
  const typeOk = uuidSchema.safeParse(stationTypeId).success;
  const dateOk = dateSchema.safeParse(date).success;
  if (!typeOk || !dateOk || !parsed.success) throw validationError("Invalid availability request");

  return getAvailableSlotsQuery(stationTypeId, date, durationHours);
}

export async function createBooking(raw: {
  stationTypeId: string;
  date: string;
  startTime: string;
  hours: number;
  idempotencyKey?: string;
}) {
  const parsed = bookingInputSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid booking", { issues: parsed.error.issues });
  const { user } = await requireUser();
  return createBookingQuery(user.id, parsed.data) as Promise<Booking>;
}

export async function cancelBooking(bookingId: string) {
  if (!uuidSchema.safeParse(bookingId).success) throw validationError("Invalid booking");
  const { user } = await requireUser();
  await cancelBookingQuery(user.id, bookingId);
  return { success: true };
}

export async function getUserBookings() {
  const { user } = await requireUser();
  return getUserBookingsQuery(user.id) as Promise<Booking[]>;
}
