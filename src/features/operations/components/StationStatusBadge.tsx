import type { StationStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { getStationStatusMeta } from "@/features/operations/status";

export function StationStatusBadge({ status, compact = false }: { status: StationStatus; compact?: boolean }) {
  const meta = getStationStatusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-xs font-medium leading-none",
        meta.chipClassName,
        compact && "px-1.5 py-0.5 text-[11px]",
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dotClassName)} aria-hidden="true" />
      {compact ? meta.shortLabel : meta.label}
    </span>
  );
}
