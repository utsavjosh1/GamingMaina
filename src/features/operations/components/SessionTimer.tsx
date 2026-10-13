"use client";

import type { AdminSession } from "@/lib/supabase/types";
import { getBillableSeconds, formatDuration } from "@/features/operations/time";
import { useClock } from "./ClockProvider";

export function SessionTimer({ session, label = "elapsed" }: { session: AdminSession; label?: string }) {
  const now = useClock();
  const billableSeconds = getBillableSeconds(session, now);

  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-slate-100">{formatDuration(billableSeconds)}</span>
    </span>
  );
}
