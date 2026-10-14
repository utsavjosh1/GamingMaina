"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Pause, Play, Plus, ReceiptText, X } from "lucide-react";
import {
  getActiveSessions,
  getAllStations,
  startSession,
  endSession,
  pauseSession,
  resumeSession,
} from "../actions";
import { useOpsPolling } from "@/features/operations/components/useOpsPolling";
import { OpsAlert, OpsEmpty } from "@/components/ui/OpsPrimitives";
import { cn } from "@/lib/utils";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [stations, setStations] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const startKeyRef = React.useRef(crypto.randomUUID());

  const loadData = useCallback(async () => {
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
  }, []);

  // Drizzle has no realtime channel: poll Server Actions, paused when hidden.
  useOpsPolling(loadData, 30_000, {
    clockMs: 60_000,
    onClock: () => setNow(Date.now()),
  });

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
      await startSession(stationId, undefined, startKeyRef.current);
      startKeyRef.current = crypto.randomUUID();
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
      const result = await endSession(sessionId, `session-end:${sessionId}`);
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
      <div className="mx-auto w-full max-w-[88rem] animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 rounded-[12px] bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-[var(--erp-muted)]">
            {sessions.length} live · {availableStations.length} stations free
          </p>
          <h1 className="ops-heading mt-1 text-2xl font-semibold tracking-tight text-white">Sessions</h1>
        </div>
        <button
          onClick={() => setShowStartModal(true)}
          className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] bg-paper px-4 text-sm font-semibold text-ink transition hover:bg-white"
        >
          <Plus className="size-4" aria-hidden="true" />
          Walk-in session
        </button>
      </div>

      {error && (
        <OpsAlert tone="error" title="Couldn't update sessions.">
          {error}
        </OpsAlert>
      )}
      {showStartModal && <p className="sr-only" aria-live="polite">Start session dialog opened</p>}

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <OpsEmpty
            title="No live sessions"
            description="Start a walk-in session, or wait for the next booking check-in."
            action={
              <button
                onClick={() => setShowStartModal(true)}
                className="inline-flex min-h-10 items-center whitespace-nowrap rounded-[10px] bg-paper px-4 text-sm font-semibold text-ink transition hover:bg-white"
              >
                Start a session
              </button>
            }
          />
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
            const busy = actionLoading === s.id;

            return (
              <article
                key={s.id}
                className="ops-surface rounded-[12px] p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        s.status === "active" ? "animate-pulse bg-emerald-400" : "bg-amber-400",
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                        <span className="truncate text-[15px] font-semibold text-white">
                          {s.station?.name}
                        </span>
                        <span className="truncate text-[13px] text-[var(--erp-muted)]">
                          {s.station?.station_type?.name}
                        </span>
                      </p>
                      <p className="tnum mt-0.5 truncate text-[13px] text-[var(--erp-muted)]">
                        {s.profile?.full_name || "Walk-in guest"} · started{" "}
                        {new Date(s.started_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        })}
                        {s.status !== "active" ? " · paused" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/[0.07] pt-3 lg:justify-end lg:border-0 lg:pt-0">
                    <p className="text-right leading-tight">
                      <span className="tnum block text-lg font-semibold text-white">
                        {Math.floor(elapsed / 60)}h {elapsed % 60}m
                      </span>
                      <span className="tnum block text-xs text-[var(--erp-muted)]">
                        ≈ {formatPrice(estimatedPrice)}
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePauseResume(s.id, s.status)}
                        disabled={busy}
                        className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-white/[0.1] bg-white/[0.03] px-3.5 text-[13px] font-semibold text-slate-200 transition hover:bg-white/[0.06] disabled:opacity-50"
                      >
                        {s.status === "active" ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
                        {s.status === "active" ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => handleEnd(s.id)}
                        disabled={busy}
                        className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-red-400/25 bg-red-400/10 px-3.5 text-[13px] font-semibold text-red-200 transition hover:bg-red-400/15 disabled:opacity-50"
                      >
                        <ReceiptText className="size-3.5" aria-hidden="true" />
                        End & bill
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="start-session-title">
          <button type="button" aria-label="Close" onClick={() => setShowStartModal(false)} className="absolute inset-0 cursor-default" />
          <div className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.1] bg-[var(--erp-bg-secondary)]">
            <div className="flex items-center justify-between border-b border-white/[0.08] p-5">
              <h2 id="start-session-title" className="ops-heading text-lg font-semibold tracking-tight text-white">
                Start a walk-in session
              </h2>
              <button
                onClick={() => setShowStartModal(false)}
                aria-label="Close session dialog"
                className="grid size-9 place-items-center rounded-[10px] border border-white/[0.08] text-[var(--erp-muted)] transition hover:bg-white/[0.06] hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-5">
              {availableStations.length === 0 ? (
                <OpsEmpty title="Nothing free" description="Every station is occupied or down. Check the floor for the next one freeing up." />
              ) : (
                <ul className="space-y-2">
                  {availableStations.map((station) => {
                    const st = station as {
                      id: string;
                      name: string;
                      station_type: {
                        name: string;
                        base_price_per_hour: number;
                      };
                    };
                    const starting = actionLoading === st.id;
                    return (
                      <li key={st.id}>
                        <button
                          onClick={() => handleStart(st.id)}
                          disabled={starting}
                          className="ops-surface-interactive flex w-full items-center justify-between gap-3 rounded-[10px] p-3.5 text-left disabled:opacity-50"
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                            <span className="truncate text-sm font-semibold text-white">{st.name}</span>
                          </span>
                          <span className="tnum shrink-0 text-[13px] text-[var(--erp-muted)]">
                            {starting ? "Starting…" : `${formatPrice(st.station_type?.base_price_per_hour || 0)}/hr`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
