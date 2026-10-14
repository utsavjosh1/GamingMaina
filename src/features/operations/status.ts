import type { StationStatus } from "@/lib/supabase/types";

export type OperationalStationStatus = StationStatus | "cleaning" | "booting" | "session_ending";

export interface StationStatusMeta {
  label: string;
  shortLabel: string;
  dotClassName: string;
  chipClassName: string;
  borderClassName: string;
  description: string;
}

export const stationStatusConfig: Record<OperationalStationStatus, StationStatusMeta> = {
  available: {
    label: "Available",
    shortLabel: "Open",
    dotClassName: "bg-emerald-400",
    chipClassName: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    borderClassName: "border-emerald-400/20 hover:border-emerald-300/50",
    description: "Ready to start a session",
  },
  booked: {
    label: "Reserved",
    shortLabel: "Reserved",
    dotClassName: "bg-ember",
    chipClassName: "border-ember/30 bg-ember/10 text-ember-strong",
    borderClassName: "border-ember/20 hover:border-ember/50",
    description: "Reservation is attached or arriving soon",
  },
  in_use: {
    label: "Occupied",
    shortLabel: "Live",
    dotClassName: "bg-sky-400",
    chipClassName: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    borderClassName: "border-sky-400/20 hover:border-sky-300/50",
    description: "Active customer session",
  },
  maintenance: {
    label: "Maintenance",
    shortLabel: "Issue",
    dotClassName: "bg-orange-400",
    chipClassName: "border-orange-400/30 bg-orange-400/10 text-orange-300",
    borderClassName: "border-orange-400/25 hover:border-orange-300/50",
    description: "Unavailable because an issue is open",
  },
  offline: {
    label: "Offline",
    shortLabel: "Offline",
    dotClassName: "bg-zinc-500",
    chipClassName: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
    borderClassName: "border-zinc-500/25 hover:border-zinc-400/50",
    description: "Device is disconnected or unavailable",
  },
  cleaning: {
    label: "Cleaning",
    shortLabel: "Clean",
    dotClassName: "bg-yellow-300",
    chipClassName: "border-yellow-300/30 bg-yellow-300/10 text-yellow-200",
    borderClassName: "border-yellow-300/25 hover:border-yellow-200/50",
    description: "Station is being prepared for the next customer",
  },
  booting: {
    label: "Booting",
    shortLabel: "Boot",
    dotClassName: "bg-cyan-300",
    chipClassName: "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
    borderClassName: "border-cyan-300/25 hover:border-cyan-200/50",
    description: "Machine is starting or reconnecting",
  },
  session_ending: {
    label: "Ending Soon",
    shortLabel: "Ending",
    dotClassName: "bg-amber-300",
    chipClassName: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    borderClassName: "border-amber-300/25 hover:border-amber-200/50",
    description: "Planned time is almost over",
  },
};

export function getStationStatusMeta(status: StationStatus): StationStatusMeta {
  return stationStatusConfig[status] ?? stationStatusConfig.offline;
}
