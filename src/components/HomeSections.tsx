import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock, MapPin, Star } from "lucide-react";
import { DynamicButton } from "./ui/DynamicButton";
import { GamingBadge, SectionHeading } from "./marketing/SectionHeading";
import { getMediaUrl, mediaPaths } from "@/lib/media";
import { businessInfo, faqs } from "@/lib/public-content";
import type { PublicStationType } from "./Services";

function formatPrice(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const passes = [
  {
    title: "5-hour pro pass",
    for: "PC-RTX battle stations",
    price: "₹650",
    was: "₹750",
    note: "5 consecutive hours · priority seat",
    featured: true,
  },
  {
    title: "Weekday happy hours",
    for: "All PC & console stations",
    price: "20% off",
    was: "Standard rate",
    note: "Mon–Thu · 11 AM – 4 PM",
    featured: false,
  },
];

export function PricingSnapshot({ stationTypes }: { stationTypes: PublicStationType[] }) {
  const rows = stationTypes.slice(0, 6);

  return (
    <section className="gm-section border-t border-white/[0.06] bg-coal-soft" id="pricing" aria-labelledby="pricing-heading">
      <div className="gm-container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeading
            eyebrow="Rates"
            title={<span id="pricing-heading">One rate card. No fine print.</span>}
            description="Pay per hour or grab a pass. Reserve online, settle at the counter with UPI, cash or card — happy-hour and pass discounts apply automatically."
          />
          <ul className="mt-6 space-y-2.5 text-sm text-[var(--gm-muted)]">
            {["15-minute grace on every reservation", "No advance payment — pay when you arrive", "Student & squad deals on weekdays"].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
          <DynamicButton href="/book-online" variant="primary" size="md" className="mt-7">
            <span>Reserve your station</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </DynamicButton>
        </div>

        <div>
          <div className="overflow-hidden rounded-2xl border border-white/[0.09]">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Hourly station rates</caption>
              <tbody className="divide-y divide-white/[0.07]">
                {rows.map((station) => (
                  <tr key={station.id ?? station.name} className="bg-[#14100d] transition-colors hover:bg-[#1a1411]">
                    <td className="px-5 py-4">
                      <p className="font-heading text-base font-bold text-paper">{station.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--gm-muted)]">{station.category}</p>
                    </td>
                    <td className="tnum whitespace-nowrap px-5 py-4 text-right font-heading text-lg font-extrabold text-paper">
                      {formatPrice(station.base_price_per_hour)}
                      <span className="block text-xs font-normal text-[var(--gm-subtle)]">per hour</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {passes.map((pass) => (
              <div
                key={pass.title}
                className={
                  pass.featured
                    ? "rounded-2xl bg-ember p-5 text-ember-ink"
                    : "rounded-2xl border border-white/[0.09] bg-[#14100d] p-5"
                }
              >
                <p className={pass.featured ? "text-xs font-bold uppercase tracking-[0.14em]" : "text-xs font-semibold uppercase tracking-[0.14em] text-ember-strong"}>
                  {pass.for}
                </p>
                <h3 className="ops-heading mt-1.5 font-heading text-xl font-extrabold tracking-tight">
                  {pass.title}
                </h3>
                <p className="tnum mt-3 font-heading text-3xl font-extrabold tracking-tight">
                  {pass.price}
                  <span className="ml-2 align-middle text-sm font-medium line-through opacity-60">{pass.was}</span>
                </p>
                <p className={pass.featured ? "mt-1 text-[13px] font-medium" : "mt-1 text-[13px] text-[var(--gm-muted)]"}>
                  {pass.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function VenueGallery() {
  const galleryImages = [
    { title: "PC battle-station arena", category: "240Hz competitive", image: mediaPaths.spiderman, wide: true },
    { title: "PlayStation 5 lounge", category: "4K 120fps HDR", image: mediaPaths.gow, wide: false },
    { title: "Racing cockpit", category: "Force feedback", image: mediaPaths.bmw, wide: false },
    { title: "Squad lounge", category: "Co-op & groups", image: mediaPaths.rdr2, wide: true },
    { title: "Arcade corner", category: "Party rounds", image: mediaPaths.gta5, wide: false },
  ];

  return (
    <section className="gm-section border-t border-white/[0.06]" id="gallery" aria-labelledby="gallery-heading">
      <div className="gm-container">
        <SectionHeading
          eyebrow="Inside the arena"
          title={<span id="gallery-heading">Take a look around Kalkaji.</span>}
          description="Calibrated light, ergonomic seating, dedicated fiber, room to breathe — set up for long sessions."
        />

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {galleryImages.map((item) => (
            <figure
              key={item.title}
              className={`relative overflow-hidden rounded-2xl border border-white/[0.09] ${item.wide ? "sm:col-span-2" : ""}`}
            >
              <Image
                src={getMediaUrl(item.image)}
                alt={item.title}
                width={item.wide ? 800 : 400}
                height={500}
                sizes={item.wide ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 25vw"}
                className="aspect-[4/3] w-full object-cover object-center"
              />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-3 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-10">
                <span className="truncate text-sm font-semibold text-paper">{item.title}</span>
                <span className="shrink-0 text-xs text-stone-400">{item.category}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ReviewsSection() {
  const reviews = [
    {
      quote: "300+ FPS on Valorant, 4–6ms ping to Mumbai, clean peripherals. Best cafe setup in South Delhi, no contest.",
      author: "Aarav Sharma",
      detail: "180+ hours · Valorant & CS2",
    },
    {
      quote: "Every weekend: FIFA and Tekken on the PS5 sofas. Staff set up controllers fast, booking online means zero waiting.",
      author: "Rohan & squad",
      detail: "50+ hours · EA FC & Tekken 8",
    },
    {
      quote: "The racing wheel is unmatched — real resistance through corners. Time trials with friends are insanely fun.",
      author: "Vikram Malhotra",
      detail: "35+ hours · Forza & F1",
    },
  ];

  return (
    <section className="gm-section border-t border-white/[0.06] bg-coal-soft" aria-labelledby="reviews-heading">
      <div className="gm-container">
        <SectionHeading
          eyebrow="Player reviews"
          title={<span id="reviews-heading">Regulars, in their words.</span>}
        />

        <div className="mt-10 divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {reviews.map((rev) => (
            <blockquote key={rev.author} className="grid gap-3 py-7 lg:grid-cols-[1fr_240px] lg:gap-8">
              <p className="ops-heading max-w-[52ch] font-heading text-xl font-medium leading-snug tracking-tight text-paper sm:text-2xl">
                “{rev.quote}”
              </p>
              <footer className="flex items-center gap-1.5 lg:justify-end">
                <span className="flex text-ember" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-ember" aria-hidden="true" />
                  ))}
                </span>
                <span className="ml-2 text-sm">
                  <span className="block font-semibold text-paper">{rev.author}</span>
                  <span className="block text-xs text-[var(--gm-muted)]">{rev.detail}</span>
                </span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LocationAndFaq() {
  return (
    <section className="gm-section border-t border-white/[0.06]" id="location" aria-labelledby="location-heading">
      <div className="gm-container">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <SectionHeading
              eyebrow="Find us"
              title={<span id="location-heading">B-95 Kalkaji, South Delhi.</span>}
              description="Near Kalkaji Mandir metro. Reserve online before you travel — your rig waits, no queue."
            />
            <dl className="mt-8 space-y-3">
              <div className="flex gap-3.5 rounded-2xl border border-white/[0.09] bg-[#14100d] p-5">
                <MapPin className="mt-0.5 size-5 shrink-0 text-ember" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Address</dt>
                  <dd className="text-[15px] font-semibold text-paper">{businessInfo.address}</dd>
                  <dd className="mt-0.5 text-[13px] text-[var(--gm-muted)]">Near Kalkaji Metro · {businessInfo.landmark}</dd>
                </div>
              </div>
              <div className="flex gap-3.5 rounded-2xl border border-white/[0.09] bg-[#14100d] p-5">
                <Clock className="mt-0.5 size-5 shrink-0 text-ember" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Hours</dt>
                  <dd className="text-[15px] font-semibold text-paper">Open daily · {businessInfo.hours}</dd>
                  <dd className="mt-0.5 text-[13px] text-[var(--gm-muted)]">Slots run on Delhi local time (IST)</dd>
                </div>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <DynamicButton href={businessInfo.mapUrl} variant="primary" size="md">
                <MapPin className="size-4" />
                <span>Get directions</span>
              </DynamicButton>
              <DynamicButton href="/contact-us" variant="secondary" size="md">
                <span>Contact details</span>
              </DynamicButton>
            </div>
          </div>

          <div>
            <h2 className="font-heading text-xl font-bold tracking-tight text-paper">Good to know</h2>
            <div className="mt-4 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-paper marker:hidden [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-white/[0.12] text-lg font-normal leading-none text-[var(--gm-muted)] transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 max-w-[58ch] text-sm leading-6 text-[var(--gm-muted)]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl bg-ember px-6 py-10 text-ember-ink sm:px-12 sm:py-14">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em]">Weekends fill up</p>
              <h2 className="ops-heading mt-2 font-heading text-3xl font-extrabold tracking-tight sm:text-5xl">
                Lock in your setup. Bring the squad.
              </h2>
              <p className="mt-3 max-w-xl text-[15px] font-medium leading-7">
                PC-RTX, PS5 lounges, racing sims — reserve in under a minute, pay at the counter when you arrive.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col">
              <Link
                href="/book-online"
                className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-ember-ink px-8 text-[15px] font-semibold text-paper transition-opacity hover:opacity-90"
              >
                Book a station
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <p className="tnum text-center text-[13px] font-semibold lg:text-left">From ₹100/hr · UPI, cash & cards</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <GamingBadge tone="green" dot>Open daily</GamingBadge>
          <span className="text-[13px] text-[var(--gm-muted)]">Live availability on the booking page</span>
        </div>
      </div>
    </section>
  );
}
