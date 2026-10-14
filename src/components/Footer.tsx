import Link from "next/link";
import { ArrowUpRight, Clock, MapPin } from "lucide-react";
import { businessInfo } from "@/lib/public-content";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-coal-soft">
      <div className="gm-container py-14">
        <Link href="/book-online" className="group block" aria-label="Book a station at Gaming Mania">
          <p className="ops-heading font-heading text-[clamp(2rem,6vw,4.25rem)] font-extrabold leading-[1.02] tracking-tight text-paper">
            Delhi plays here<span className="text-ember">.</span>
            <ArrowUpRight className="ml-3 inline size-[0.7em] text-[var(--gm-subtle)] transition-all group-hover:translate-x-1 group-hover:text-ember-strong" aria-hidden="true" />
          </p>
        </Link>

        <div className="mt-10 grid gap-8 border-t border-white/[0.08] pt-8 md:grid-cols-[1fr_auto_auto]">
          <div className="max-w-sm">
            <p className="text-sm font-semibold text-paper">Gaming Mania · Kalkaji</p>
            <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-6 text-[var(--gm-muted)]">
              <MapPin className="mt-1 size-3.5 shrink-0" aria-hidden="true" />
              {businessInfo.address}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[var(--gm-muted)]">
              <Clock className="size-3.5 shrink-0" aria-hidden="true" />
              Open daily · {businessInfo.hours}
            </p>
          </div>
          <nav aria-label="Explore">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[var(--gm-muted)]">
              <li><Link href="/games" className="hover:text-paper">Games</Link></li>
              <li><Link href="/tournaments" className="hover:text-paper">Tournaments</Link></li>
              <li><Link href="/#stations" className="hover:text-paper">Stations</Link></li>
              <li><Link href="/#pricing" className="hover:text-paper">Pricing</Link></li>
              <li><Link href="/about" className="hover:text-paper">About</Link></li>
            </ul>
          </nav>
          <nav aria-label="Player">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[var(--gm-muted)]">
              <li><Link href="/book-online" className="text-paper hover:text-ember-strong">Book a station</Link></li>
              <li><Link href="/dashboard" className="hover:text-paper">My bookings</Link></li>
              <li><Link href="/contact-us" className="hover:text-paper">Contact</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/[0.08] pt-6 text-[13px] text-[var(--gm-subtle)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Gaming Mania Delhi. All rights reserved.</p>
          <p className="tnum">B-95 Kalkaji · South Delhi</p>
        </div>
      </div>
    </footer>
  );
}
