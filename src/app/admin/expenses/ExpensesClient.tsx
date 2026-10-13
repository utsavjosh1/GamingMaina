"use client";

import React from "react";
import {
  getExpenses,
  getExpenseTotals,
  getIncomes,
  getIncomeTotals,
  recordExpense,
  recordIncome,
} from "./actions";
import { OpsAlert, OpsEmpty, OpsPanel } from "@/components/ui/OpsPrimitives";

const EXPENSE_CATEGORIES = ["rent", "utilities", "salaries", "maintenance", "supplies", "food_beverage", "other"] as const;
const INCOME_CATEGORIES = ["food_beverage", "membership_fee", "service", "other"] as const;
const METHODS = ["cash", "upi", "card", "bank"] as const;

type Expense = Awaited<ReturnType<typeof getExpenses>>[number];
type Income = Awaited<ReturnType<typeof getIncomes>>[number];
type Totals = Awaited<ReturnType<typeof getExpenseTotals>>;

const inputClass =
  "tnum w-full rounded-[10px] border border-white/[0.1] bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-[var(--erp-subtle)] focus:border-ember/60 focus:outline-none";
const selectClass =
  "rounded-[10px] border border-white/[0.1] bg-black/30 px-2.5 py-2.5 text-sm text-white focus:border-ember/60 focus:outline-none";
const labelClass = "mb-1.5 block text-[13px] font-medium text-[var(--erp-muted)]";

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function toPaise(rupees: string) {
  const value = Math.round(parseFloat(rupees) * 100);
  return Number.isFinite(value) ? value : NaN;
}

export function ExpensesClient({
  initialExpenses,
  initialIncomes,
  initialExpenseTotals,
  initialIncomeTotals,
  canManageMoney,
}: {
  initialExpenses: Expense[];
  initialIncomes: Income[];
  initialExpenseTotals: Totals;
  initialIncomeTotals: Totals;
  canManageMoney: boolean;
}) {
  const [expenses, setExpenses] = React.useState(initialExpenses);
  const [incomes, setIncomes] = React.useState(initialIncomes);
  const [expenseTotals, setExpenseTotals] = React.useState(initialExpenseTotals);
  const [incomeTotals, setIncomeTotals] = React.useState(initialIncomeTotals);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [kind, setKind] = React.useState<"expense" | "income">("expense");
  const [category, setCategory] = React.useState<string>("supplies");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<string>("cash");
  const [vendor, setVendor] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const keyRef = React.useRef(crypto.randomUUID());

  const refresh = React.useCallback(async () => {
    const [e, i, et, it] = await Promise.all([getExpenses(), getIncomes(), getExpenseTotals(), getIncomeTotals()]);
    setExpenses(e);
    setIncomes(i);
    setExpenseTotals(et);
    setIncomeTotals(it);
  }, []);

  const submit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = toPaise(amount);
    if (!Number.isFinite(paise) || paise <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        category,
        amount: paise,
        method,
        vendor: vendor.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey: keyRef.current,
      };
      const result = kind === "expense" ? await recordExpense(payload) : await recordIncome(payload);
      keyRef.current = crypto.randomUUID();
      setAmount("");
      setVendor("");
      setNotes("");
      await refresh();
      setNotice(
        kind === "expense"
          ? `Expense recorded${result.cashPosted ? " and posted to the open register." : " (no open register — cash leg skipped)."}`
          : `Income recorded${result.cashPosted ? " and posted to the open register." : " (no open register — cash leg skipped)."}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Record not saved");
    } finally {
      setBusy(false);
    }
  }, [amount, category, kind, method, notes, refresh, vendor]);

  const categories = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const monthExpense = expenseTotals.reduce((s, t) => s + t.total, 0);
  const monthIncome = incomeTotals.reduce((s, t) => s + t.total, 0);

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-6">
      <div>
        <p className="text-[13px] text-[var(--erp-muted)]">Money · in &amp; out</p>
        <h1 className="ops-heading mt-1 text-2xl font-semibold tracking-tight text-white">Expenses &amp; Income</h1>
        <p className="mt-1 text-sm text-[var(--erp-muted)]">
          <span className="tnum">This month: {formatPaise(monthIncome)} in · {formatPaise(monthExpense)} out</span>
        </p>
      </div>

      {error && <OpsAlert tone="error" title="Record not saved.">{error}</OpsAlert>}
      {notice && <OpsAlert tone="success" title={notice}>{notice}</OpsAlert>}

      {canManageMoney && (
        <OpsPanel title="Record" description="Append-only: corrections are new offsetting records, never edits.">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_10rem_10rem_1fr_auto]">
            <div>
              <label className={labelClass} htmlFor="money-kind">Kind</label>
              <select
                id="money-kind"
                value={kind}
                onChange={(e) => {
                  const next = e.target.value as "expense" | "income";
                  setKind(next);
                  setCategory(next === "expense" ? "supplies" : "food_beverage");
                }}
                className={selectClass}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="money-category">Category</label>
              <select id="money-category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="money-amount">Amount (₹)</label>
              <input id="money-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="money-method">Method</label>
              <select id="money-method" value={method} onChange={(e) => setMethod(e.target.value)} className={selectClass}>
                {METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="money-vendor">Vendor / source</label>
              <input id="money-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Optional" maxLength={120} className={inputClass} />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="rounded-[10px] bg-ember px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Record"}
              </button>
            </div>
            <div className="sm:col-span-2 lg:col-span-6">
              <label className={labelClass} htmlFor="money-notes">Notes</label>
              <input id="money-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" maxLength={500} className={inputClass} />
            </div>
          </form>
        </OpsPanel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <OpsPanel title="Recent expenses" description="Money out of the branch.">
          {expenses.length === 0 ? <OpsEmpty title="No expenses" description="Recorded expenses appear here." /> : (
            <ul className="divide-y divide-white/[0.06]">
              {expenses.slice(0, 20).map((e) => (
                <li key={e.id} className="tnum flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-white">{e.vendor ?? e.category.replace(/_/g, " ")}</span>
                    <span className="block text-[13px] text-[var(--erp-muted)]">{e.category.replace(/_/g, " ")} · {e.method.toUpperCase()}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-red-300">−{formatPaise(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </OpsPanel>
        <OpsPanel title="Recent income" description="Misc money in (session revenue stays in Payments).">
          {incomes.length === 0 ? <OpsEmpty title="No misc income" description="Recorded income appears here." /> : (
            <ul className="divide-y divide-white/[0.06]">
              {incomes.slice(0, 20).map((i) => (
                <li key={i.id} className="tnum flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-white">{i.vendor ?? i.category.replace(/_/g, " ")}</span>
                    <span className="block text-[13px] text-[var(--erp-muted)]">{i.category.replace(/_/g, " ")} · {i.method.toUpperCase()}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-emerald-300">+{formatPaise(i.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </OpsPanel>
      </div>
    </div>
  );
}
