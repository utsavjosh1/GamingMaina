import React from "react";

export function PremiumCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative group backdrop-blur-md bg-obsidian/80 border border-zinc-800 p-6 md:p-8 transition-all duration-500 hover:border-brand/40 hover:-translate-y-2 hover:shadow-[0_10px_40px_-15px_rgba(136,88,237,0.3)] ${className}`}
    >
      {/* Animated glowing border top/bottom using CSS before/after */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-sm overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full h-[2px] bg-linear-to-r from-transparent via-brand to-transparent animate-shimmer"
          style={{ backgroundSize: "200% 100%" }}
        ></div>
        <div
          className="absolute bottom-0 right-0 w-full h-[2px] bg-linear-to-r from-transparent via-brand to-transparent animate-shimmer"
          style={{ backgroundSize: "200% 100%" }}
        ></div>
      </div>

      {/* Modern bright accent line */}
      <div className="absolute top-0 right-0 w-12 h-12 pointer-events-none overflow-hidden">
        <div className="absolute top-[-24px] right-[-24px] w-[48px] h-[48px] bg-brand transform rotate-45 translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500 opacity-90 blur-[2px]"></div>
      </div>

      <div className="relative z-10 transition-transform duration-500 group-hover:scale-[1.02]">
        {children}
      </div>
    </div>
  );
}
