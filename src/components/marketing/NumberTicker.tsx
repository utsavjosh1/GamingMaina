"use client";

import React, { useEffect, useRef, useState } from "react";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className = "",
  prefix = "",
  suffix = "",
}: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(direction === "up" ? 0 : value);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let startTimestamp: number | null = null;
    let animationFrameId: number;
    let isVisible = false;

    const duration = 1800; // ms
    const startVal = direction === "up" ? 0 : value;
    const endVal = direction === "up" ? value : 0;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;

      if (elapsed < delay) {
        animationFrameId = requestAnimationFrame(step);
        return;
      }

      const progress = Math.min((elapsed - delay) / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * ease);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isVisible) {
          isVisible = true;
          animationFrameId = requestAnimationFrame(step);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, [value, direction, delay]);

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums tracking-tight ${className}`}
      aria-label={`${prefix}${value}${suffix}`}
    >
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}
