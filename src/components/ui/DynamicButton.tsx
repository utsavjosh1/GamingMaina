import Link from "next/link";
import React from "react";

interface DynamicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  glow?: boolean;
  /** When provided, render a real link instead of nesting a button in one. */
  href?: string;
}

export function DynamicButton({
  children,
  variant = "primary",
  glow = true,
  className = "",
  href,
  ...props
}: DynamicButtonProps) {
  const baseStyle =
    "relative overflow-hidden inline-flex items-center justify-center px-8 py-3 md:px-10 md:py-4 font-heading font-black tracking-widest uppercase transition-all duration-300 ease-out cursor-pointer group";
  const clipStyle =
    "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)";
  const colors = variant === "primary"
    ? "bg-brand text-white hover:bg-[#6c42c2] shadow-[0_0_20px_rgba(136,88,237,0.3)] hover:shadow-[0_0_30px_rgba(136,88,237,0.6)]"
    : "bg-stealth text-white hover:bg-[#1a212b] border border-zinc-700 hover:border-brand/50";
  const controlClass = `w-full h-full ${baseStyle} ${colors}`;
  const content = (
    <>
      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]" />
      <span className="relative z-10 flex items-center gap-2 group-hover:animate-glow-sway">{children}</span>
    </>
  );

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ filter: glow ? `drop-shadow(0 0 15px rgba(${variant === "primary" ? "136,88,237" : "200,200,200"}, 0.4))` : "none" }}
    >
      {href ? (
        <Link href={href} className={controlClass} style={{ clipPath: clipStyle }}>
          {content}
        </Link>
      ) : (
        <button className={controlClass} style={{ clipPath: clipStyle }} {...props}>
          {content}
        </button>
      )}
      <div className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 ${variant === "primary" ? "border-brand" : "border-zinc-500"} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 ${variant === "primary" ? "border-brand" : "border-zinc-500"} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </div>
  );
}
