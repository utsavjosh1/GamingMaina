"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SectionHeading } from "./marketing/SectionHeading";
import { mediaPaths } from "@/lib/media";
import { stationDetails } from "@/lib/public-content";
import { cn } from "@/lib/utils";

export interface PublicStationType {
  id?: string;
  name: string;
  category: string;
  base_price_per_hour: number;
  image_url: string | null;
  available?: number;
  total?: number;
}

export const fallbackStationTypes: PublicStationType[] = [
  { name: "PC-RTX", category: "Competitive", base_price_per_hour: 15000, image_url: mediaPaths.spiderman, available: 5, total: 5 },
  { name: "PC-GTX", category: "Casual", base_price_per_hour: 10000, image_url: mediaPaths.gta5, available: 5, total: 5 },
  { name: "PS5", category: "Next-gen", base_price_per_hour: 20000, image_url: mediaPaths.gow, available: 3, total: 3 },
  { name: "PS4", category: "Co-op", base_price_per_hour: 15000, image_url: mediaPaths.rdr2, available: 3, total: 3 },
  { name: "Virtual Reality", category: "Immersive", base_price_per_hour: 25000, image_url: mediaPaths.spiderman, available: 2, total: 2 },
  { name: "Racing Wheel", category: "Simulator", base_price_per_hour: 18000, image_url: mediaPaths.bmw, available: 2, total: 2 },
  { name: "Billiards", category: "Lounge", base_price_per_hour: 20000, image_url: mediaPaths.gta5, available: 2, total: 2 },
  { name: "Air Hockey", category: "Arcade", base_price_per_hour: 15000, image_url: mediaPaths.gow, available: 0, total: 1 },
  { name: "Shooting", category: "Casual", base_price_per_hour: 15000, image_url: mediaPaths.rdr2, available: 2, total: 2 },
];

const stationHardwareSpecs: Record<string, string> = {
  "PC-RTX": "RTX 40-series · 240Hz Fast IPS · Mechanical keys + 8KHz mouse",
  "PC-GTX": "GTX 1660 / RTX 3050 · 144Hz · Headset + RGB keys",
  PS5: "RDNA 2 · 4K 120Hz HDR · DualSense controllers",
  PS4: "1080p 60Hz · DualShock 4 · Split-screen ready",
  "Virtual Reality": "6DoF headset · 90Hz OLED · Motion controllers",
  "Racing Wheel": "Force-feedback wheel · Pedals + paddles · Cockpit seat",
  Billiards: "Tournament slate · Aramith balls · Overhead lights",
  "Air Hockey": "High-flow blower · Digital scoreboard · 1v1",
  Shooting: "Laser tracking · Target screen · Tactical blaster",
};

function formatPrice(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const categories = [
  { id: "ALL", label: "All" },
  { id: "PC", label: "PC" },
  { id: "CONSOLE", label: "PlayStation" },
  { id: "SIM", label: "Sim & VR" },
  { id: "ARCADE", label: "Arcade" },
];

export function Services({ stationTypes }: { stationTypes?: PublicStationType[] }) {
  const stations = stationTypes && stationTypes.length > 0 ? stationTypes : fallbackStationTypes;
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const filteredStations = stations.filter((station) => {
    if (activeCategory === "ALL") return true;
    if (activeCategory === "PC") return station.name.startsWith("PC");
    if (activeCategory === "CONSOLE") return station.name.startsWith("PS");
    if (activeCategory === "SIM") return station.name === "Racing Wheel" || station.name === "Virtual Reality";
    if (activeCategory === "ARCADE") return ["Billiards", "Air Hockey", "Shooting"].includes(station.name);
    return true;
  });

  return (
    <section className="gm-section border-t border-white/[0.06] bg-coal-soft" id="stations" aria-labelledby="stations-heading">
      <div className="gm-container">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Stations & rates"
            title={<span id="stations-heading">Pick a rig. Every hourly rate, up front.</span>}
            description="Nine setups across PC, console, sim and arcade — tournament specs, zero input lag, pay at the counter."
          />
          <div role="tablist" aria-label="Filter stations" className="flex shrink-0 flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  activeCategory === cat.id ? "bg-white/[0.08] text-paper" : "text-[var(--gm-muted)] hover:text-paper",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <ol className="mt-10 border-t border-white/[0.08]">
          {filteredStations.map((station, i) => {
            const details = stationDetails[station.name];
            const available = station.available ?? 0;
            const total = station.total ?? 0;
            const isAvailable = total === 0 || available > 0;
            return (
              <li key={station.id ?? station.name}>
                <Link
                  href="/book-online"
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/[0.08] py-5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[3rem_1fr_auto_auto] sm:gap-6 sm:px-3"
                  aria-label={`Reserve ${station.name}, ${formatPrice(station.base_price_per_hour)} per hour`}
                >
                  <span className="tnum text-sm text-[var(--gm-subtle)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="truncate font-heading text-xl font-bold tracking-tight text-paper sm:text-2xl">
                        {station.name}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--gm-muted)]">
                        <span className={cn("size-1.5 rounded-full", isAvailable ? "bg-emerald-400" : "bg-red-400")} aria-hidden="true" />
                        {total > 0 ? `${available}/${total} free` : station.category}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[13px] text-[var(--gm-muted)]">
                      {stationHardwareSpecs[station.name] ?? details?.summary ?? station.category}
                    </span>
                  </span>
                  <span className="tnum hidden text-right text-sm font-semibold text-paper sm:block">
                    {formatPrice(station.base_price_per_hour)}
                    <span className="block text-xs font-normal text-[var(--gm-subtle)]">per hour</span>
                  </span>
                  <span className="grid size-10 place-items-center rounded-xl border border-white/[0.1] text-[var(--gm-muted)] transition-colors group-hover:border-ember/50 group-hover:text-ember-strong">
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13px] text-[var(--gm-muted)]">
          <span>Multi-hour passes and weekday happy hours auto-apply at the counter.</span>
          <Link href="/book-online" className="inline-flex items-center gap-1.5 font-semibold text-paper hover:text-ember-strong">
            Reserve online <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  );
}
