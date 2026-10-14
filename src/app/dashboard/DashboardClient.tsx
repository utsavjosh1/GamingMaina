"use client";

import React, { useState } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { cancelBooking } from "@/app/book-online/actions";
import { toDelhiInstant, formatDelhiDate } from "@/lib/dates";
import type { Booking } from "@/lib/supabase/types";

interface DashboardClientProps {
  initialBookings: Booking[];
}

export function DashboardClient({ initialBookings }: DashboardClientProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    setError(null);
    try {
      await cancelBooking(id);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "cancelled" as const } : b)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel booking. Try again or ask the counter for help.");
    } finally {
      setCancellingId(null);
    }
  };

  const formatPrice = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
  const formatDate = (dateStr: string) =>
    formatDelhiDate(dateStr, { weekday: "short", day: "numeric", month: "short" });

  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && toDelhiInstant(b.booking_date, b.end_time) > new Date(),
  );
  const past = bookings.filter(
    (b) => b.status !== "confirmed" || toDelhiInstant(b.booking_date, b.end_time) <= new Date(),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-28">
      {error && (
        <div role="alert" className="mb-5 rounded-[12px] border border-red-400/25 bg-red-500/[0.08] p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="ops-heading text-3xl font-semibold tracking-tight text-white">
            Your bookings
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-[var(--erp-muted)]">
            {upcoming.length === 0
              ? "Nothing reserved yet. Book a setup and pay at the counter when you arrive."
              : `${upcoming.length} upcoming reservation${upcoming.length === 1 ? "" : "s"} · pay at the counter on arrival.`}
          </p>
        </div>
        <a
          href="/book-online"
          className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] bg-paper px-5 text-sm font-semibold text-ink transition hover:bg-white"
        >
          New reservation
        </a>
      </div>

      <section aria-label="Upcoming reservations" className="mt-8">
        <h2 className="text-sm font-semibold text-slate-200">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <div className="mt-3 rounded-[14px] border border-dashed border-white/[0.12] bg-black/20 p-8 text-center">
            <CalendarDays className="mx-auto size-8 text-slate-600" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-200">No upcoming reservations</p>
            <p className="mx-auto mt-1 max-w-[40ch] text-[13px] leading-5 text-[var(--erp-muted)]">
              Lock in a PC, PS5 or racing rig before you visit — weekends fill up fast.
            </p>
            <a
              href="/book-online"
              className="mt-4 inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-white/[0.1] bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
            >
              Book a session <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((booking) => (
              <li
                key={booking.id}
                className="ops-surface rounded-[14px] p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="grid w-[64px] shrink-0 place-items-center rounded-[10px] border border-white/[0.08] bg-black/20 px-2 py-2.5 text-center">
                      <span>
                        <span className="tnum block text-xl font-semibold leading-none text-white">
                          {formatDelhiDate(booking.booking_date, { day: "numeric" })}
                        </span>
                        <span className="mt-1 block text-[11px] text-[var(--erp-muted)]">
                          {formatDelhiDate(booking.booking_date, { month: "short" })}
                        </span>
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-200">
                          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                          Confirmed
                        </span>
                        <span className="tnum text-xs text-[var(--erp-subtle)]">
                          {booking.id.slice(0, 8).toUpperCase()}
                        </span>
                      </p>
                      <h3 className="mt-1.5 truncate text-[17px] font-semibold tracking-tight text-white">
                        {booking.station_type?.name || "Gaming station"}
                      </h3>
                      <p className="tnum mt-0.5 text-[13px] text-[var(--erp-muted)]">
                        {formatDate(booking.booking_date)} · {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)} · {booking.duration_hours}h
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/[0.06] pt-3 sm:flex-col sm:items-end sm:justify-center sm:border-0 sm:pt-0">
                    <p className="text-right leading-tight">
                      <span className="tnum block text-lg font-semibold text-white">
                        {formatPrice(booking.estimated_price)}
                      </span>
                      <span className="block text-[11px] text-[var(--erp-subtle)]">Pay at counter</span>
                    </p>
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="inline-flex min-h-9 items-center whitespace-nowrap rounded-[10px] border border-red-400/25 bg-red-500/10 px-3.5 text-[13px] font-semibold text-red-200 transition hover:bg-red-500/15 disabled:opacity-50"
                    >
                      {cancellingId === booking.id ? "Cancelling…" : "Cancel"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Booking history" className="mt-10">
        <h2 className="text-sm font-semibold text-[var(--erp-subtle)]">
          History {past.length > 0 && <span className="tnum font-normal">· {past.length}</span>}
        </h2>
        {past.length === 0 ? (
          <p className="mt-3 rounded-[12px] border border-white/[0.06] bg-black/10 p-4 text-center text-[13px] text-[var(--erp-subtle)]">
            No past visits yet — your history appears here after your first session.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {past.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-col gap-1.5 rounded-[12px] border border-white/[0.06] bg-black/20 p-3.5 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <p className="min-w-0 truncate text-slate-300">
                  <span className="font-medium text-slate-200">{booking.station_type?.name || "Station"}</span>
                  <span className="text-[var(--erp-subtle)]"> · {historyLabel(booking.status)}</span>
                </p>
                <p className="tnum shrink-0 text-xs text-[var(--erp-muted)]">
                  {formatDate(booking.booking_date)} · {booking.start_time.slice(0, 5)} · {formatPrice(booking.estimated_price)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function historyLabel(status: string) {
  switch (status) {
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    case "checked_in": return "Played";
    case "no_show": return "No-show";
    case "expired": return "Expired";
    default: return status.replace(/_/g, " ");
  }
}
