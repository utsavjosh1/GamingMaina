"use client";

import React, { useState, useEffect } from "react";
import { collectPayment, getTodayRevenue } from "../actions";

export default function PaymentsPage() {
  const [revenue, setRevenue] = useState<{
    total: number;
    byMethod: Record<string, number>;
    count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment form state
  const [amount, setAmount] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [method, setMethod] = useState<"cash" | "upi" | "card">("cash");
  const [upiRef, setUpiRef] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTodayRevenue()
      .then(setRevenue)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load revenue"))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (paise: number) =>
    `₹${(paise / 100).toLocaleString("en-IN")}`;

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountInPaise = Math.round(parseFloat(amount) * 100);
    if (!!bookingId.trim() === !!sessionId.trim()) {
      setError("Enter exactly one booking ID or session ID");
      return;
    }
    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setSubmitting(true);
    setSuccess(false);
    setError(null);
    try {
      await collectPayment({
        bookingId: bookingId.trim() || undefined,
        sessionId: sessionId.trim() || undefined,
        amount: amountInPaise, // Convert ₹ to paise
        method,
        upiReference: upiRef || undefined,
        notes: notes || undefined,
      });
      setSuccess(true);
      setAmount("");
      setBookingId("");
      setSessionId("");
      setUpiRef("");
      setNotes("");

      // Refresh revenue
      const updated = await getTodayRevenue();
      setRevenue(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to collect payment");
    }
    setSubmitting(false);
  };

  return (
    <div className="p-8">
      <div className="mb-10">
        {error && <div role="alert" className="mb-4 border border-red-500/30 bg-red-500/10 p-3 font-mono text-sm text-red-400">{error}</div>}
        <h1 className="text-3xl font-heading font-black text-white uppercase tracking-tight">
          Payments
        </h1>
        <p className="text-zinc-500 font-mono text-sm mt-1">
          Collect payments and track revenue
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Collect Payment Form */}
        <div>
          <h2 className="text-lg font-heading font-bold text-white uppercase tracking-widest mb-6">
            Collect Payment
          </h2>
          <form
            onSubmit={handleCollect}
            className="bg-stealth/20 border border-zinc-800 p-6 space-y-5"
          >
            <div>
              <label htmlFor="payment-amount" className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-2">
                Amount (₹)
              </label>
              <p className="text-zinc-600 font-mono text-[10px] mb-2">Add a booking or session ID to reconcile this payment.</p>
              <input
                id="payment-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                min="1"
                step="0.01"
                className="w-full bg-obsidian border border-zinc-700 text-white font-heading font-bold text-2xl px-4 py-3 focus:border-brand focus:outline-none transition-colors placeholder:text-zinc-700"
              />
            </div>

            <div>
              <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-2">
                Payment Method
              </label>
              <div className="flex gap-3">
                {(["cash", "upi", "card"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`flex-1 py-3 border font-heading font-bold text-sm uppercase transition-all cursor-pointer ${
                      method === m
                        ? "border-brand bg-brand/10 text-white"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                    }`}
                  >
                    {m === "cash" ? "💵" : m === "upi" ? "📱" : "💳"} {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="payment-booking" className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-2">Booking ID (optional)</label>
                <input id="payment-booking" value={bookingId} onChange={(e) => setBookingId(e.target.value)} className="w-full bg-obsidian border border-zinc-700 text-white font-mono text-xs px-3 py-3 focus:border-brand focus:outline-none" />
              </div>
              <div>
                <label htmlFor="payment-session" className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-2">Session ID (optional)</label>
                <input id="payment-session" value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="w-full bg-obsidian border border-zinc-700 text-white font-mono text-xs px-3 py-3 focus:border-brand focus:outline-none" />
              </div>
            </div>

            {method === "upi" && (
              <div>
                <label htmlFor="upi-reference" className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-2">
                  UPI Reference
                </label>
                <input
                  id="upi-reference"
                  type="text"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  placeholder="Transaction ID"
                  className="w-full bg-obsidian border border-zinc-700 text-white font-mono text-sm px-4 py-3 focus:border-brand focus:outline-none transition-colors placeholder:text-zinc-700"
                />
              </div>
            )}

            <div>
              <label htmlFor="payment-notes" className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-2">
                Notes (Optional)
              </label>
              <input
                id="payment-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. PC-RTX #3, 2hr session"
                className="w-full bg-obsidian border border-zinc-700 text-white font-mono text-sm px-4 py-3 focus:border-brand focus:outline-none transition-colors placeholder:text-zinc-700"
              />
            </div>

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm p-3 font-mono">
                ✓ Payment collected successfully
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !amount}
              className="w-full bg-brand hover:bg-brand/90 text-white font-heading font-bold text-sm tracking-widest uppercase py-4 transition-all hover:shadow-[0_0_20px_rgba(136,88,237,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? "Processing..." : "Collect Payment"}
            </button>
          </form>
        </div>

        {/* Revenue Summary */}
        <div>
          <h2 className="text-lg font-heading font-bold text-white uppercase tracking-widest mb-6">
            Today&apos;s Revenue
          </h2>
          {loading ? (
            <div className="animate-pulse h-40 bg-zinc-900 rounded"></div>
          ) : revenue ? (
            <div className="space-y-4">
              <div className="bg-stealth/20 border border-zinc-800 p-8 text-center">
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-3">
                  Total Revenue
                </span>
                <span className="text-brand font-heading font-black text-5xl">
                  {formatPrice(revenue.total)}
                </span>
                <span className="text-zinc-600 font-mono text-sm block mt-2">
                  {revenue.count} transaction{revenue.count !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(["cash", "upi", "card"] as const).map((m) => (
                  <div
                    key={m}
                    className="bg-stealth/20 border border-zinc-800 p-4 text-center"
                  >
                    <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-2">
                      {m}
                    </span>
                    <span className="text-white font-heading font-bold text-lg">
                      {formatPrice(revenue.byMethod[m] || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
