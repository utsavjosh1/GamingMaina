import React from "react";
import { cn } from "@/lib/utils";

interface GamingSpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
  bracketCorners?: boolean;
}

/* Flat ink panel. Legacy spotlight/beam props are accepted so callers keep
   compiling, but the card no longer chases the pointer or glows. */
export function GamingSpotlightCard({
  children,
  className,
  ...props
}: GamingSpotlightCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#14100d] transition-colors duration-200 hover:border-white/[0.18]",
        className,
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
