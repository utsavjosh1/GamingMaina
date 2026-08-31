"use server";

import { requireAdmin, requireStaff } from "@/lib/auth/server";
import { getNextDelhiDates, toDelhiInstant } from "@/lib/dates";
import type {
  AdminBooking,
  AdminSession,
  AdminStation,
  Payment,
  Session,
} from "@/lib/supabase/types";

export async function getBookingsForDate(date: string) {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, user_id, station_type_id, station_id, booking_date, start_time, end_time, duration_hours, estimated_price, status, expires_at, created_at, station_type:station_types(id, name, category, base_price_per_hour, image_url, created_at), profile:profiles!user_id(id, full_name, avatar_url, phone, role, membership_type, created_at)",
    )
    .eq("booking_date", date)
    .order("start_time");
  if (error) throw new Error(error.message);
  return data as unknown as AdminBooking[];
}

export async function getAllStations() {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("stations")
    .select("id, station_type_id, name, status, current_session_id, updated_at, created_at, station_type:station_types(id, name, category, base_price_per_hour, image_url, created_at)")
    .order("name");
  if (error) throw new Error(error.message);
  return data as unknown as AdminStation[];
}

export async function getActiveSessions() {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, booking_id, user_id, station_id, started_at, paused_at, ended_at, total_paused_minutes, status, started_by, created_at, station:stations!station_id(id, station_type_id, name, status, current_session_id, updated_at, created_at, station_type:station_types(id, name, category, base_price_per_hour, image_url, created_at)), profile:profiles!user_id(id, full_name, avatar_url, phone, role, membership_type, created_at)",
    )
    .in("status", ["active", "paused"])
    .order("started_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as AdminSession[];
}

export async function startSession(stationId: string, userId?: string) {
  if (!/^[0-9a-f-]{36}$/i.test(stationId)) throw new Error("Invalid station");
  if (userId && !/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Invalid user");
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("start_session", {
    p_station_id: stationId,
    p_user_id: userId || null,
  });
  if (error) throw new Error(error.message);
  return data as Session;
}

export async function endSession(sessionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) throw new Error("Invalid session");
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("end_session", { p_session_id: sessionId });
  if (error) throw new Error(error.message);
  const result = (Array.isArray(data) ? data[0] : data) as {
    session_id: string;
    total_minutes: number;
    total_price: number;
    station_name: string;
  };
  return {
    sessionId: result.session_id,
    totalMinutes: result.total_minutes,
    totalPrice: result.total_price,
    stationName: result.station_name,
  };
}

export async function pauseSession(sessionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) throw new Error("Invalid session");
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("pause_session", { p_session_id: sessionId });
  if (error) throw new Error(error.message);
  return data as Session;
}

export async function resumeSession(sessionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) throw new Error("Invalid session");
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("resume_session", { p_session_id: sessionId });
  if (error) throw new Error(error.message);
  return data as Session;
}

export async function updateStationStatus(
  stationId: string,
  status: "available" | "maintenance" | "offline",
) {
  if (!/^[0-9a-f-]{36}$/i.test(stationId)) throw new Error("Invalid station");
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("update_station_status", {
    p_station_id: stationId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
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
  const { supabase } = await requireStaff();
  const { data: payment, error } = await supabase.rpc("collect_payment", {
    p_booking_id: data.bookingId || null,
    p_session_id: data.sessionId || null,
    p_user_id: data.userId || null,
    p_amount: data.amount,
    p_method: data.method,
    p_upi_reference: data.upiReference?.trim() || null,
    p_notes: data.notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return payment as Payment;
}

export async function getTodayRevenue() {
  const { supabase } = await requireStaff();
  const [today, tomorrow] = getNextDelhiDates(2);
  const { data, error } = await supabase
    .from("payments")
    .select("amount, payment_method")
    .eq("payment_status", "paid")
    .gte("created_at", toDelhiInstant(today, "00:00").toISOString())
    .lt("created_at", toDelhiInstant(tomorrow, "00:00").toISOString());
  if (error) throw new Error(error.message);

  const byMethod: Record<string, number> = {};
  let total = 0;
  for (const payment of data) {
    total += payment.amount;
    if (payment.payment_method) byMethod[payment.payment_method] = (byMethod[payment.payment_method] || 0) + payment.amount;
  }
  return { total, byMethod, count: data.length };
}

export async function getAuditLogs(limit = 50) {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw new Error(error.message);
  return data;
}
