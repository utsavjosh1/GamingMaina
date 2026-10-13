"use client";

import React from "react";
import { getOperationalAlerts, getReports, type ReportPayload, type ReportPeriod } from "./actions";
import { OpsAlert, OpsPanel } from "@/components/ui/OpsPrimitives";
import { cn } from "@/lib/utils";

const PERIODS: Array<{ id: ReportPeriod; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "month", label: "Month" },
];

type Alert = Awaited<ReturnType<typeof getOperationalAlerts>>[number];

function formatPaise(paise: number) {
  const sign = paise < 0 ? "−" : "";
  return `${sign}₹${(Math.abs(paise) / 100).toLocaleString("en-IN")}`;
}

function Bars({ points, getValue, format }: { points: ReportPayload["byDay"]; getValue: (p: ReportPayload["byDay"][number]) => number; format: (v: number) => string }) {
  const max = Math.max(1, ...points.map(getValue));
  return (
    <div className="flex h-28 items-end gap-1" role="img" aria-label="Daily bars">
      {points.map((p) => {
        const v = getValue(p);
        return (
          <div key={p.date} title={`${p.date}: ${format(v)}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end">
              <div
                className={cn("w-full rounded-t-[4px]", v > 0 ? "bg-ember/80" : "bg-white/10")}
                style={{ height: `${Math.max(4, Math.round((v / max) * 100))}%` }}
              />
            </div>
            <span className="tnum text-[10px] text-[var(--erp-subtle)]">{p.date.slice(8)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ReportsClient({ initial, initialAlerts }: { initial: ReportPayload; initialAlerts: Alert[] }) {
  const [report, setReport] = React.useState(initial);
  const [alerts, setAlerts] = React.useState(initialAlerts);
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const [period, setPeriod] = React.useState<ReportPeriod>(initial.period);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (next: ReportPeriod) => {
    setPeriod(next);
    setLoading(true);
    setError(null);
    try {
      const [fresh, freshAlerts] = await Promise.all([getReports(next), getOperationalAlerts()]);
      setReport(fresh);
      setAlerts(freshAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));
  const topStations = report.utilization.slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] text-[var(--erp-muted)]">Reports · {report.from} → {report.to}</p>
          <h1 className="ops-heading mt-1 text-2xl font-semibold tracking-tight text-white">Reports</h1>
        </div>
        <div className="flex gap-1 rounded-[10px] border border-white/10 bg-black/30 p-1" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              onClick={() => void load(p.id)}
              disabled={loading}
              className={cn(
                "rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium transition disabled:opacity-50",
                period === p.id ? "bg-ember text-white" : "text-[var(--erp-muted)] hover:text-white",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <OpsAlert tone="error" title="Reports unavailable.">{error}</OpsAlert>}

      {visibleAlerts.map((a) => (
        <OpsAlert key={a.id} tone={a.tone === "warn" ? "error" : "info"} title={a.tone === "warn" ? "Attention" : "Heads up"}>
          <span className="flex items-center justify-between gap-3">
            <span>{a.text}</span>
            <button
              type="button"
              onClick={() => setDismissed((prev) => new Set(prev).add(a.id))}
              className="shrink-0 text-[13px] underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </span>
        </OpsAlert>
      ))}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Revenue", value: formatPaise(report.revenue.total), sub: `${report.revenue.count} payments` },
          { label: "Misc income", value: formatPaise(report.income.total), sub: Object.keys(report.income.byCategory).length + " categories" },
          { label: "Expenses", value: formatPaise(report.expenses.total), sub: Object.keys(report.expenses.byCategory).length + " categories" },
          { label: "Net", value: formatPaise(report.net), sub: "revenue + income − expenses" },
        ].map((card) => (
          <div key={card.label} className="rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-[13px] text-[var(--erp-muted)]">{card.label}</p>
            <p className="tnum mt-1 text-xl font-bold text-white">{card.value}</p>
            <p className="mt-0.5 text-xs text-[var(--erp-subtle)]">{card.sub}</p>
          </div>
        ))}
      </div>

      <OpsPanel title="Daily revenue" description="Paid payments per Delhi day.">
        {report.byDay.every((d) => d.revenue === 0) ? (
          <p className="text-sm text-[var(--erp-subtle)]">No revenue in this period.</p>
        ) : (
          <Bars points={report.byDay} getValue={(d) => d.revenue} format={(v) => formatPaise(v)} />
        )}
      </OpsPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpsPanel title="Occupancy" description="Sessions and floor minutes per day.">
          <Bars points={report.byDay} getValue={(d) => d.minutes} format={(v) => `${v} min`} />
          <ul className="tnum mt-3 space-y-1 text-[13px] text-[var(--erp-muted)]">
            {report.byDay.slice(-7).map((d) => (
              <li key={d.date} className="flex justify-between">
                <span>{d.date}</span>
                <span>{d.sessions} sessions · {d.minutes} min · {d.bookings} bookings</span>
              </li>
            ))}
          </ul>
        </OpsPanel>
        <OpsPanel title="Station utilization" description="Billable minutes vs 13 open hours/day.">
          {topStations.length === 0 ? (
            <p className="text-sm text-[var(--erp-subtle)]">No stations.</p>
          ) : (
            <ul className="space-y-2.5">
              {topStations.map((s) => (
                <li key={s.stationId}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="font-medium text-white">{s.name}</span>
                    <span className="tnum text-[var(--erp-muted)]">{Math.round(s.utilization * 100)}% · {s.minutes} min</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-ember/80" style={{ width: `${Math.round(s.utilization * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </OpsPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          { title: "Revenue by method", rows: report.revenue.byMethod },
          { title: "Expenses by category", rows: report.expenses.byCategory },
          { title: "Income by category", rows: report.income.byCategory },
        ].map((table) => (
          <OpsPanel key={table.title} title={table.title} description="This period.">
            {Object.keys(table.rows).length === 0 ? (
              <p className="text-sm text-[var(--erp-subtle)]">Nothing recorded.</p>
            ) : (
              <ul className="tnum space-y-1.5 text-[13px]">
                {Object.entries(table.rows).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="text-[var(--erp-muted)]">{k.replace(/_/g, " ")}</span>
                    <span className="font-medium text-white">{formatPaise(v)}</span>
                  </li>
                ))}
              </ul>
            )}
          </OpsPanel>
        ))}
      </div>
    </div>
  );
}
