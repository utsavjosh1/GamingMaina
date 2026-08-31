"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DynamicButton } from "@/components/ui/DynamicButton";
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
        prev.map((b) =>
          b.id === id ? { ...b, status: "cancelled" as const } : b,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const formatPrice = (paise: number) =>
    `₹${(paise / 100).toLocaleString("en-IN")}`;

  const formatDate = (dateStr: string) =>
    formatDelhiDate(dateStr, { weekday: "short", day: "numeric", month: "short" });

  const statusConfig: Record<string, { color: string; label: string }> = {
    confirmed: { color: "bg-green-500", label: "Confirmed" },
    checked_in: { color: "bg-blue-500", label: "Checked In" },
    completed: { color: "bg-zinc-500", label: "Completed" },
    cancelled: { color: "bg-red-500", label: "Cancelled" },
    no_show: { color: "bg-yellow-500", label: "No Show" },
    expired: { color: "bg-orange-500", label: "Expired" },
  };

  const upcoming = bookings.filter(
    (b) =>
      b.status === "confirmed" &&
      toDelhiInstant(b.booking_date, b.end_time) > new Date(),
  );
  const past = bookings.filter(
    (b) =>
      b.status !== "confirmed" ||
      toDelhiInstant(b.booking_date, b.end_time) <= new Date(),
  );

  return (
    <div className="min-h-[80vh] pt-32 pb-20 bg-obsidian relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand/5 blur-[150px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {error && <div role="alert" className="mb-4 border border-red-500/30 bg-red-500/10 p-3 font-mono text-sm text-red-400">{error}</div>}
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-12 bg-brand"></span>
              <span className="text-brand font-mono text-sm tracking-widest uppercase">
                Command Center
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tighter text-white uppercase">
              My{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-brand to-zinc-500">
                Bookings
              </span>
            </h1>
          </div>
          <DynamicButton href="/book-online" variant="primary" className="text-sm">
            + New Booking
          </DynamicButton>
        </div>

        {/* Upcoming */}
        <div className="mb-16">
          <h2 className="text-lg font-heading font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Upcoming ({upcoming.length})
          </h2>

          {upcoming.length === 0 ? (
            <div className="bg-stealth/20 border border-zinc-800 p-8 text-center">
              <p className="text-zinc-500 font-heading">
                No upcoming bookings.
              </p>
              <Link
                href="/book-online"
                className="text-brand text-sm font-heading font-bold hover:underline mt-2 inline-block"
              >
                Book a session →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-stealth/20 border border-zinc-800 hover:border-brand/30 transition-colors p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-center bg-brand/10 border border-brand/20 px-4 py-3 min-w-[80px]">
                      <span className="text-brand font-heading font-black text-2xl leading-none">
                        {formatDelhiDate(booking.booking_date, { day: "numeric" })}
                      </span>
                      <span className="text-zinc-400 font-mono text-[10px] uppercase">
                        {formatDelhiDate(booking.booking_date, { month: "short" })}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-heading font-bold text-lg">
                        {booking.station_type?.name || "Station"}
                      </h3>
                      <p className="text-zinc-400 font-mono text-sm mt-1">
                        {formatDate(booking.booking_date)} •{" "}
                        {booking.start_time.slice(0, 5)} –{" "}
                        {booking.end_time.slice(0, 5)} •{" "}
                        {booking.duration_hours}h
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-brand font-heading font-bold text-xl">
                      {formatPrice(booking.estimated_price)}
                    </span>
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="text-red-400/60 hover:text-red-400 text-xs font-mono uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {cancellingId === booking.id ? "..." : "Cancel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past */}
        <div>
          <h2 className="text-lg font-heading font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
            History ({past.length})
          </h2>

          {past.length === 0 ? (
            <div className="bg-stealth/20 border border-zinc-800 p-8 text-center">
              <p className="text-zinc-500 font-heading">
                No booking history yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {past.map((booking) => {
                const config = statusConfig[booking.status] || {
                  color: "bg-zinc-500",
                  label: booking.status,
                };
                return (
                  <div
                    key={booking.id}
                    className="bg-stealth/10 border border-zinc-800/50 p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 opacity-60"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${config.color}`}
                        ></span>
                        <span className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest">
                          {config.label}
                        </span>
                      </div>
                      <span className="text-white font-heading font-bold">
                        {booking.station_type?.name || "Station"}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-zinc-500 font-mono text-sm">
                      <span>
                        {formatDate(booking.booking_date)} •{" "}
                        {booking.start_time.slice(0, 5)} –{" "}
                        {booking.end_time.slice(0, 5)}
                      </span>
                      <span>{formatPrice(booking.estimated_price)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
