"use client";

import React, { useState } from "react";
import {
  updateStationStatus,
  startSession,
  endSession,
  pauseSession,
  resumeSession,
} from "./actions";
import type { AdminBooking, AdminSession, AdminStation, StationStatus } from "@/lib/supabase/types";
import { formatDelhiDate, getDelhiDate } from "@/lib/dates";

interface AdminDashboardClientProps {
  stations: AdminStation[];
  sessions: AdminSession[];
  bookings: AdminBooking[];
  revenue: { total: number; byMethod: Record<string, number>; count: number };
}

export function AdminDashboardClient({
  stations: initialStations,
  sessions: initialSessions,
  bookings,
  revenue,
}: AdminDashboardClientProps) {
  const [stations, setStations] = useState<AdminStation[]>(initialStations);
  const [sessions, setSessions] = useState<AdminSession[]>(initialSessions);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  React.useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const formatPrice = (paise: number) =>
    `₹${(paise / 100).toLocaleString("en-IN")}`;

  const statusColors: Record<StationStatus, string> = {
    available: "bg-green-500",
    booked: "bg-blue-500",
    in_use: "bg-brand",
    maintenance: "bg-yellow-500",
    offline: "bg-red-500",
  };

  const handleStationAction = async (
    stationId: string,
    action: "available" | "maintenance" | "offline",
  ) => {
    setActionLoading(stationId);
    try {
      await updateStationStatus(stationId, action);
      setStations((prev) =>
        prev.map((s) => s.id === stationId ? { ...s, status: action } : s),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Station update failed");
    }
    setActionLoading(null);
  };

  const handleStartSession = async (stationId: string) => {
    setActionLoading(stationId);
    try {
      const session = await startSession(stationId);
      setSessions((prev) => [session as AdminSession, ...prev]);
      setStations((prev) =>
        prev.map((s) =>
          s.id === stationId
            ? { ...s, status: "in_use", current_session_id: session.id }
            : s,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start session");
    }
    setActionLoading(null);
  };

  const handleEndSession = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      const result = await endSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setStations((prev) =>
        prev.map((s) =>
          s.current_session_id === sessionId
            ? { ...s, status: "available", current_session_id: null }
            : s,
        ),
      );
      alert(
        `Session ended: ${result.stationName}\nDuration: ${result.totalMinutes} min\nTotal: ${formatPrice(result.totalPrice)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to end session");
    }
    setActionLoading(null);
  };

  const handlePauseResume = async (sessionId: string, status: string) => {
    setActionLoading(sessionId);
    try {
      if (status === "active") {
        await pauseSession(sessionId);
        setSessions((prev) =>
          prev.map((s) => s.id === sessionId ? { ...s, status: "paused" } : s),
        );
      } else {
        await resumeSession(sessionId);
        setSessions((prev) =>
          prev.map((s) => s.id === sessionId ? { ...s, status: "active" } : s),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update session");
    }
    setActionLoading(null);
  };

  const stationsByType = stations.reduce(
    (acc: Record<string, AdminStation[]>, station) => {
      const typeName = station.station_type?.name || "Unknown";
      if (!acc[typeName]) acc[typeName] = [];
      acc[typeName].push(station);
      return acc;
    },
    {},
  );

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");

  return (
    <div className="p-8">
      <div className="mb-10">
        {error && (
          <div role="alert" className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 font-mono text-sm">
            {error}
          </div>
        )}
        <h1 className="text-3xl font-heading font-black text-white uppercase tracking-tight">
          Dashboard
        </h1>
        <p className="text-zinc-500 font-mono text-sm mt-1">
          {formatDelhiDate(getDelhiDate(), {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-stealth/30 border border-zinc-800 p-5">
          <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-2">
            Today Revenue
          </span>
          <span className="text-brand font-heading font-black text-3xl">
            {formatPrice(revenue.total)}
          </span>
          <span className="text-zinc-600 font-mono text-xs block mt-1">
            {revenue.count} payments
          </span>
        </div>
        <div className="bg-stealth/30 border border-zinc-800 p-5">
          <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-2">
            Active Sessions
          </span>
          <span className="text-green-400 font-heading font-black text-3xl">
            {sessions.length}
          </span>
        </div>
        <div className="bg-stealth/30 border border-zinc-800 p-5">
          <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-2">
            Today Bookings
          </span>
          <span className="text-cyan font-heading font-black text-3xl">
            {confirmedBookings.length}
          </span>
        </div>
        <div className="bg-stealth/30 border border-zinc-800 p-5">
          <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-2">
            Stations Online
          </span>
          <span className="text-white font-heading font-black text-3xl">
            {
              stations.filter(
                (s) => s.status !== "offline" && s.status !== "maintenance",
              ).length
            }
            /{stations.length}
          </span>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-heading font-bold text-white uppercase tracking-widest mb-6">
          Station Overview
        </h2>
        <div className="space-y-8">
          {Object.entries(stationsByType).map(
            ([typeName, typeStations]: [string, AdminStation[]]) => (
              <div key={typeName}>
                <h3 className="text-sm font-heading font-bold text-zinc-400 uppercase tracking-widest mb-3">
                  {typeName}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {typeStations.map((station) => (
                    <div
                      key={station.id}
                      className="bg-stealth/20 border border-zinc-800 p-4 relative group"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`w-2 h-2 rounded-full ${statusColors[station.status] || "bg-zinc-500"} ${station.status === "in_use" ? "animate-pulse" : ""}`}
                        ></span>
                        <span className="text-white font-heading font-bold text-sm">
                          {station.name}
                        </span>
                      </div>
                      <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                        {station.status.replace("_", " ")}
                      </span>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {station.status === "available" && (
                          <>
                            <button
                              onClick={() => handleStartSession(station.id)}
                              disabled={actionLoading === station.id}
                              className="text-[10px] font-mono uppercase tracking-wider text-green-400 hover:bg-green-500/10 px-2 py-1 border border-green-500/20 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Start
                            </button>
                            <button
                              onClick={() =>
                                handleStationAction(station.id, "maintenance")
                              }
                              disabled={actionLoading === station.id}
                              className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 hover:bg-yellow-500/10 px-2 py-1 border border-yellow-500/20 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Maint
                            </button>
                          </>
                        )}
                        {(station.status === "maintenance" ||
                          station.status === "offline") && (
                          <button
                            onClick={() =>
                              handleStationAction(station.id, "available")
                            }
                            disabled={actionLoading === station.id}
                            className="text-[10px] font-mono uppercase tracking-wider text-green-400 hover:bg-green-500/10 px-2 py-1 border border-green-500/20 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-heading font-bold text-white uppercase tracking-widest mb-6">
            Active Sessions
          </h2>
          <div className="space-y-3">
            {sessions.map((session) => {
              const elapsed = Math.max(
                0,
                Math.floor((now - new Date(session.started_at).getTime()) / 60000) -
                  (session.total_paused_minutes || 0) -
                  (session.paused_at ? Math.ceil((now - new Date(session.paused_at).getTime()) / 60000) : 0),
              );
              return (
                <div
                  key={session.id}
                  className="bg-stealth/20 border border-zinc-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-3 h-3 rounded-full ${session.status === "active" ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}
                    ></div>
                    <div>
                      <span className="text-white font-heading font-bold">
                        {session.station?.name || "Station"}
                      </span>
                      <span className="text-zinc-500 font-mono text-xs ml-3">
                        {session.profile?.full_name || "Walk-in"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-brand font-mono font-bold text-lg tabular-nums">
                      {Math.floor(elapsed / 60)}h {elapsed % 60}m
                    </span>
                    <button
                      onClick={() =>
                        handlePauseResume(session.id, session.status)
                      }
                      disabled={actionLoading === session.id}
                      className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 hover:bg-yellow-500/10 px-3 py-1.5 border border-yellow-500/20 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {session.status === "active" ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => handleEndSession(session.id)}
                      disabled={actionLoading === session.id}
                      className="text-[10px] font-mono uppercase tracking-wider text-red-400 hover:bg-red-500/10 px-3 py-1.5 border border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      End
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-heading font-bold text-white uppercase tracking-widest mb-6">
          Today&apos;s Bookings ({bookings.length})
        </h2>
        {bookings.length === 0 ? (
          <div className="bg-stealth/20 border border-zinc-800 p-8 text-center">
            <p className="text-zinc-500 font-heading">No bookings for today.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest py-3 px-4">
                    Time
                  </th>
                  <th className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest py-3 px-4">
                    Station
                  </th>
                  <th className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest py-3 px-4">
                    Customer
                  </th>
                  <th className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest py-3 px-4">
                    Duration
                  </th>
                  <th className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest py-3 px-4">
                    Status
                  </th>
                  <th className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest py-3 px-4">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-zinc-800/50 hover:bg-stealth/20"
                  >
                    <td className="text-white font-mono text-sm py-3 px-4">
                      {b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)}
                    </td>
                    <td className="text-white font-heading font-bold text-sm py-3 px-4">
                      {b.station_type?.name}
                    </td>
                    <td className="text-zinc-400 text-sm py-3 px-4">
                      {b.profile?.full_name || "—"}
                    </td>
                    <td className="text-zinc-400 font-mono text-sm py-3 px-4">
                      {b.duration_hours}h
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest ${b.status === "confirmed" ? "text-green-400" : b.status === "cancelled" ? "text-red-400" : "text-zinc-500"}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${b.status === "confirmed" ? "bg-green-500" : b.status === "cancelled" ? "bg-red-500" : "bg-zinc-500"}`}
                        ></span>
                        {b.status}
                      </span>
                    </td>
                    <td className="text-brand font-heading font-bold py-3 px-4">
                      {formatPrice(b.estimated_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
