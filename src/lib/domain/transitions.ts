/**
 * Explicit state machines — centrally defined (contract §8).
 * Invalid transitions return structured conflicts; callers never
 * scatter string-literal status checks.
 */
import { invalidState } from "./errors";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "expired"
  | "no_show";

export type SessionStatus = "created" | "active" | "paused" | "completed" | "force_ended";

const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ["confirmed", "cancelled", "expired"],
  confirmed: ["checked_in", "completed", "cancelled", "expired"],
  checked_in: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  expired: [],
  no_show: [],
};

const SESSION_TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  created: ["active"],
  active: ["paused", "completed", "force_ended"],
  paused: ["active", "completed", "force_ended"],
  completed: [],
  force_ended: [],
};

export function assertBookingTransition(from: string, to: BookingStatus) {
  const allowed = BOOKING_TRANSITIONS[from as BookingStatus];
  if (!allowed || !allowed.includes(to)) {
    throw invalidState(`Booking cannot move from ${from} to ${to}`, { from, to });
  }
}

export function assertSessionTransition(from: string, to: SessionStatus) {
  const allowed = SESSION_TRANSITIONS[from as SessionStatus];
  if (!allowed || !allowed.includes(to)) {
    throw invalidState(`Session cannot move from ${from} to ${to}`, { from, to });
  }
}

export function canBookingTransition(from: string, to: string): boolean {
  return (BOOKING_TRANSITIONS[from as BookingStatus] ?? []).includes(to as BookingStatus);
}

export function canSessionTransition(from: string, to: string): boolean {
  return (SESSION_TRANSITIONS[from as SessionStatus] ?? []).includes(to as SessionStatus);
}
