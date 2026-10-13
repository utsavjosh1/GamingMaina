"use client";

import React from "react";
import { AlertTriangle, Pause, Play, Power, ReceiptText, Wrench, X } from "lucide-react";
import type { AdminSession, AdminStation } from "@/lib/supabase/types";
import { estimateSessionCharge, formatCurrency } from "@/features/operations/time";
import { StationStatusBadge } from "./StationStatusBadge";
import { SessionTimer } from "./SessionTimer";
import { useClock } from "./ClockProvider";
import { cn } from "@/lib/utils";

interface StationDrawerProps {
  station: AdminStation | null;
  session?: AdminSession;
  loadingKey: string | null;
  onClose: () => void;
  onStartSession: (stationId: string) => void;
  onEndSession: (sessionId: string) => void;
  onPauseResume: (sessionId: string, status: AdminSession["status"]) => void;
  onMarkAvailable: (stationId: string) => void;
  onMarkMaintenance: (stationId: string) => void;
}

export function StationDrawer({
  station,
  session,
  loadingKey,
  onClose,
  onStartSession,
  onEndSession,
  onPauseResume,
  onMarkAvailable,
  onMarkMaintenance,
}: StationDrawerProps) {
  const now = useClock();
  const isOpen = Boolean(station);
  const isLoading =
    Boolean(station && loadingKey === station.id) ||
    Boolean(session && loadingKey === session.id);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!station) return null;

  const stationType = station.station_type;
  const customerName = session?.profile?.full_name || "Walk-in guest";
  const charge = session ? estimateSessionCharge(session, now) : 0;

  const confirmAndEnd = () => {
    if (!session) return;
    const confirmed = window.confirm(
      `End ${customerName}'s session on ${station.name}? The station becomes available and the charge of ${formatCurrency(charge)} moves to Payments.`,
    );
    if (confirmed) onEndSession(session.id);
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        className="absolute inset-0 cursor-default bg-black/60"
        aria-label="Close station controls"
        onClick={onClose}
      />
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/[0.1] bg-[var(--erp-bg-secondary)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-drawer-title"
      >
        <header className="shrink-0 border-b border-white/[0.08] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="station-drawer-title"
                className="ops-heading truncate text-xl font-semibold tracking-tight text-white"
              >
                {station.name}
              </h2>
              <p className="mt-0.5 truncate text-sm text-[var(--erp-muted)]">
                {stationType?.name ?? "Station"}
                {stationType?.category ? ` · ${stationType.category}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StationStatusBadge status={station.status} />
            <span className="tnum rounded-full border border-white/[0.08] px-2.5 py-1 text-xs font-medium text-slate-300">
              {formatCurrency(stationType?.base_price_per_hour ?? 0)}/hr
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {session ? (
            <section aria-label="Current session" className="ops-surface rounded-[12px] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-white">{customerName}</p>
                  <p className="tnum mt-0.5 text-xs text-[var(--erp-muted)]">
                    Started{" "}
                    {new Date(session.started_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    · {session.status === "active" ? "Running" : "Paused"}
                  </p>
                </div>
              </div>
              <div className="ops-sunken mt-4 grid grid-cols-2 gap-3 rounded-[10px] p-3">
                <div>
                  <p className="text-[11px] text-[var(--erp-subtle)]">Elapsed</p>
                  <div className="mt-1"><SessionTimer session={session} /></div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[var(--erp-subtle)]">Running charge</p>
                  <p className="tnum mt-1 text-xl font-semibold text-white">{formatCurrency(charge)}</p>
                </div>
              </div>
            </section>
          ) : (
            <section className="ops-surface rounded-[12px] p-4">
              <p className="text-[15px] font-semibold text-white">
                {station.status === "available" ? "Ready for the next customer" : "Not sellable right now"}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--erp-muted)]">
                {station.status === "available"
                  ? "Start a walk-in session, or report an issue if the rig needs attention."
                  : "Resolve the open issue before starting a session on this station."}
              </p>
            </section>
          )}

          <section aria-label="Actions" className="mt-5">
            <h3 className="text-[13px] font-semibold text-slate-200">Actions</h3>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {station.status === "available" && !session ? (
                <DrawerAction icon={Play} label={isLoading ? "Starting…" : "Start session"} disabled={isLoading} onClick={() => onStartSession(station.id)} primary />
              ) : null}
              {session ? (
                <>
                  <DrawerAction
                    icon={session.status === "active" ? Pause : Play}
                    label={session.status === "active" ? "Pause timer" : "Resume timer"}
                    disabled={isLoading}
                    onClick={() => onPauseResume(session.id, session.status)}
                  />
                  <DrawerAction icon={ReceiptText} label={isLoading ? "Ending…" : "End & bill"} disabled={isLoading} onClick={confirmAndEnd} destructive />
                </>
              ) : null}
              {(station.status === "maintenance" || station.status === "offline") && (
                <DrawerAction icon={Power} label="Mark available" disabled={isLoading} onClick={() => onMarkAvailable(station.id)} primary />
              )}
              {station.status === "available" && !session && (
                <DrawerAction icon={Wrench} label="Report issue" disabled={isLoading} onClick={() => onMarkMaintenance(station.id)} />
              )}
            </div>
            <p className="mt-2.5 text-xs leading-5 text-[var(--erp-subtle)]">
              Transfers, extensions and POS items attach from Payments once billing is confirmed.
            </p>
          </section>

          <section aria-label="Station facts" className="mt-5 grid gap-2 sm:grid-cols-2">
            <Fact label="Rate" value={`${formatCurrency(stationType?.base_price_per_hour ?? 0)} / hour`} />
            <Fact label="Health" value={station.status === "offline" ? "Disconnected" : "Heartbeat OK"} />
          </section>

          {station.status === "maintenance" ? (
            <section className="mt-4 rounded-[12px] border border-orange-400/25 bg-orange-500/[0.08] p-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-300" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-orange-100">Blocked for new sessions</h3>
                  <p className="mt-1 text-[13px] leading-5 text-orange-100/70">
                    A manager or technician needs to mark this station available after the fix.
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function DrawerAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  primary = false,
  destructive = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        primary && "border-ember/40 bg-ember text-ember-ink hover:bg-ember-strong",
        destructive && "border-red-400/25 bg-red-500/10 text-red-200 hover:bg-red-500/15",
        !primary && !destructive && "border-white/[0.08] bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="ops-surface rounded-[12px] p-3.5">
      <p className="text-[11px] text-[var(--erp-subtle)]">{label}</p>
      <p className="tnum mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
