"use client";

import React from "react";

/**
 * Visibility-aware polling for Drizzle-backed Server Actions.
 *
 * We deliberately do NOT use Supabase Realtime / supabase-js in request
 * paths (contract: Supabase = Postgres + Storage only). Live ops data
 * (floor, sessions) is refreshed by re-invoking Server Actions on an
 * interval that pauses when the tab is hidden and resets on reconnect.
 */
export function useOpsPolling(
  load: () => void | Promise<unknown>,
  intervalMs = 30_000,
  options: { runOnMount?: boolean; clockMs?: number; onClock?: () => void } = {},
) {
  const { runOnMount = true, clockMs, onClock } = options;
  const loadRef = React.useRef(load);
  const clockRef = React.useRef(onClock);

  React.useEffect(() => {
    loadRef.current = load;
    clockRef.current = onClock;
  }, [load, onClock]);

  React.useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void loadRef.current();
    };

    if (runOnMount) void loadRef.current();

    const interval = window.setInterval(tick, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadRef.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onVisibility);

    if (clockMs) {
      const clock = window.setInterval(() => clockRef.current?.(), clockMs);
      return () => {
        window.clearInterval(interval);
        window.clearInterval(clock);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("online", onVisibility);
      };
    }

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onVisibility);
    };
  }, [intervalMs, runOnMount, clockMs]);
}
