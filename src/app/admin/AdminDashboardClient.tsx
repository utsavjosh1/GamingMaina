"use client";

import React from "react";
import {
  assignStation,
  cancelBookingAsStaff,
  checkInBooking,
  endSession,
  getAllStations,
  getBookingsForDate,
  markNoShow,
  pauseSession,
  resumeSession,
  startSession,
  updateStationStatus,
} from "./actions";
import type { AdminBooking, AdminSession, AdminStation, StationStatus } from "@/lib/supabase/types";
import { formatDelhiDate, getDelhiDate } from "@/lib/dates";
import { ClockProvider } from "@/features/operations/components/ClockProvider";
import { CommandPalette } from "@/features/operations/components/CommandPalette";
import { MetricCard } from "@/features/operations/components/MetricCard";
import { StationDrawer } from "@/features/operations/components/StationDrawer";
import { StationGrid } from "@/features/operations/components/StationGrid";
import { OpsAlert, OpsEmpty, OpsPanel } from "@/components/ui/OpsPrimitives";
import { formatCurrency } from "@/features/operations/time";

interface AdminDashboardClientProps {
  stations: AdminStation[];
  sessions: AdminSession[];
  bookings: AdminBooking[];
  revenue: { total: number; byMethod: Record<string, number>; count: number };
  orgName: string;
  branchName: string;
}

interface SettlementNotice {
  stationName: string;
  totalMinutes: number;
  totalPrice: number;
}

