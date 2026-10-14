import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { getMediaUrl, mediaPaths } from "@/lib/media";

const experiences = [
  {
    id: "pc-arena",
    title: "Competitive PC arena",
    meta: "Valorant · CS2 · Warzone · DOTA 2",
    specs: "RTX 40-series · 240Hz · 4ms ping",
    image: mediaPaths.spiderman,
  },
  {
    id: "ps5-lounge",
    title: "PlayStation 5 lounge",
    meta: "Story blockbusters · EA FC · Tekken",
    specs: "4K 120Hz HDR · DualSense · Sofa seating",
    image: mediaPaths.gow,
  },
  {
    id: "racing-sim",
    title: "Pro racing rig",
    meta: "Forza · F1 · Assetto Corsa",
    specs: "Force-feedback wheel · Pedals · Cockpit",
    image: mediaPaths.bmw,
  },
  {
    id: "vr-holodeck",
    title: "Virtual reality",
    meta: "Beat Saber · VR FPS · 6DoF",
    specs: "Motion tracking · Wireless · Guarded zone",
    image: mediaPaths.rdr2,
  },
  {
    id: "arcade-billiards",
    title: "Billiards & arcade",
    meta: "Pool · Air hockey · Target shooting",
    specs: "Tournament slate · Digital scoring",
    image: mediaPaths.gta5,
  },
];

export function ExperienceMatrix() {
  return (
    <section className="gm-section border-t border-white/[0.06]" id="experiences" aria-labelledby="experiences-heading">
      <div className="gm-container grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeading
            eyebrow="Ways to play"
            title={<span id="experiences-heading">Five rooms, one roof. Pick your game.</span>}
            description="Grind ranked on PC, run story campaigns on PS5, drift the sim rig, step into VR — or cool down over pool between matches."
          />
          <Link
            href="/book-online"
            className="mt-6 inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-paper px-6 text-sm font-semibold text-ink transition-colors hover:bg-white"
          >
            Book your room
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <ol className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {experiences.map((exp) => (
            <li key={exp.id}>
              <Link href="/book-online" className="group flex items-center gap-4 py-4 sm:gap-5" aria-label={`${exp.title} — reserve a station`}>
                <span className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-white/[0.09] sm:block">
                  <Image
                    src={getMediaUrl(exp.image)}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading text-lg font-bold tracking-tight text-paper">
                    {exp.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-[var(--gm-muted)]">{exp.meta}</span>
                  <span className="tnum mt-0.5 block truncate text-xs text-[var(--gm-subtle)]">{exp.specs}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-[var(--gm-subtle)] transition-all group-hover:translate-x-0.5 group-hover:text-ember-strong" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
