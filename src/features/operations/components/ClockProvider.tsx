"use client";

import React from "react";

const ClockContext = React.createContext<number | null>(null);

export function ClockProvider({ children, precisionMs = 1000 }: { children: React.ReactNode; precisionMs?: number }) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), precisionMs);
    return () => window.clearInterval(timer);
  }, [precisionMs]);

  return <ClockContext.Provider value={now}>{children}</ClockContext.Provider>;
}

export function useClock() {
  const now = React.useContext(ClockContext);
  if (now === null) throw new Error("useClock must be used within ClockProvider");
  return now;
}
