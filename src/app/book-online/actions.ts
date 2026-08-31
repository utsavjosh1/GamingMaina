"use server";

import { requireUser } from "@/lib/auth/server";
import {
  cancelBooking as cancelBookingQuery,
  createBooking as createBookingQuery,
  getAvailableSlots as getAvailableSlotsQuery,
  getStationTypeAvailability,
  getUserBookings as getUserBookingsQuery,
} from "@/lib/db/queries";
import type { Booking } from "@/lib/supabase/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function validateBookingInput(data: {
  stationTypeId: string;
  date: string;
  startTime: string;
  hours: number;
}) {
  if (!/^[0-9a-f-]{36}$/i.test(data.stationTypeId)) throw new Error("Invalid station type");
  if (!DATE_PATTERN.test(data.date) || !TIME_PATTERN.test(data.startTime)) {
    throw new Error("Invalid booking date or time");
  }
  if (!Number.isInteger(data.hours) || data.hours < 1 || data.hours > 5) {
    throw new Error("Duration must be between 1 and 5 hours");
  }
}

export async function getStationTypes() {
  await requireUser();
  return getStationTypeAvailability();
}

export async function getAvailableSlots(stationTypeId: string, date: string, durationHours = 1) {
  if (!/^[0-9a-f-]{36}$/i.test(stationTypeId) || !DATE_PATTERN.test(date)) {
    throw new Error("Invalid availability request");
  }
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 5) {
    throw new Error("Invalid duration");
  }

  await requireUser();
  return getAvailableSlotsQuery(stationTypeId, date, durationHours);
}

export async function createBooking(data: {
  stationTypeId: string;
  date: string;
  startTime: string;
  hours: number;
}) {
  validateBookingInput(data);
  const { user } = await requireUser();
  return createBookingQuery(user.id, data) as Promise<Booking>;
}

export async function cancelBooking(bookingId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) throw new Error("Invalid booking");
  const { user } = await requireUser();
  await cancelBookingQuery(user.id, bookingId);
  return { success: true };
}

export async function getUserBookings() {
  const { user } = await requireUser();
  return getUserBookingsQuery(user.id) as Promise<Booking[]>;
}
