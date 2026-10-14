import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
}) {
  const dot = {
    default: "bg-slate-500",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-red-400",
    primary: "bg-ember",
  }[tone];

  const valueColor = {
    default: "text-white",
    success: "text-emerald-300",
    warning: "text-amber-300",
    danger: "text-red-300",
    primary: "text-white",
  }[tone];

  return (
    <section className="ops-surface rounded-[12px] p-4">
      <div className="flex items-center gap-2">
        <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
        <p className="truncate text-[13px] font-medium text-[var(--erp-muted)]">{label}</p>
      </div>
      <p className={cn("tnum mt-2 truncate text-[1.65rem] font-semibold leading-none tracking-tight", valueColor)}>
        {value}
      </p>
      {helper ? (
        <p className="mt-1.5 truncate text-xs text-[var(--erp-subtle)]">{helper}</p>
      ) : null}
    </section>
  );
}
