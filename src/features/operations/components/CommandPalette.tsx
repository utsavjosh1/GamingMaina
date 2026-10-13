"use client";

import React from "react";
import { CalendarPlus, Command, CreditCard, MonitorPlay, Search, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AdminSession, AdminStation } from "@/lib/supabase/types";

interface CommandPaletteProps {
  stations: AdminStation[];
  sessions: AdminSession[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenStation: (station: AdminStation) => void;
  onStartSession: (stationId: string) => void;
}

export function CommandPalette({ stations, sessions, open, onOpenChange, onOpenStation, onStartSession }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isTyping = event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
      if (!isTyping && event.key === "/") {
        event.preventDefault();
        onOpenChange(true);
      }
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  // Reset on open is intentional UI state sync, not a render cascade.
  React.useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const liveStationIds = new Set(sessions.map((session) => session.station_id));
  const filteredStations = stations
    .filter((station) => {
      if (!normalizedQuery) return true;
      return [station.name, station.station_type?.name, station.station_type?.category, station.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    })
    .slice(0, 8);

  const run = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="command-title">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close command palette" onClick={() => onOpenChange(false)} />
      <div className="relative mx-auto mt-[10vh] max-w-2xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[var(--erp-bg-secondary)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <Search className="size-4 text-[var(--erp-subtle)]" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stations and actions…"
            className="tnum h-10 flex-1 bg-transparent text-sm text-white placeholder:text-[var(--erp-subtle)] focus:outline-none"
          />
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg p-2 text-[var(--erp-subtle)] transition hover:bg-white/[0.06] hover:text-white" aria-label="Close command palette">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <h2 id="command-title" className="sr-only">Command palette</h2>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          <CommandGroup title="Quick actions">
            <CommandRow icon={MonitorPlay} label="New walk-in session" description="Choose the first available station" shortcut="N" onSelect={() => run(() => {
              const first = stations.find((station) => station.status === "available");
              if (first) onStartSession(first.id);
            })} />
            <CommandRow icon={UserPlus} label="New customer" description="Create customer profile" shortcut="C" onSelect={() => run(() => router.push("/admin/customers"))} />
            <CommandRow icon={CalendarPlus} label="Reservation" description="Open scheduler" shortcut="R" onSelect={() => run(() => router.push("/admin/reservations"))} />
            <CommandRow icon={CreditCard} label="POS sale" description="Open counter checkout" shortcut="P" onSelect={() => run(() => router.push("/admin/pos"))} />
          </CommandGroup>

          <CommandGroup title="Stations">
            {filteredStations.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--erp-muted)]">No matching stations.</p>
            ) : filteredStations.map((station) => (
              <CommandRow
                key={station.id}
                icon={Command}
                label={`Open ${station.name}`}
                description={`${station.station_type?.name ?? "Station"} · ${station.status.replace("_", " ")}${liveStationIds.has(station.id) ? " · live" : ""}`}
                shortcut={station.status === "available" ? "Start" : "Open"}
                onSelect={() => run(() => onOpenStation(station))}
              />
            ))}
          </CommandGroup>
        </div>
      </div>
    </div>
  );
}

function CommandGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-2">
      <h3 className="px-3 pb-1.5 text-xs font-medium text-[var(--erp-subtle)]">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function CommandRow({ icon: Icon, label, description, shortcut, onSelect }: { icon: React.ElementType; label: string; description: string; shortcut: string; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition hover:bg-white/[0.06] focus-visible:bg-white/[0.08] focus-visible:outline-none">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-ember-strong">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{label}</span>
        <span className="block truncate text-xs text-[var(--erp-muted)]">{description}</span>
      </span>
      <kbd className="tnum shrink-0 rounded-md border border-white/[0.08] bg-black/20 px-2 py-1 text-[11px] text-[var(--erp-subtle)]">{shortcut}</kbd>
    </button>
  );
}
