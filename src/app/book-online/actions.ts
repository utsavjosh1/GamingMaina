"use server";

import { requireUser } from "@/lib/auth/server";
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
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("get_station_type_availability");
  if (error) throw new Error("Unable to load stations");
  return data;
}

export async function getAvailableSlots(
  stationTypeId: string,
  date: string,
  durationHours = 1,
) {
  if (!/^[0-9a-f-]{36}$/i.test(stationTypeId) || !DATE_PATTERN.test(date)) {
    throw new Error("Invalid availability request");
  }
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 5) {
    throw new Error("Invalid duration");
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_station_type_id: stationTypeId,
    p_date: date,
    p_duration_hours: durationHours,
  });
  if (error) throw new Error("Unable to load availability");

  return data.map((slot) => ({
    startTime: slot.start_time.slice(0, 5),
    endTime: slot.end_time.slice(0, 5),
    available: slot.available,
    total: slot.total,
  }));
}

export async function createBooking(data: {
  stationTypeId: string;
  date: string;
  startTime: string;
  hours: number;
}) {
  const { supabase } = await requireUser();
  validateBookingInput(data);

  // The RPC re-checks the user, date/time, membership, pricing rules, and
  // capacity inside one transaction. No client-supplied price is accepted.
  const { data: booking, error } = await supabase.rpc("create_booking", {
    p_station_type_id: data.stationTypeId,
    p_booking_date: data.date,
    p_start_time: data.startTime,
    p_duration_hours: data.hours,
  });

  if (error) {
    if (error.message.includes("capacity")) {
      throw new Error("No stations available for this time slot");
    }
    throw new Error(error.message);
  }
  return booking as Booking;
}

export async function cancelBooking(bookingId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) throw new Error("Invalid booking");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getUserBookings() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, user_id, station_type_id, station_id, booking_date, start_time, end_time, duration_hours, estimated_price, status, expires_at, created_at, station_type:station_types(id, name, category, base_price_per_hour, image_url, created_at)",
    )
    .eq("user_id", user.id)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) throw new Error(error.message);
  return data as unknown as Booking[];
}
