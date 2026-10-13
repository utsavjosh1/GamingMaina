import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { getMediaUrl, mediaPaths } from "@/lib/media";
import { businessInfo } from "@/lib/public-content";

const stats = [
  { value: "24+", label: "Play units across PC, console, sim & VR" },
  { value: "<5ms", label: "Ping to Mumbai servers on dual fiber lines" },
  { value: "2018", label: "Serving South Delhi squads since" },
  { value: "10–11", label: "Open every day, 10 AM to 11 PM" },
];

export function VenueBentoGrid() {
  return (
    <section className="gm-section border-t border-white/[0.06] bg-coal-soft" id="why-us" aria-labelledby="bento-heading">
      <div className="gm-container">
        <SectionHeading
          eyebrow="Why Gaming Mania"
          title={<span id="bento-heading">Built around what players actually care about.</span>}
          description="Frame rates, comfort, honest pricing, zero friction. The rest is decoration — we skipped it."
        />

        <dl className="mt-10 grid grid-cols-2 border-l border-t border-white/[0.08] lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border-b border-r border-white/[0.08] p-5 sm:p-6">
              <dt className="order-2 mt-2 block text-[13px] leading-5 text-[var(--gm-muted)]">{stat.label}</dt>
              <dd className="tnum order-1 font-heading text-3xl font-extrabold tracking-tight text-paper sm:text-4xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <figure className="relative overflow-hidden rounded-2xl border border-white/[0.09]">
            <Image
              src={getMediaUrl(mediaPaths.spiderman)}
              alt="Rows of high-performance stations at Gaming Mania Kalkaji"
              width={900}
              height={560}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="aspect-[16/10] w-full object-cover object-center"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-5 pb-4 pt-12 text-sm font-medium text-paper">
              Tournament-grade rigs, ergonomic seating, calibrated light — engineered for long sessions.
            </figcaption>
          </figure>
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.09] bg-ember p-6 text-ember-ink sm:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]">Squad nights</p>
              <h3 className="ops-heading mt-2 font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
                Bring four friends. We seat you side by side.
              </h3>
              <ul className="mt-4 space-y-2 text-sm font-medium">
                <li>5v5 LAN setups for scrims and customs</li>
                <li>Multi-controller sofas for EA FC & Tekken</li>
                <li>Pool and air hockey between matches</li>
              </ul>
            </div>
            <Link
              href="/book-online"
              className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-ember-ink px-6 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
            >
              Book squad slots
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <p className="mt-6 text-[13px] text-[var(--gm-muted)]">
          {businessInfo.address} · {businessInfo.hours} · Pay at the counter with UPI, cash or card.
        </p>
      </div>
    </section>
  );
}
