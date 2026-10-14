import type { AdminSession } from "@/lib/supabase/types";

export function formatCurrency(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function getBillableSeconds(session: AdminSession, now: number) {
  const startedAt = new Date(session.started_at).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const recordedPauseSeconds = (session.total_paused_minutes || 0) * 60;
  const livePauseSeconds = session.status === "paused" && session.paused_at
    ? Math.max(0, Math.ceil((now - new Date(session.paused_at).getTime()) / 1000))
    : 0;

  return Math.max(0, elapsedSeconds - recordedPauseSeconds - livePauseSeconds);
}

export function estimateSessionCharge(session: AdminSession, now: number) {
  const rate = session.station?.station_type?.base_price_per_hour ?? 0;
  const hours = getBillableSeconds(session, now) / 3600;
  return Math.ceil(rate * hours);
}
