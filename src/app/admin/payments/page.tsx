"use client";

import React, { useState, useEffect } from "react";
import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { collectPayment, getActingContext, getTodayRevenue } from "../actions";
import { OpsAlert, OpsEmpty, OpsPanel } from "@/components/ui/OpsPrimitives";
import { cn } from "@/lib/utils";

const methods = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
] as const;

export default function PaymentsPage() {
  const [revenue, setRevenue] = useState<{
    total: number;
    byMethod: Record<string, number>;
    count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [method, setMethod] = useState<"cash" | "upi" | "card">("cash");
  const [upiRef, setUpiRef] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptKeyRef = React.useRef(crypto.randomUUID());

  const [branchLabel, setBranchLabel] = useState("Counter");

  useEffect(() => {
    getTodayRevenue()
      .then(setRevenue)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load revenue"))
      .finally(() => setLoading(false));
    getActingContext()
      .then((acting) => setBranchLabel(`${acting.org.name} · ${acting.branch.name}`))
      .catch(() => undefined);
  }, []);

  const formatPrice = (paise: number) =>
    `₹${(paise / 100).toLocaleString("en-IN")}`;

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountInPaise = Math.round(parseFloat(amount) * 100);
    if (!!bookingId.trim() === !!sessionId.trim()) {
      setError("Link exactly one booking or session — not both, not neither.");
      return;
    }
    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
      setError("Enter a valid amount above zero.");
      return;
    }

    setSubmitting(true);
    setSuccess(false);
    setError(null);
    try {
      await collectPayment({
        bookingId: bookingId.trim() || undefined,
        sessionId: sessionId.trim() || undefined,
        amount: amountInPaise,
        method,
        upiReference: upiRef || undefined,
        notes: notes || undefined,
        idempotencyKey: attemptKeyRef.current,
      });
      attemptKeyRef.current = crypto.randomUUID();
      setSuccess(true);
      setAmount("");
      setBookingId("");
      setSessionId("");
      setUpiRef("");
      setNotes("");

      const updated = await getTodayRevenue();
      setRevenue(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to collect payment");
    }
    setSubmitting(false);
  };

  const inputClass =
    "tnum w-full rounded-[10px] border border-white/[0.1] bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-[var(--erp-subtle)] focus:border-ember/60 focus:outline-none";
  const labelClass = "mb-1.5 block text-[13px] font-medium text-[var(--erp-muted)]";

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-6">
      <div>
        <p className="text-[13px] text-[var(--erp-muted)]">Counter · {branchLabel}</p>
        <h1 className="ops-heading mt-1 text-2xl font-semibold tracking-tight text-white">Payments</h1>
        <p className="mt-1 text-sm text-[var(--erp-muted)]">
          Collect against a booking or session, then watch the total update.
        </p>
      </div>

      {error && (
        <OpsAlert tone="error" title="Payment not collected.">
          {error}
        </OpsAlert>
      )}
      {success && (
        <OpsAlert tone="success" title="Payment collected.">
          Revenue below already includes it.
        </OpsAlert>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <OpsPanel title="Collect a payment" description="One booking or session per payment.">
          <form onSubmit={handleCollect} className="space-y-4">
            <div>
              <label htmlFor="payment-amount" className={labelClass}>Amount (₹)</label>
              <input
                id="payment-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                min="1"
                step="0.01"
                inputMode="decimal"
                className={cn(inputClass, "text-2xl font-semibold")}
              />
            </div>

            <div>
              <span id="method-label" className={labelClass}>Method</span>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="method-label">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={method === m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border px-3 text-sm font-semibold transition",
                      method === m.id
                        ? "border-paper bg-paper text-ink"
                        : "border-white/[0.1] bg-white/[0.02] text-[var(--erp-muted)] hover:text-white",
                    )}
                  >
                    <m.icon className="size-4" aria-hidden="true" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="payment-booking" className={labelClass}>Booking ID</label>
                <input
                  id="payment-booking"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="payment-session" className={labelClass}>Session ID</label>
                <input
                  id="payment-session"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                  className={inputClass}
                />
              </div>
            </div>

            {method === "upi" && (
              <div>
                <label htmlFor="upi-reference" className={labelClass}>UPI reference</label>
                <input
                  id="upi-reference"
                  type="text"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  placeholder="Transaction ID from the payer's app"
                  autoComplete="off"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label htmlFor="payment-notes" className={labelClass}>
                Notes <span className="text-[var(--erp-subtle)]">(optional)</span>
              </label>
              <input
                id="payment-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. PC-RTX 3, 2-hour session"
                autoComplete="off"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !amount}
              className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-[10px] bg-paper px-4 text-sm font-semibold text-ink transition hover:bg-white disabled:opacity-50"
            >
              {submitting ? "Collecting…" : "Collect payment"}
            </button>
          </form>
        </OpsPanel>

        <OpsPanel
          title="Revenue today"
          description={revenue ? `${revenue.count} payment${revenue.count === 1 ? "" : "s"} so far` : "Loading today's total."}
        >
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-24 rounded-[10px] bg-white/[0.04]" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-16 rounded-[10px] bg-white/[0.04]" />
                <div className="h-16 rounded-[10px] bg-white/[0.04]" />
                <div className="h-16 rounded-[10px] bg-white/[0.04]" />
              </div>
            </div>
          ) : revenue ? (
            <div className="space-y-2">
              <div className="ops-sunken rounded-[12px] p-6 text-center">
                <p className="tnum font-heading text-4xl font-extrabold tracking-tight text-paper">
                  {formatPrice(revenue.total)}
                </p>
                <p className="tnum mt-1 text-[13px] text-[var(--erp-muted)]">
                  {revenue.count} transaction{revenue.count !== 1 ? "s" : ""} today
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "upi", "card"] as const).map((m) => (
                  <div key={m} className="ops-sunken rounded-[10px] p-3.5 text-center">
                    <p className="text-xs capitalize text-[var(--erp-muted)]">{m}</p>
                    <p className="tnum mt-1 text-[15px] font-semibold text-paper">
                      {formatPrice(revenue.byMethod[m] || 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <OpsEmpty title="Revenue unavailable" description="Reload the page — today's total should appear here." />
          )}
        </OpsPanel>
      </div>
    </div>
  );
}
