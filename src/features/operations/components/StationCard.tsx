"use client";

import React from "react";
import { Monitor, Play, Wrench } from "lucide-react";
import type { AdminSession, AdminStation } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { getStationStatusMeta } from "@/features/operations/status";
import { estimateSessionCharge, formatCurrency } from "@/features/operations/time";
import { useClock } from "./ClockProvider";
import { SessionTimer } from "./SessionTimer";
import { StationStatusBadge } from "./StationStatusBadge";

export interface StationCardProps {
  station: AdminStation;
  activeSession?: AdminSession;
  onOpen: (station: AdminStation) => void;
  onStartSession: (stationId: string) => void;
  onMarkMaintenance: (stationId: string) => void;
  loading?: boolean;
  density?: "default" | "compact";
}

function StationCardBase({
  station,
  activeSession,
  onOpen,
  onStartSession,
  onMarkMaintenance,
  loading = false,
  density = "default",
}: StationCardProps) {
  const now = useClock();
  const meta = getStationStatusMeta(station.status);
  const isCompact = density === "compact";
  const hourlyRate = station.station_type?.base_price_per_hour ?? 0;
  const customerName = activeSession?.profile?.full_name || "Walk-in guest";
  const currentCharge = activeSession ? estimateSessionCharge(activeSession, now) : 0;

  return (
    <article
      className={cn(
        "ops-surface flex flex-col rounded-[12px]",
        isCompact ? "p-3" : "p-4",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(station)}
        className="block w-full rounded-lg text-left"
        aria-label={`${station.name}, ${meta.label}. Open controls.`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn("size-2 shrink-0 rounded-full", meta.dotClassName, station.status === "in_use" && "animate-pulse")}
              aria-hidden="true"
            />
            <h3 className="truncate text-sm font-semibold tracking-tight text-white">{station.name}</h3>
          </div>
          <StationStatusBadge status={station.status} compact />
        </div>
        <p className="mt-1 truncate text-xs text-[var(--erp-muted)]">
          {station.station_type?.name ?? "Station"}
          {station.station_type?.category ? ` · ${station.station_type.category}` : ""}
        </p>
      </button>

      {station.status === "in_use" && activeSession ? (
        <div className="ops-sunken mt-3 rounded-[10px] p-3">
          <p className="truncate text-[13px] font-semibold text-slate-100">{customerName}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <SessionTimer session={activeSession} />
            <span className="text-right leading-tight">
              <span className="block text-[11px] text-[var(--erp-subtle)]">Charge</span>
              <span className="tnum text-[15px] font-semibold text-ember-strong">
                {formatCurrency(currentCharge)}
              </span>
            </span>
          </div>
        </div>
      ) : station.status === "available" ? (
        <div className="ops-sunken mt-3 flex items-center justify-between gap-3 rounded-[10px] p-3">
          <span className="flex items-center gap-2 text-[13px] text-[var(--erp-muted)]">
            <Monitor className="size-4" aria-hidden="true" />
            Ready for walk-in
          </span>
          <span className="tnum whitespace-nowrap text-[13px] font-semibold text-emerald-300">
            {formatCurrency(hourlyRate)}/hr
          </span>
        </div>
      ) : (
        <div className="ops-sunken mt-3 rounded-[10px] p-3">
          <p className="text-[13px] leading-5 text-[var(--erp-muted)]">{meta.description}</p>
        </div>
      )}

      {!isCompact && (
        <div className="mt-3 flex gap-2">
          {station.status === "available" ? (
            <>
              <button
                type="button"
                onClick={() => onStartSession(station.id)}
                disabled={loading}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-emerald-400/25 bg-emerald-500/10 px-3 text-[13px] font-semibold text-emerald-200 transition hover:bg-emerald-500/15 disabled:opacity-50"
              >
                <Play className="size-3.5" aria-hidden="true" />
                {loading ? "Starting…" : "Start session"}
              </button>
              <button
                type="button"
                onClick={() => onMarkMaintenance(station.id)}
                disabled={loading}
                aria-label={`Report an issue on ${station.name}`}
                title="Report issue"
                className="inline-flex min-h-10 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                <Wrench className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : station.status === "in_use" ? (
            <button
              type="button"
              onClick={() => onOpen(station)}
              className="inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] font-semibold text-slate-200 transition hover:bg-white/[0.06]"
            >
              Open controls
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(station)}
              className="inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] font-semibold text-slate-200 transition hover:bg-white/[0.06]"
            >
              View details
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export const StationCard = React.memo(StationCardBase);
