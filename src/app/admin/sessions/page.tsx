"use client";

import React, { useState, useEffect } from "react";
import {
  getActiveSessions,
  getAllStations,
  startSession,
  endSession,
  pauseSession,
  resumeSession,
} from "../actions";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [stations, setStations] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const loadData = async () => {
    try {
      const [sessionsData, stationsData] = await Promise.all([
        getActiveSessions(),
        getAllStations(),
      ]);
      setSessions(sessionsData);
      setStations(stationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // Refresh data and timers without calculating time during render.
    const interval = setInterval(() => void loadData(), 30000);
    const clock = setInterval(() => setNow(Date.now()), 60000);
    setNow(Date.now());
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, []);

  useEffect(() => {
    if (!showStartModal) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowStartModal(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showStartModal]);

  const formatPrice = (paise: number) =>
    `₹${(paise / 100).toLocaleString("en-IN")}`;

  const availableStations = stations.filter(
    (s) => (s as { status: string }).status === "available",
  );

  const handleStart = async (stationId: string) => {
    setActionLoading(stationId);
    setError(null);
    try {
      await startSession(stationId);
      await loadData();
      setShowStartModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start session");
    }
    setActionLoading(null);
  };

  const handleEnd = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      const result = await endSession(sessionId);
      alert(
        `Session ended: ${result.stationName}\nDuration: ${result.totalMinutes} min\nBill: ${formatPrice(result.totalPrice)}`,
      );
      await loadData();
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
      } else {
        await resumeSession(sessionId);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update session");
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {error && <div role="alert" className="mb-6 border border-red-500/30 bg-red-500/10 p-3 font-mono text-sm text-red-400">{error}</div>}
      {showStartModal && <div className="sr-only" aria-live="polite">Start session dialog opened</div>}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-heading font-black text-white uppercase tracking-tight">
            Session Manager
          </h1>
          <p className="text-zinc-500 font-mono text-sm mt-1">
            Start, pause, and end gaming sessions
          </p>
        </div>
        <button
          onClick={() => setShowStartModal(true)}
          className="bg-brand hover:bg-brand/90 text-white font-heading font-bold text-sm tracking-widest uppercase px-6 py-3 transition-all hover:shadow-[0_0_20px_rgba(136,88,237,0.3)] cursor-pointer"
        >
          + Walk-in Session
        </button>
      </div>

      {/* Active Sessions */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="bg-stealth/20 border border-zinc-800 p-12 text-center">
            <p className="text-zinc-500 font-heading text-lg">
              No active sessions
            </p>
            <p className="text-zinc-600 font-mono text-sm mt-2">
              Start a walk-in session or wait for a booking check-in
            </p>
          </div>
        ) : (
          sessions.map((session) => {
            const s = session as {
              id: string;
              status: string;
              started_at: string;
              total_paused_minutes: number;
              paused_at: string | null;
              station: {
                name: string;
                station_type: { name: string; base_price_per_hour: number };
              };
              profile?: { full_name: string };
            };

            const elapsed = Math.floor(
              (now - new Date(s.started_at).getTime()) / 60000,
            );
            const billableMinutes = Math.max(
              0,
              elapsed - (s.total_paused_minutes || 0) -
                (s.status === "paused" && s.paused_at
                  ? Math.ceil((now - new Date(s.paused_at).getTime()) / 60000)
                  : 0),
            );
            const estimatedPrice = Math.ceil(
              (s.station?.station_type?.base_price_per_hour || 0) *
                (billableMinutes / 60),
            );

            return (
              <div
                key={s.id}
                className="bg-stealth/20 border border-zinc-800 p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div
                      className={`w-4 h-4 rounded-full ${s.status === "active" ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}
                    ></div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-heading font-bold text-lg">
                          {s.station?.name}
                        </span>
                        <span className="text-zinc-500 font-mono text-xs border border-zinc-700 px-2 py-0.5">
                          {s.station?.station_type?.name}
                        </span>
                      </div>
                      <div className="text-zinc-400 font-mono text-sm mt-1">
                        {s.profile?.full_name || "Walk-in Guest"} • Started{" "}
                        {new Date(s.started_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-brand font-mono font-bold text-2xl tabular-nums">
                        {Math.floor(elapsed / 60)}h {elapsed % 60}m
                      </div>
                      <div className="text-zinc-500 font-mono text-xs">
                        Est: {formatPrice(estimatedPrice)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePauseResume(s.id, s.status)}
                        disabled={actionLoading === s.id}
                        className="text-xs font-mono uppercase tracking-wider text-yellow-400 hover:bg-yellow-500/10 px-4 py-2 border border-yellow-500/20 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {s.status === "active" ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => handleEnd(s.id)}
                        disabled={actionLoading === s.id}
                        className="text-xs font-mono uppercase tracking-wider text-red-400 hover:bg-red-500/10 px-4 py-2 border border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        End & Bill
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Start Session Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="start-session-title">
          <div className="bg-obsidian border border-zinc-700 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 id="start-session-title" className="text-xl font-heading font-bold text-white uppercase">
                Start Walk-in Session
              </h2>
              <button
                onClick={() => setShowStartModal(false)}
                aria-label="Close session dialog"
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-zinc-400 text-sm mb-6">
                Select an available station to start a new session:
              </p>
              {availableStations.length === 0 ? (
                <p className="text-zinc-500 font-mono text-center py-8">
                  No stations available
                </p>
              ) : (
                <div className="space-y-2">
                  {availableStations.map((station) => {
                    const st = station as {
                      id: string;
                      name: string;
                      station_type: {
                        name: string;
                        base_price_per_hour: number;
                      };
                    };
                    return (
                      <button
                        key={st.id}
                        onClick={() => handleStart(st.id)}
                        disabled={actionLoading === st.id}
                        className="w-full flex items-center justify-between bg-stealth/30 border border-zinc-800 hover:border-brand/50 p-4 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span className="text-white font-heading font-bold">
                            {st.name}
                          </span>
                        </div>
                        <span className="text-zinc-400 font-mono text-sm">
                          {formatPrice(
                            st.station_type?.base_price_per_hour || 0,
                          )}
                          /hr
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
