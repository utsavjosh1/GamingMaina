import type React from "react";
import { cn } from "@/lib/utils";

/* Shared operations primitives — one voice for every admin surface.
   Hallmark pre-emit critique: P5 H5 E5 S5 R5 V5 */

export function OpsPageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string;
  description?: string;
  meta?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {meta ? (
          <p className="text-xs font-medium text-[var(--erp-subtle)]">{meta}</p>
        ) : null}
        <h1 className="ops-heading mt-1 max-w-[28ch] text-2xl font-semibold tracking-tight text-white lg:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-[65ch] text-sm leading-6 text-[var(--erp-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function OpsButton({
  children,
  onClick,
  href,
  variant = "secondary",
  disabled,
  type = "button",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  const styles = cn(
    "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border px-4 text-sm font-semibold transition",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff8a52]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-paper text-ink hover:bg-white",
    variant === "secondary" &&
      "border-white/[0.08] bg-white/[0.04] text-slate-100 hover:bg-white/[0.07]",
    variant === "danger" &&
      "border-red-400/25 bg-red-500/10 text-red-200 hover:bg-red-500/15",
    variant === "success" &&
      "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
    variant === "ghost" && "border-transparent text-slate-300 hover:bg-white/[0.06]",
  );
  if (href) {
    return (
      <a href={href} aria-label={ariaLabel} className={styles}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={styles}
    >
      {children}
    </button>
  );
}

export function OpsPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("ops-surface rounded-[14px] p-4 lg:p-5", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-white">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-[13px] leading-5 text-[var(--erp-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function OpsEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-white/[0.12] bg-black/20 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="mx-auto mt-1 max-w-[42ch] text-[13px] leading-5 text-[var(--erp-muted)]">
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function OpsAlert({
  tone,
  title,
  children,
}: {
  tone: "error" | "success" | "info";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[12px] border p-4 text-sm leading-6",
        tone === "error" &&
          "border-red-400/25 bg-red-500/[0.08] text-red-100",
        tone === "success" &&
          "border-emerald-400/25 bg-emerald-500/[0.08] text-emerald-100",
        tone === "info" && "border-white/[0.1] bg-white/[0.03] text-slate-200",
      )}
    >
      <strong className="font-semibold">{title} </strong>
      {children}
    </div>
  );
}
