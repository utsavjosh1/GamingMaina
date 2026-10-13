import Link from "next/link";
import React from "react";
import { cn } from "@/lib/utils";

interface DynamicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "cyan" | "outline" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  beam?: boolean;
  cutCorners?: boolean;
  /** When provided, render a real link instead of a button */
  href?: string;
}

/* Ticket buttons: paper for the one primary action, hairlines for the rest.
   Legacy props (glow/beam/cutCorners/cyan) are accepted and mapped so every
   caller keeps compiling; they no longer change the rendering. */
export function DynamicButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  href,
  disabled,
  ...props
}: DynamicButtonProps) {
  const sizeStyles = {
    sm: "min-h-9 px-4 py-2 text-[13px]",
    md: "min-h-11 px-6 py-3 text-sm",
    lg: "min-h-[3.25rem] px-8 py-3.5 text-[15px]",
  };

  const variantStyles = {
    primary: "bg-paper text-ink hover:bg-white",
    secondary:
      "border border-white/[0.14] bg-transparent text-paper hover:border-white/30 hover:bg-white/[0.05]",
    cyan: "bg-ember text-ember-ink hover:bg-ember-strong",
    outline:
      "border border-white/[0.14] bg-transparent text-stone-300 hover:border-white/30 hover:text-paper",
    danger:
      "border border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/15",
    accent: "bg-ember text-ember-ink hover:bg-ember-strong",
  };

  const baseStyle = cn(
    "inline-flex w-full cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-center font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 sm:w-auto",
    sizeStyles[size],
    variantStyles[variant],
  );

  if (href) {
    return (
      <Link href={href} className={cn(baseStyle, className)}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cn(baseStyle, className)} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
