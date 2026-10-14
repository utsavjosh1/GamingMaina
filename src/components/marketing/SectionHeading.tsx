import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
  badge?: React.ReactNode;
  decryptEyebrow?: boolean;
}

/* Section heads speak plainly: small caps label, sentence-case head.
   No gradient text, no scramble effects — the heading carries its own weight. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  badge,
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <p className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ember", align === "center" && "justify-center")}>
        <span className="inline-block h-px w-6 bg-ember" aria-hidden="true" />
        {eyebrow}
        {badge}
      </p>
      <h2 className="ops-heading mt-3 font-heading text-3xl font-bold tracking-tight text-paper sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-[62ch] text-[15px] leading-7 text-[var(--gm-muted)]">{description}</p>
      ) : null}
    </div>
  );
}

export function GamingBadge({
  children,
  tone = "neutral",
  dot = false,
  className = "",
}: {
  children: React.ReactNode;
  tone?: "violet" | "cyan" | "green" | "amber" | "rose" | "neutral" | "accent" | "paper";
  dot?: boolean;
  className?: string;
}) {
  const tones: Record<string, string> = {
    /* legacy tones remapped into the one-accent world */
    violet: "border-ember/30 bg-ember/10 text-ember-strong",
    cyan: "border-white/10 bg-white/[0.05] text-stone-300",
    green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    rose: "border-red-400/25 bg-red-400/10 text-red-300",
    neutral: "border-white/10 bg-white/[0.05] text-stone-300",
    accent: "border-ember/30 bg-ember/10 text-ember-strong",
    paper: "border-paper/25 bg-paper text-ink",
  };

  const dots: Record<string, string> = {
    violet: "bg-ember",
    cyan: "bg-stone-400",
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-red-400",
    neutral: "bg-stone-400",
    accent: "bg-ember",
    paper: "bg-ink",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        tones[tone] ?? tones.neutral,
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone] ?? dots.neutral)} aria-hidden="true" />}
      {children}
    </span>
  );
}
