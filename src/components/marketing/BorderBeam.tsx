"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 8,
  borderWidth = 1.5,
  colorFrom = "#8b5cf6",
  colorTo = "#06b6d4",
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      style={
        {
          "--size": `${size}px`,
          "--duration": `${duration}s`,
          "--border-width": `${borderWidth}px`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": `-${delay}s`,
        } as React.CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width))_solid_transparent]",
        // Mask styles
        "![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
        // Pseudo-element animation
        "after:absolute after:aspect-square after:w-[calc(var(--size))] after:animate-[border-beam_var(--duration)_infinite_linear_var(--delay)] after:[animation-play-state:running]",
        "after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--size)/2)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)))]",
        className
      )}
    />
  );
}
