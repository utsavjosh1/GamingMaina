import { ArrowRight, Clock, MapPin, Wallet } from "lucide-react";
import { DynamicButton } from "@/components/ui/DynamicButton";
import { businessInfo } from "@/lib/public-content";

export const metadata = {
  title: "Contact & Location | Gaming Mania Delhi (Kalkaji)",
  description: "Find Gaming Mania in Kalkaji, New Delhi. View operating hours, directions, and reserve stations online.",
};

const cards = [
  {
    icon: MapPin,
    title: "Getting here",
    lines: [businessInfo.address, "Near Kalkaji Mandir metro · South Delhi"],
  },
  {
    icon: Clock,
    title: "Hours",
    lines: [`Open daily · ${businessInfo.hours}`, "Delhi local time (IST), all 7 days"],
  },
  {
    icon: Wallet,
    title: "Paying",
    lines: ["UPI, cash & cards at the counter", "No advance payment · 15-min hold"],
  },
];

export default function ContactPage() {
  return (
    <div className="pb-20 pt-24 lg:pt-28">
      <div className="gm-container max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ember">Visit us</p>
        <h1 className="ops-heading mt-3 max-w-[20ch] font-heading text-4xl font-extrabold tracking-tight text-paper sm:text-6xl">
          Come down to Kalkaji.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--gm-muted)] sm:text-base">
          Reserve online before you travel and your rig is waiting — no queue, no guesswork.
        </p>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {cards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-white/[0.09] bg-[#14100d] p-6">
              <card.icon className="size-5 text-ember" aria-hidden="true" />
              <h2 className="mt-4 font-heading text-lg font-bold tracking-tight text-paper">{card.title}</h2>
              {card.lines.map((line) => (
                <p key={line} className="mt-1.5 text-sm leading-6 text-[var(--gm-muted)]">{line}</p>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-ember p-6 text-ember-ink sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="ops-heading font-heading text-2xl font-extrabold tracking-tight">
                Book first, travel second.
              </h2>
              <p className="mt-1 text-sm font-medium">Your station is held for 15 minutes past start time.</p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <DynamicButton href="/book-online" variant="accent" size="md" className="!bg-ember-ink !text-paper">
                <span>Reserve a station</span>
                <ArrowRight className="size-4" />
              </DynamicButton>
              <DynamicButton href={businessInfo.mapUrl} variant="secondary" size="md" className="!border-ember-ink/25 !text-ember-ink">
                <MapPin className="size-4" />
                <span>Google Maps</span>
              </DynamicButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
