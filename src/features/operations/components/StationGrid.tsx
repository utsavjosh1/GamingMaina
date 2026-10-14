"use client";

import React from "react";
import type { AdminSession, AdminStation, StationStatus } from "@/lib/supabase/types";
import { StationCard } from "./StationCard";
import { OpsEmpty } from "@/components/ui/OpsPrimitives";
import { cn } from "@/lib/utils";

const filters: Array<{ label: string; value: StationStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "Occupied", value: "in_use" },
  { label: "Reserved", value: "booked" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Offline", value: "offline" },
];

interface StationGridProps {
  stations: AdminStation[];
  sessions: AdminSession[];
  selectedStatus: StationStatus | "all";
  onStatusChange: (status: StationStatus | "all") => void;
  density: "default" | "compact";
  onDensityChange: (density: "default" | "compact") => void;
  onOpenStation: (station: AdminStation) => void;
  onStartSession: (stationId: string) => void;
  onMarkMaintenance: (stationId: string) => void;
  loadingKey: string | null;
}

export function StationGrid({
  stations,
  sessions,
  selectedStatus,
  onStatusChange,
  density,
  onDensityChange,
  onOpenStation,
  onStartSession,
  onMarkMaintenance,
  loadingKey,
}: StationGridProps) {
  const sessionsByStationId = React.useMemo(() => {
    const map = new Map<string, AdminSession>();
    for (const session of sessions) map.set(session.station_id, session);
    return map;
  }, [sessions]);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: stations.length };
    for (const s of stations) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [stations]);

  const filteredStations =
    selectedStatus === "all"
      ? stations
      : stations.filter((station) => station.status === selectedStatus);

  const groupedStations = React.useMemo(() => {
    return filteredStations.reduce<Record<string, AdminStation[]>>((groups, station) => {
      const group = station.station_type?.category || station.station_type?.name || "Floor";
      groups[group] ??= [];
      groups[group].push(station);
      return groups;
    }, {});
  }, [filteredStations]);

  const zones = Object.entries(groupedStations);

  return (
    <section aria-labelledby="live-floor-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 id="live-floor-title" className="ops-heading text-lg font-semibold tracking-tight text-white">
            Live floor
          </h2>
          <p className="mt-1 text-sm text-[var(--erp-muted)]">
            {stations.length} stations · {sessions.length} active sessions. Select a station for controls.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDensityChange(density === "default" ? "compact" : "default")}
          className="inline-flex min-h-9 shrink-0 items-center self-start whitespace-nowrap rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-semibold text-slate-300 transition hover:text-white lg:self-auto"
          aria-pressed={density === "compact"}
        >
          {density === "default" ? "Compact view" : "Comfortable view"}
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Filter stations by status"
        className="ops-sunken mt-4 flex gap-1 overflow-x-auto rounded-[12px] p-1"
      >
        {filters.map((filter) => {
          const active = selectedStatus === filter.value;
          const count = filter.value === "all" ? (counts.all ?? 0) : (counts[filter.value] ?? 0);
          return (
            <button
              key={filter.value}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onStatusChange(filter.value)}
              className={cn(
                "inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition",
                active ? "bg-white/[0.09] text-white" : "text-slate-400 hover:text-white",
              )}
            >
              {filter.label}
              <span className={cn("tnum text-xs", active ? "text-slate-200" : "text-[var(--erp-subtle)]")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredStations.length === 0 ? (
        <div className="mt-4">
          <OpsEmpty
            title="No stations match this filter"
            description="Try a different status, or check whether stations are configured for this branch."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          {zones.map(([zone, zoneStations]) => (
            <div key={zone}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="text-[13px] font-semibold tracking-tight text-slate-200">{zone}</h3>
                <span className="tnum shrink-0 text-xs text-[var(--erp-subtle)]">
                  {zoneStations.length} stations
                </span>
              </div>
              <div
                className={
                  density === "compact"
                    ? "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
                    : "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
                }
              >
                {zoneStations.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    activeSession={sessionsByStationId.get(station.id)}
                    onOpen={onOpenStation}
                    onStartSession={onStartSession}
                    onMarkMaintenance={onMarkMaintenance}
                    loading={loadingKey === station.id}
                    density={density}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
