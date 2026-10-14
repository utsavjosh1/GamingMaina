import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { getMediaUrl, mediaPaths } from "@/lib/media";

const facts = [
  { label: "PC arena", value: "RTX rigs · 240Hz" },
  { label: "Console lounge", value: "PS5 · 4K 120fps" },
  { label: "Sim rig", value: "Force-feedback wheel" },
  { label: "Since", value: "2018 · Kalkaji" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-14 pt-28 lg:pb-20 lg:pt-36">
      <div className="gm-container grid items-end gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-[var(--gm-muted)]">
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Open today · 10 AM – 11 PM
            </span>
            <span className="text-[var(--gm-subtle)]">B-95 Kalkaji, South Delhi</span>
          </p>

          <h1 className="ops-heading mt-4 font-heading text-[clamp(2.75rem,7vw,5.5rem)] font-extrabold leading-[0.95] tracking-tight text-paper">
            Delhi plays here<span className="text-ember">.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--gm-muted)] sm:text-lg sm:leading-8">
            High-frame-rate PC stations, PS5 lounges, racing sims and VR under one roof in Kalkaji.
            Reserve online, walk in, pay at the counter.
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/book-online"
              className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-paper px-7 text-[15px] font-semibold text-ink transition-colors hover:bg-white"
            >
              Book a station
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/#stations"
              className="inline-flex min-h-[3.25rem] items-center justify-center whitespace-nowrap rounded-xl border border-white/[0.14] px-7 text-[15px] font-semibold text-paper transition-colors hover:border-white/30 hover:bg-white/[0.04]"
            >
              See stations & rates
            </Link>
          </div>

          <dl className="mt-10 grid grid-cols-2 border-t border-white/[0.08] sm:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="border-b border-white/[0.08] py-3 pr-4 sm:border-b-0">
                <dt className="text-xs text-[var(--gm-subtle)]">{fact.label}</dt>
                <dd className="tnum mt-0.5 text-sm font-semibold text-paper">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div className="grid grid-cols-5 gap-2.5">
            <figure className="relative col-span-3 overflow-hidden rounded-2xl border border-white/[0.09]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMediaUrl(mediaPaths.spiderman)}
                alt="Player session at Gaming Mania Delhi"
                width={800}
                height={880}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="aspect-[4/4.4] w-full object-cover object-center"
              />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3.5 pt-10">
                <span className="text-[13px] font-semibold text-paper">PC-RTX arena · 240Hz</span>
                <span className="tnum rounded-md bg-paper px-2 py-1 text-xs font-bold text-ink">₹150/hr</span>
              </figcaption>
            </figure>
            <div className="col-span-2 grid grid-rows-2 gap-2.5">
              <figure className="relative overflow-hidden rounded-2xl border border-white/[0.09]">
                <Image
                  src={getMediaUrl(mediaPaths.bmw)}
                  alt="Force-feedback racing simulator"
                  width={400}
                  height={420}
                  sizes="(max-width: 1024px) 30vw, 20vw"
                  className="aspect-[4/3.4] w-full object-cover object-center"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-8 text-[13px] font-semibold text-paper">
                  Racing sim
                </figcaption>
              </figure>
              <figure className="relative overflow-hidden rounded-2xl border border-white/[0.09]">
                <Image
                  src={getMediaUrl(mediaPaths.gow)}
                  alt="PlayStation 5 story titles"
                  width={400}
                  height={420}
                  sizes="(max-width: 1024px) 30vw, 20vw"
                  className="aspect-[4/3.4] w-full object-cover object-center"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-8 text-[13px] font-semibold text-paper">
                  PS5 lounge
                </figcaption>
              </figure>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-[var(--gm-muted)]">
            <MapPin className="size-3.5 text-ember" aria-hidden="true" />
            Two minutes from Kalkaji Mandir metro — squads walk in daily.
          </p>
        </div>
      </div>
    </section>
  );
}
