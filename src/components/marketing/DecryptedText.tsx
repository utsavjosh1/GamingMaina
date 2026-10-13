"use client";

import React, { useEffect, useRef, useState } from "react";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  className?: string;
  animateOn?: "view" | "hover";
  characters?: string;
}

export function DecryptedText({
  text,
  speed = 40,
  maxIterations = 10,
  className = "",
  animateOn = "view",
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~|}{[]:;?><",
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const isScramblingRef = useRef(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let intervalId: NodeJS.Timeout;
    let iteration = 0;

    const startScramble = () => {
      isScramblingRef.current = true;
      iteration = 0;

      intervalId = setInterval(() => {
        setDisplayText(() =>
          text
            .split("")
            .map((char, index) => {
              if (char === " ") return " ";
              if (index < iteration) return text[index];
              return characters[Math.floor(Math.random() * characters.length)];
            })
            .join("")
        );

        if (iteration >= text.length) {
          isScramblingRef.current = false;
          clearInterval(intervalId);
          setDisplayText(text);
        }

        iteration += 1 / (maxIterations / text.length);
      }, speed);
    };

    if (animateOn === "view") {
      const element = containerRef.current;
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            startScramble();
            observer.disconnect();
          }
        },
        { threshold: 0.2 }
      );

      observer.observe(element);
      return () => {
        clearInterval(intervalId);
        observer.disconnect();
      };
    } else if (animateOn === "hover" && isHovering && !isScramblingRef.current) {
      startScramble();
      return () => clearInterval(intervalId);
    }
  }, [text, speed, maxIterations, animateOn, isHovering, characters]);

  return (
    <span
      ref={containerRef}
      onMouseEnter={() => animateOn === "hover" && setIsHovering(true)}
      onMouseLeave={() => animateOn === "hover" && setIsHovering(false)}
      className={`inline-block font-mono ${className}`}
    >
      {displayText}
    </span>
  );
}
