"use client";

import React from "react";
import {
  changeCustomerTier,
  getCustomerDirectory,
  getCustomerHistory,
  type CustomerEntry,
  type CustomerHistory,
} from "./actions";
import { OpsAlert, OpsEmpty, OpsPanel } from "@/components/ui/OpsPrimitives";
import { cn } from "@/lib/utils";

const TIERS = ["none", "silver", "gold", "platinum"] as const;

const selectClass =
  "rounded-[10px] border border-white/[0.1] bg-black/30 px-2.5 py-2 text-[13px] text-white focus:border-ember/60 focus:outline-none";

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function CustomersClient({
  initialDirectory,
  canManage,
}: {
  initialDirectory: CustomerEntry[];
  canManage: boolean;
}) {
  const [directory, setDirectory] = React.useState(initialDirectory);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<CustomerHistory | null>(null);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const selected = directory.find((c) => c.userId === selectedId) ?? null;

  const select = React.useCallback(async (id: string) => {
    setSelectedId(id);
    setHistory(null);
    setHistoryLoading(true);
    setError(null);
    try {
      setHistory(await getCustomerHistory(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const changeTier = React.useCallback(async (userId: string, tier: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await changeCustomerTier({ userId, tier });
      setDirectory(await getCustomerDirectory());
      setNotice(`Tier updated to ${tier}. Future quotes use the new tier.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tier not changed");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-6">
      <div>
        <p className="text-[13px] text-[var(--erp-muted)]">Customers · directory</p>
        <h1 className="ops-heading mt-1 text-2xl font-semibold tracking-tight text-white">Customers</h1>
        <p className="mt-1 text-sm text-[var(--erp-muted)]">
          Visits, spend, and membership tiers across the organization.
        </p>
      </div>

      {error && <OpsAlert tone="error" title="Something went wrong.">{error}</OpsAlert>}
      {notice && <OpsAlert tone="success" title={notice}>{notice}</OpsAlert>}

      <OpsPanel title={`Directory (${directory.length})`} description="Contact details, tiers, and lifetime value.">
        {directory.length === 0 ? (
          <OpsEmpty title="No customers yet" description="Bookings and sessions will appear here." />
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {directory.map((customer) => (
              <li key={customer.userId}>
                <button
                  type="button"
                  onClick={() => void select(customer.userId)}
                  className={cn(
                    "flex w-full flex-col gap-1 py-3.5 text-left transition lg:flex-row lg:items-center lg:justify-between",
                    selectedId === customer.userId ? "text-white" : "text-white/90 hover:text-white",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{customer.name ?? customer.email}</span>
                    <span className="block truncate text-[13px] text-[var(--erp-muted)]">{customer.email}</span>
                  </span>
                  <span className="tnum flex shrink-0 items-center gap-4 text-[13px] text-[var(--erp-muted)]">
                    <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs capitalize text-white">{customer.tier}</span>
                    <span>{customer.bookings} bookings</span>
                    <span>{customer.sessions} sessions</span>
                    <span className="text-white">{formatPaise(customer.lifetimePaid)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </OpsPanel>

      {selected && (
        <OpsPanel title={selected.name ?? selected.email} description={selected.phone ?? selected.email}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-[13px] text-[var(--erp-muted)]">Membership tier</span>
            {canManage ? (
              <select
                aria-label={`Tier for ${selected.email}`}
                value={selected.tier}
                disabled={busy}
                onChange={(e) => void changeTier(selected.userId, e.target.value)}
                className={selectClass}
              >
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs capitalize text-white">{selected.tier}</span>
            )}
            <span className="text-xs text-[var(--erp-subtle)]">Tiers affect future quotes only.</span>
          </div>
          {historyLoading ? (
            <p className="text-sm text-[var(--erp-muted)]">Loading history…</p>
          ) : history ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <h3 className="mb-2 text-[13px] font-semibold text-white">Recent bookings</h3>
                {history.bookings.length === 0 ? <p className="text-[13px] text-[var(--erp-subtle)]">None.</p> : (
                  <ul className="space-y-1.5 text-[13px] text-[var(--erp-muted)]">
                    {history.bookings.map((b) => (
                      <li key={b.id} className="tnum">{b.date} · {b.start.slice(0, 5)} · {b.status} · {formatPaise(b.price)}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-[13px] font-semibold text-white">Recent sessions</h3>
                {history.sessions.length === 0 ? <p className="text-[13px] text-[var(--erp-subtle)]">None.</p> : (
                  <ul className="space-y-1.5 text-[13px] text-[var(--erp-muted)]">
                    {history.sessions.map((s) => (
                      <li key={s.id} className="tnum">{new Date(s.startedAt).toLocaleDateString("en-IN")} · {s.status}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-[13px] font-semibold text-white">Recent payments</h3>
                {history.payments.length === 0 ? <p className="text-[13px] text-[var(--erp-subtle)]">None.</p> : (
                  <ul className="space-y-1.5 text-[13px] text-[var(--erp-muted)]">
                    {history.payments.map((p) => (
                      <li key={p.id} className="tnum">{formatPaise(p.amount)} · {p.method ?? "—"} · {p.status}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </OpsPanel>
      )}
    </div>
  );
}
