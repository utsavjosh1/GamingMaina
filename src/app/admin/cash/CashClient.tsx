"use client";

import React from "react";
import {
  closeRegister,
  getCashHistory,
  getCashStatus,
  openRegister,
  recordCashMovement,
} from "../actions";
import { OpsAlert, OpsEmpty, OpsPanel } from "@/components/ui/OpsPrimitives";
import { formatCurrency } from "@/features/operations/time";
import { cn } from "@/lib/utils";

type CashStatus = Awaited<ReturnType<typeof getCashStatus>>;
type CashRegister = Awaited<ReturnType<typeof getCashHistory>>[number];

const MOVEMENT_TYPES = [
  { id: "deposit", label: "Deposit", sign: 1 },
  { id: "withdrawal", label: "Withdrawal", sign: -1 },
  { id: "expense", label: "Expense", sign: -1 },
  { id: "adjustment", label: "Adjustment", sign: 0 },
  { id: "refund", label: "Refund", sign: -1 },
] as const;

function toPaise(rupees: string) {
  const value = Math.round(parseFloat(rupees) * 100);
  return Number.isFinite(value) ? value : NaN;
}

export function CashClient({
  initialStatus,
  history: initialHistory,
}: {
  initialStatus: CashStatus;
  history: CashRegister[];
}) {
  const [status, setStatus] = React.useState(initialStatus);
  const [history, setHistory] = React.useState(initialHistory);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [registerName, setRegisterName] = React.useState("Counter");
  const [opening, setOpening] = React.useState("");
  const [moveType, setMoveType] = React.useState<(typeof MOVEMENT_TYPES)[number]["id"]>("deposit");
  const [moveSign, setMoveSign] = React.useState<1 | -1>(1);
  const [moveAmount, setMoveAmount] = React.useState("");
  const [moveNotes, setMoveNotes] = React.useState("");
  const [counted, setCounted] = React.useState("");
  const moveKeyRef = React.useRef(crypto.randomUUID());

  const refresh = React.useCallback(async () => {
    const [freshStatus, freshHistory] = await Promise.all([getCashStatus(), getCashHistory()]);
    setStatus(freshStatus);
    setHistory(freshHistory);
  }, []);

  const run = React.useCallback(async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await refresh();
      setNotice(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cash operation failed");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const handleOpen = (event: React.FormEvent) => {
    event.preventDefault();
    const openingPaise = toPaise(opening);
    if (!Number.isInteger(openingPaise) || openingPaise < 0) {
      setError("Enter a valid opening amount (zero or more).");
      return;
    }
    void run(async () => {
      await openRegister({ name: registerName.trim() || "Counter", openingAmount: openingPaise });
      setOpening("");
    }, "Register opened.");
  };

  const handleMovement = (event: React.FormEvent) => {
    event.preventDefault();
    const paise = toPaise(moveAmount);
    if (!Number.isInteger(paise) || paise <= 0) {
      setError("Enter an amount above zero.");
      return;
    }
    const type = MOVEMENT_TYPES.find((t) => t.id === moveType) ?? MOVEMENT_TYPES[0];
    const signed = type.sign === 0 ? moveSign * paise : type.sign * paise;
    void run(async () => {
      await recordCashMovement({
        type: moveType,
        amount: signed,
        notes: moveNotes || undefined,
        idempotencyKey: moveKeyRef.current,
      });
      moveKeyRef.current = crypto.randomUUID();
      setMoveAmount("");
      setMoveNotes("");
    }, "Movement recorded.");
  };

  const handleClose = (event: React.FormEvent) => {
    event.preventDefault();
    if (!status.register) return;
    const countedPaise = toPaise(counted);
    if (!Number.isInteger(countedPaise) || countedPaise < 0) {
      setError("Enter the counted cash (zero or more).");
      return;
    }
    const registerId = status.register.id;
    void run(async () => {
      const result = await closeRegister({ registerId, countedAmount: countedPaise });
      setCounted("");
      setNotice(
        `Register closed. Expected ${formatCurrency(result.expected)}, counted ${formatCurrency(result.counted)}, variance ${formatCurrency(result.variance)}.`,
      );
    }, "");
  };

  const inputClass =
    "w-full rounded-xl border border-white/[0.1] bg-black/30 px-3.5 py-2.5 text-sm text-paper placeholder:text-[var(--erp-subtle)] focus:border-ember/60 focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-5">
      <div>
        <p className="text-[13px] text-[var(--erp-muted)]">Immutable movements · expected vs counted · variance at close</p>
        <h1 className="ops-heading mt-1 text-2xl font-semibold tracking-tight text-white">Cash register</h1>
      </div>

      {error && <OpsAlert tone="error" title="Cash operation failed.">{error}</OpsAlert>}
      {notice && <OpsAlert tone="success" title="Done.">{notice}</OpsAlert>}

      {!status.register ? (
        <OpsPanel title="Open register" description="Count the drawer and open the day. Only one register stays open.">
          <form onSubmit={handleOpen} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--erp-muted)]">Register name</span>
              <input value={registerName} onChange={(e) => setRegisterName(e.target.value)} className={inputClass} maxLength={60} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--erp-muted)]">Opening (₹)</span>
              <input value={opening} onChange={(e) => setOpening(e.target.value)} inputMode="decimal" placeholder="0" className={cn(inputClass, "tnum")} />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-10 items-center justify-center self-end whitespace-nowrap rounded-[10px] bg-paper px-5 text-sm font-semibold text-ink transition hover:bg-white disabled:opacity-50"
            >
              {busy ? "Opening…" : "Open"}
            </button>
          </form>
        </OpsPanel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <div className="ops-surface grid gap-4 rounded-[14px] p-5 sm:grid-cols-4">
              <div>
                <p className="text-xs text-[var(--erp-muted)]">Register</p>
                <p className="mt-0.5 truncate text-lg font-semibold text-white">{status.register.name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--erp-muted)]">Opening</p>
                <p className="tnum mt-0.5 text-lg font-semibold text-white">{formatCurrency(status.register.openingAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--erp-muted)]">Expected now</p>
                <p className="tnum mt-0.5 text-lg font-semibold text-emerald-300">{formatCurrency(status.expected)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--erp-muted)]">Movements</p>
                <p className="tnum mt-0.5 text-lg font-semibold text-white">{status.movements.length}</p>
              </div>
            </div>

            <OpsPanel title="Record movement" description="Deposits, withdrawals, expenses, adjustments, refunds. Sales post automatically on cash collection.">
              <form onSubmit={handleMovement} className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--erp-muted)]">Type</span>
                  <select value={moveType} onChange={(e) => setMoveType(e.target.value as typeof moveType)} className={inputClass}>
                    {MOVEMENT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </label>
                {moveType === "adjustment" ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--erp-muted)]">Direction</span>
                    <select value={moveSign} onChange={(e) => setMoveSign(Number(e.target.value) as 1 | -1)} className={inputClass}>
                      <option value={1}>Add (+)</option>
                      <option value={-1}>Remove (−)</option>
                    </select>
                  </label>
                ) : (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--erp-muted)]">Note</span>
                    <input value={moveNotes} onChange={(e) => setMoveNotes(e.target.value)} placeholder="Reason" maxLength={500} className={inputClass} />
                  </label>
                )}
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--erp-muted)]">Amount (₹)</span>
                  <input value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} inputMode="decimal" placeholder="0" className={cn(inputClass, "tnum")} />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-10 items-center justify-center self-end whitespace-nowrap rounded-[10px] bg-paper px-5 text-sm font-semibold text-ink transition hover:bg-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Record"}
                </button>
              </form>
              {moveType === "adjustment" && (
                <input
                  value={moveNotes}
                  onChange={(e) => setMoveNotes(e.target.value)}
                  placeholder="Reason for adjustment"
                  maxLength={500}
                  className={cn(inputClass, "mt-3")}
                />
              )}
            </OpsPanel>

            <OpsPanel title="Movements" description={`${status.movements.length} entries, newest first`}>
              {status.movements.length === 0 ? (
                <OpsEmpty title="No movements yet" description="Cash sales post here automatically when collected." />
              ) : (
                <ul className="space-y-2">
                  {status.movements.map((movement) => (
                    <li key={movement.id} className="ops-sunken flex items-center justify-between gap-3 rounded-[10px] p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold capitalize text-white">
                          {movement.type}
                          {movement.paymentId ? <span className="ml-2 text-[11px] font-medium text-[var(--erp-muted)]">sale</span> : null}
                        </p>
                        <p className="truncate text-xs text-[var(--erp-muted)]">{movement.notes || "—"}</p>
                      </div>
                      <span className={cn("tnum shrink-0 text-sm font-semibold", movement.amount >= 0 ? "text-emerald-300" : "text-red-300")}>
                        {movement.amount >= 0 ? "+" : "−"}{formatCurrency(Math.abs(movement.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </OpsPanel>
          </div>

          <aside className="space-y-4">
            <OpsPanel title="Close register" description="Count the drawer. Variance is recorded and history locks.">
              <form onSubmit={handleClose} className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--erp-muted)]">Counted cash (₹)</span>
                  <input value={counted} onChange={(e) => setCounted(e.target.value)} inputMode="decimal" placeholder="0" className={cn(inputClass, "tnum")} />
                </label>
                <p className="tnum text-[13px] text-[var(--erp-muted)]">Expected: <span className="font-semibold text-white">{formatCurrency(status.expected)}</span></p>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-[10px] border border-red-400/25 bg-red-400/10 px-4 text-sm font-semibold text-red-200 transition hover:bg-red-400/15 disabled:opacity-50"
                >
                  {busy ? "Closing…" : "Close & record variance"}
                </button>
              </form>
            </OpsPanel>

            <OpsPanel title="Past registers" description={`${history.length} closed`}>
              {history.filter((r) => r.status === "closed").length === 0 ? (
                <OpsEmpty title="None closed yet" description="Closed registers appear here with their variance." />
              ) : (
                <ul className="space-y-2">
                  {history.filter((r) => r.status === "closed").slice(0, 8).map((register) => (
                    <li key={register.id} className="ops-sunken rounded-[10px] p-3">
                      <p className="truncate text-sm font-semibold text-white">{register.name}</p>
                      <p className="tnum mt-0.5 text-xs text-[var(--erp-muted)]">
                        Opened {formatCurrency(register.openingAmount)} · Counted {register.countedAmount != null ? formatCurrency(register.countedAmount) : "—"}
                      </p>
                      <p className={cn("tnum mt-0.5 text-[13px] font-semibold", (register.variance ?? 0) === 0 ? "text-emerald-300" : "text-red-300")}>
                        Variance {register.variance != null ? formatCurrency(register.variance) : "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </OpsPanel>
          </aside>
        </div>
      )}
    </div>
  );
}