export function AdminDashboardClient({
  stations: initialStations,
  sessions: initialSessions,
  bookings,
  revenue,
  orgName,
  branchName,
}: AdminDashboardClientProps) {
  const [stations, setStations] = React.useState<AdminStation[]>(initialStations);
  const [sessions, setSessions] = React.useState<AdminSession[]>(initialSessions);
  const [bookingList, setBookingList] = React.useState<AdminBooking[]>(bookings);
  const [selectedStationId, setSelectedStationId] = React.useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = React.useState<StationStatus | "all">("all");
  const [density, setDensity] = React.useState<"default" | "compact">("default");
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [settlement, setSettlement] = React.useState<SettlementNotice | null>(null);
  const [assignPick, setAssignPick] = React.useState<Record<string, string>>({});
  // Fresh key per start intent; retries reuse it, the next intent mints a new one.
  // End keys are deterministic per session: re-ending returns the stored bill.
  const startKeyRef = React.useRef(crypto.randomUUID());

  React.useEffect(() => {
    const openCommand = () => setCommandOpen(true);
    window.addEventListener("gamingmania:open-command", openCommand);
    return () => window.removeEventListener("gamingmania:open-command", openCommand);
  }, []);

  const selectedStation = React.useMemo(
    () => stations.find((station) => station.id === selectedStationId) ?? null,
    [selectedStationId, stations],
  );

  const selectedSession = selectedStation
    ? sessions.find((session) => session.station_id === selectedStation.id)
    : undefined;

  const metrics = React.useMemo(() => {
    const total = stations.length;
    const available = stations.filter((station) => station.status === "available").length;
    const occupied = stations.filter((station) => station.status === "in_use").length;
    const issues = stations.filter((station) => station.status === "maintenance" || station.status === "offline").length;
    const reserved = bookingList.filter((booking) => booking.status === "confirmed").length;
    const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return { total, available, occupied, issues, reserved, occupancy };
  }, [stations, bookingList]);

  const updateLocalStation = React.useCallback((stationId: string, status: StationStatus, sessionId: string | null = null) => {
    setStations((current) => current.map((station) => (
      station.id === stationId ? { ...station, status, current_session_id: sessionId } : station
    )));
  }, []);

  const handleStationStatus = React.useCallback(async (
    stationId: string,
    status: Extract<StationStatus, "available" | "maintenance" | "offline">,
  ) => {
    setActionLoading(stationId);
    setError(null);
    setSettlement(null);
    try {
      await updateStationStatus(stationId, status);
      updateLocalStation(stationId, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Station update failed");
    } finally {
      setActionLoading(null);
    }
  }, [updateLocalStation]);

  const handleStartSession = React.useCallback(async (stationId: string) => {
    setActionLoading(stationId);
    setError(null);
    setSettlement(null);
    try {
      const created = await startSession(stationId, undefined, startKeyRef.current);
      startKeyRef.current = crypto.randomUUID();
      const station = stations.find((item) => item.id === stationId) ?? null;
      const adminSession: AdminSession = {
        ...(created as AdminSession),
        station,
        profile: null,
      };
      setSessions((current) => [adminSession, ...current]);
      updateLocalStation(stationId, "in_use", created.id);
      setSelectedStationId(stationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start session");
    } finally {
      setActionLoading(null);
    }
  }, [stations, updateLocalStation]);

  const handleEndSession = React.useCallback(async (sessionId: string) => {
    setActionLoading(sessionId);
    setError(null);
    setSettlement(null);
    try {
      const result = await endSession(sessionId, `session-end:${sessionId}`);
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      setStations((current) => current.map((station) => (
        station.current_session_id === sessionId
          ? { ...station, status: "available", current_session_id: null }
          : station
      )));
      setSettlement(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to end session");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handlePauseResume = React.useCallback(async (sessionId: string, status: AdminSession["status"]) => {
    setActionLoading(sessionId);
    setError(null);
    try {
      const updated = status === "active" ? await pauseSession(sessionId) : await resumeSession(sessionId);
      setSessions((current) => current.map((session) => (
        session.id === sessionId ? { ...session, ...(updated as AdminSession) } : session
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update session");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const refreshFloor = React.useCallback(async () => {
    try {
      const [freshStations, freshBookings] = await Promise.all([
        getAllStations(),
        getBookingsForDate(getDelhiDate()),
      ]);
      setStations(freshStations);
      setBookingList(freshBookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh floor");
    }
  }, []);

  const handleCheckIn = React.useCallback(async (bookingId: string, stationId?: string) => {
    setActionLoading(bookingId);
    setError(null);
    try {
      await checkInBooking({ bookingId, stationId });
      await refreshFloor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to check in");
    } finally {
      setActionLoading(null);
    }
  }, [refreshFloor]);

  const handleAssign = React.useCallback(async (bookingId: string, stationId: string) => {
    if (!stationId) return;
    setActionLoading(bookingId);
    setError(null);
    try {
      await assignStation({ bookingId, stationId });
      await refreshFloor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign station");
    } finally {
      setActionLoading(null);
    }
  }, [refreshFloor]);

  const handleNoShow = React.useCallback(async (bookingId: string) => {
    setActionLoading(bookingId);
    setError(null);
    try {
      await markNoShow(bookingId);
      await refreshFloor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to mark no-show");
    } finally {
      setActionLoading(null);
    }
  }, [refreshFloor]);

  const handleCancelBooking = React.useCallback(async (bookingId: string) => {
    setActionLoading(bookingId);
    setError(null);
    try {
      await cancelBookingAsStaff(bookingId);
      await refreshFloor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel booking");
    } finally {
      setActionLoading(null);
    }
  }, [refreshFloor]);

  const upcomingBookings = bookingList
    .filter((booking) => booking.status === "confirmed" || booking.status === "checked_in")
    .slice(0, 6);

  return (
    <ClockProvider>
      <div className="mx-auto w-full max-w-[88rem] space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] text-[var(--erp-muted)]">
              {formatDelhiDate(getDelhiDate(), { weekday: "long", month: "long", day: "numeric" })}
              <span className="mx-2 text-slate-700">·</span>
              {orgName} · {branchName} branch
            </p>
            <h1 className="ops-heading mt-1 text-2xl font-semibold tracking-tight text-white lg:text-[1.75rem]">
              Floor overview
            </h1>
            <p className="mt-1 text-sm text-[var(--erp-muted)]">
              {metrics.available} of {metrics.total} stations ready · {sessions.length} sessions live · {formatCurrency(revenue.total)} collected today.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="inline-flex min-h-10 items-center whitespace-nowrap rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
            >
              Search · ⌘K
            </button>
            <button
              type="button"
              onClick={() => {
                const first = stations.find((station) => station.status === "available");
                if (first) void handleStartSession(first.id);
                else setError("No station is available right now. Mark a station available before starting a walk-in session.");
              }}
              className="inline-flex min-h-10 items-center whitespace-nowrap rounded-[10px] bg-paper px-4 text-sm font-semibold text-ink transition hover:bg-white"
            >
              New walk-in session
            </button>
          </div>
        </div>

        {(error || settlement) ? (
          <div className="space-y-3" aria-live="polite">
            {error ? (
              <OpsAlert tone="error" title="Action needed.">
                {error}
              </OpsAlert>
            ) : null}
            {settlement ? (
              <OpsAlert tone="success" title={`Session ended on ${settlement.stationName}.`}>
                {settlement.totalMinutes} billable minutes · {formatCurrency(settlement.totalPrice)} due. Collect it under Payments.
              </OpsAlert>
            ) : null}
          </div>
        ) : null}

        <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Stations ready" value={`${metrics.available}/${metrics.total}`} helper="Available now" tone="success" />
          <MetricCard label="Occupancy" value={`${metrics.occupancy}%`} helper={`${metrics.occupied} stations occupied`} tone="primary" />
          <MetricCard label="Active sessions" value={sessions.length} helper="Live or paused" />
          <MetricCard label="Revenue today" value={formatCurrency(revenue.total)} helper={`${revenue.count} payments collected`} />
        </section>

        {(metrics.issues > 0 || metrics.reserved > 0) ? (
          <p className="text-[13px] text-[var(--erp-muted)]">
            {metrics.issues > 0 ? `${metrics.issues} station${metrics.issues === 1 ? "" : "s"} need${metrics.issues === 1 ? "s" : ""} attention` : ""}
            {metrics.issues > 0 && metrics.reserved > 0 ? " · " : ""}
            {metrics.reserved > 0 ? `${metrics.reserved} reservation${metrics.reserved === 1 ? "" : "s"} confirmed today` : ""}
          </p>
        ) : null}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="ops-surface rounded-[14px] p-4 lg:p-5">
            <StationGrid
              stations={stations}
              sessions={sessions}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              density={density}
              onDensityChange={setDensity}
              onOpenStation={(station) => setSelectedStationId(station.id)}
              onStartSession={handleStartSession}
              onMarkMaintenance={(stationId) => void handleStationStatus(stationId, "maintenance")}
              loadingKey={actionLoading}
            />
          </div>

          <aside className="space-y-4">
            <OpsPanel title="Live sessions" description={`${sessions.length} on the floor`}>
              {sessions.length === 0 ? (
                <OpsEmpty title="Floor is clear" description="No active sessions. Start a walk-in session to fill the next station." />
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 4).map((session) => (
                    <button key={session.id} type="button" onClick={() => setSelectedStationId(session.station_id)} className="ops-surface-interactive w-full rounded-[10px] p-3 text-left">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-white">{session.station?.name ?? "Station"}</span>
                        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-300">
                          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                          Live
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--erp-muted)]">{session.profile?.full_name || "Walk-in guest"}</span>
                    </button>
                  ))}
                </div>
              )}
            </OpsPanel>

            <OpsPanel title="Reservations today" description={`${upcomingBookings.length} arriving`}>
              {upcomingBookings.length === 0 ? (
                <OpsEmpty title="No reservations" description="Walk-ins can start immediately on any ready station." />
              ) : (
                <div className="space-y-2">
                  {upcomingBookings.map((booking) => (
                    <ReservationRow
                      key={booking.id}
                      booking={booking}
                      stations={stations}
                      busy={actionLoading === booking.id}
                      pick={assignPick[booking.id] ?? ""}
                      onPickChange={(stationId) => setAssignPick((current) => ({ ...current, [booking.id]: stationId }))}
                      onCheckIn={() => void handleCheckIn(booking.id, assignPick[booking.id] || undefined)}
                      onAssign={() => assignPick[booking.id] && void handleAssign(booking.id, assignPick[booking.id])}
                      onNoShow={() => void handleNoShow(booking.id)}
                      onCancel={() => void handleCancelBooking(booking.id)}
                    />
                  ))}
                </div>
              )}
            </OpsPanel>
          </aside>
        </div>
      </div>

      <StationDrawer
        station={selectedStation}
        session={selectedSession}
        loadingKey={actionLoading}
        onClose={() => setSelectedStationId(null)}
        onStartSession={handleStartSession}
        onEndSession={handleEndSession}
        onPauseResume={handlePauseResume}
        onMarkAvailable={(stationId) => void handleStationStatus(stationId, "available")}
        onMarkMaintenance={(stationId) => void handleStationStatus(stationId, "maintenance")}
      />
      <CommandPalette
        stations={stations}
        sessions={sessions}
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onOpenStation={(station) => setSelectedStationId(station.id)}
        onStartSession={handleStartSession}
      />
    </ClockProvider>
  );
}

function ReservationRow({
  booking,
  stations,
  busy,
  pick,
  onPickChange,
  onCheckIn,
  onAssign,
  onNoShow,
  onCancel,
}: {
  booking: AdminBooking;
  stations: AdminStation[];
  busy: boolean;
  pick: string;
  onPickChange: (stationId: string) => void;
  onCheckIn: () => void;
  onAssign: () => void;
  onNoShow: () => void;
  onCancel: () => void;
}) {
  const compatible = stations.filter(
    (station) => station.station_type_id === booking.station_type_id && station.status === "available",
  );
  const actionClass =
    "inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold transition disabled:opacity-50";

  return (
    <div className="ops-sunken rounded-[10px] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="tnum text-sm font-semibold text-white">{booking.start_time.slice(0, 5)}</span>
        <span className="flex items-center gap-2">
          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${booking.status === "checked_in" ? "bg-sky-400/15 text-sky-300" : "bg-white/[0.06] text-slate-300"}`}>
            {booking.status === "checked_in" ? "Checked in" : "Confirmed"}
          </span>
          <span className="tnum text-[13px] font-medium text-ember-strong">{formatCurrency(booking.estimated_price)}</span>
        </span>
      </div>
      <p className="mt-1 truncate text-[13px] text-slate-300">{booking.profile?.full_name || "Customer"}</p>
      <p className="truncate text-xs text-[var(--erp-muted)]">{booking.station?.name || booking.station_type?.name || "Any station"} · {booking.duration_hours}h</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {booking.status === "confirmed" ? (
          <>
            <select
              aria-label="Assign station"
              value={pick}
              onChange={(event) => onPickChange(event.target.value)}
              disabled={busy}
              className="min-h-8 max-w-[10rem] truncate rounded-lg border border-white/[0.1] bg-black/30 px-2 text-xs text-slate-200 disabled:opacity-50"
            >
              <option value="">Any station</option>
              {compatible.map((station) => (
                <option key={station.id} value={station.id}>{station.name}</option>
              ))}
            </select>
            <button type="button" onClick={onCheckIn} disabled={busy} className={`${actionClass} bg-paper text-ink hover:bg-white`}>
              {busy ? "…" : "Check in"}
            </button>
            <button type="button" onClick={onNoShow} disabled={busy} className={`${actionClass} border border-white/[0.1] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]`}>
              No-show
            </button>
            <button type="button" onClick={onCancel} disabled={busy} className={`${actionClass} border border-red-400/25 bg-red-400/10 text-red-200 hover:bg-red-400/15`}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <select
              aria-label="Assign station"
              value={pick}
              onChange={(event) => onPickChange(event.target.value)}
              disabled={busy}
              className="min-h-8 max-w-[10rem] truncate rounded-lg border border-white/[0.1] bg-black/30 px-2 text-xs text-slate-200 disabled:opacity-50"
            >
              <option value="">Pick station</option>
              {compatible.map((station) => (
                <option key={station.id} value={station.id}>{station.name}</option>
              ))}
            </select>
            <button type="button" onClick={onAssign} disabled={busy || !pick} className={`${actionClass} bg-paper text-ink hover:bg-white`}>
              Assign
            </button>
            <button type="button" onClick={onNoShow} disabled={busy} className={`${actionClass} border border-white/[0.1] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]`}>
              No-show
            </button>
          </>
        )}
      </div>
    </div>
  );
}
