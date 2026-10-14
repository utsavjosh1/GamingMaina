import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { DynamicButton } from "./ui/DynamicButton";
import { SectionHeading } from "./marketing/SectionHeading";
import { getMediaUrl, mediaPaths } from "@/lib/media";
import { businessInfo, venueBenefits } from "@/lib/public-content";

export function AboutSection() {
  return (
    <section className="gm-section border-t border-white/[0.06]" id="about" aria-labelledby="about-heading">
      <div className="gm-container grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <SectionHeading
            eyebrow="Since 2018"
            title={<span id="about-heading">A real arena, run by people who play.</span>}
            description="Gaming Mania grew from a few PC rigs in Kalkaji into South Delhi's home for ranked grinds, console nights, racing time trials and VR sessions."
          />
          <p className="mt-5 max-w-[60ch] text-[15px] leading-7 text-[var(--gm-muted)]">
            Climb Valorant at 240Hz, run story campaigns on PS5, drift the racing sim, or hang around
            the pool table between matches — the arena is built for how squads actually spend an evening.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <DynamicButton href="/book-online" variant="primary" size="md">
              <span>Reserve a station</span>
              <ArrowRight className="size-4" />
            </DynamicButton>
            <DynamicButton href={businessInfo.mapUrl} variant="secondary" size="md">
              <span>Get directions</span>
            </DynamicButton>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.06]">
            {venueBenefits.slice(0, 4).map((benefit) => (
              <div key={benefit.title} className="bg-[#14100d] p-5">
                <dd className="tnum font-heading text-2xl font-extrabold tracking-tight text-paper">{benefit.stat}</dd>
                <dt className="mt-1 text-[13px] font-semibold text-paper">{benefit.title}</dt>
                <dd className="mt-0.5 text-xs leading-5 text-[var(--gm-muted)]">{benefit.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="relative overflow-hidden rounded-2xl border border-white/[0.09] lg:sticky lg:top-24 lg:self-start">
          <Image
            src={getMediaUrl(mediaPaths.rdr2)}
            alt="Evening session inside the Gaming Mania lounge in Kalkaji"
            width={900}
            height={1000}
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="aspect-[4/4.4] w-full object-cover object-center sm:aspect-[16/12] lg:aspect-[4/4.4]"
          />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-5 pb-4 pt-12 text-sm font-medium text-paper">
            Friday nights at Kalkaji — ranked grinds up front, story mode on the sofas.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
