"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Gamepad2 } from "lucide-react";
import { DynamicButton } from "@/components/ui/DynamicButton";
import { getAvailableSlots, createBooking } from "./actions";
import { getDelhiDate, getNextDelhiDates, formatDelhiDate } from "@/lib/dates";
import { getMediaUrl } from "@/lib/media";

interface StationTypeWithAvailability {
  id: string;
  name: string;
  category: string;
  base_price_per_hour: number;
  image_url: string | null;
  available: number;
  total: number;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: number;
  total: number;
}

type BookingStep = "select" | "datetime" | "confirm" | "done";

export function BookOnlineClient({ initialStationTypes }: { initialStationTypes: StationTypeWithAvailability[] }) {
  const [step, setStep] = useState<BookingStep>("select");
  const [stationTypes] = useState<StationTypeWithAvailability[]>(initialStationTypes);
  const [selectedType, setSelectedType] = useState<StationTypeWithAvailability | null>(null);
  // Business date initialised lazily to avoid a mount-effect cascade.
  // (Server and client both compute Asia/Kolkata date; same-day renders match.)
  const [selectedDate, setSelectedDate] = useState(() => getDelhiDate());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingPrice, setBookingPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // One key per booking attempt: double-clicks/retries replay, a new
  // slot or date mints a fresh attempt via handleSelectType below.
  const attemptKeyRef = React.useRef(crypto.randomUUID());

  // Dates are local business dates (see lazy useState init above).

  // Load slots when date or type changes
  const loadSlots = useCallback(async () => {
    if (!selectedType || !selectedDate) return;
    setLoading(true);
    try {
      const data = await getAvailableSlots(selectedType.id, selectedDate, hours);
      setSlots(data);
      if (selectedSlot && !data.some((slot) => slot.startTime === selectedSlot && slot.available > 0)) {
        setSelectedSlot(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load availability");
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedDate, hours, selectedSlot]);

  // Server-action fetch on step/date/type change — external sync, not a cascade.
  useEffect(() => {
    if (step === "datetime") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadSlots();
    }
  }, [step, selectedDate, selectedType, loadSlots]);

  const handleSelectType = (type: StationTypeWithAvailability) => {
    setSelectedType(type);
    setStep("datetime");
    setSelectedSlot(null);
    setHours(1);
    attemptKeyRef.current = crypto.randomUUID();
  };

  const handleConfirm = async () => {
    if (!selectedType || !selectedSlot) return;
    setSubmitting(true);
    setError(null);

    try {
      const booking = await createBooking({
        stationTypeId: selectedType.id,
        date: selectedDate,
        startTime: selectedSlot,
        hours,
        idempotencyKey: attemptKeyRef.current,
      });
      attemptKeyRef.current = crypto.randomUUID();
      setBookingId(booking.id);
      setBookingPrice(booking.estimated_price);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

  const formatDate = (dateStr: string) =>
    formatDelhiDate(dateStr, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const getDateOptions = () => getNextDelhiDates(7);

  const stepLabels = [
    { key: "select", label: "Station" },
    { key: "datetime", label: "Date & time" },
    { key: "confirm", label: "Confirm" },
    { key: "done", label: "Receipt" },
  ];

  const currentStepIdx = ["select", "datetime", "confirm", "done"].indexOf(step);

  return (
    <div className="pb-20 pt-24 lg:pt-28">
      <div className="gm-container max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-[13px] font-medium text-[var(--gm-muted)]">
            Booking · pay at the counter · held for 15 minutes
          </p>
          <h1 className="ops-heading mt-2 font-heading text-4xl font-extrabold tracking-tight text-paper sm:text-5xl">
            Book your station<span className="text-ember">.</span>
          </h1>

          <ol className="mt-7 flex flex-wrap items-center gap-2" aria-label="Booking progress">
            {stepLabels.map((s, idx) => {
              const done = currentStepIdx > idx;
              const current = step === s.key;
              return (
                <li key={s.key} className="flex items-center gap-2">
                  <span
                    aria-current={current ? "step" : undefined}
                    className={
                      current
                        ? "inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-paper px-3.5 py-1.5 text-xs font-bold text-ink"
                        : done
                          ? "inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300"
                          : "inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/[0.1] px-3.5 py-1.5 text-xs font-medium text-[var(--gm-muted)]"
                    }
                  >
                    <span className="tnum">{idx + 1}</span> {s.label}
                  </span>
                  {idx < 3 && <span className="text-[var(--gm-subtle)]" aria-hidden="true">·</span>}
                </li>
              );
            })}
          </ol>

          {error && (
            <div role="alert" className="mt-6 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Step 1: Select Station Type */}
        {step === "select" && (
          <div>
            <div className="mb-5 mt-10 flex items-baseline justify-between gap-4">
              <h2 className="font-heading text-xl font-bold tracking-tight text-paper">
                Choose your setup
              </h2>
              <span className="tnum shrink-0 text-[13px] text-[var(--gm-muted)]">{stationTypes.length} setups</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-56 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.02]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {stationTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type)}
                    disabled={type.available === 0}
                    className="group overflow-hidden rounded-2xl border border-white/[0.09] bg-[#14100d] text-left transition-colors hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <div className="relative h-40 w-full overflow-hidden">
                      {type.image_url && (
                        <Image
                          src={getMediaUrl(type.image_url)}
                          alt={type.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#14100d] via-transparent to-transparent" />
                      <span className="tnum absolute right-3 top-3 rounded-lg bg-paper px-2.5 py-1 text-xs font-bold text-ink">
                        {formatPrice(type.base_price_per_hour)}/hr
                      </span>
                    </div>

                    <div className="p-5">
                      <p className="text-xs font-medium text-[var(--gm-muted)]">{type.category}</p>
                      <h3 className="mt-0.5 font-heading text-xl font-bold tracking-tight text-paper">
                        {type.name}
                      </h3>
                      <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3">
                        <span className="flex items-center gap-2 text-[13px] text-[var(--gm-muted)]">
                          <span
                            className={`size-1.5 rounded-full ${type.available > 0 ? "bg-emerald-400" : "bg-red-400"}`}
                          />
                          <span className="tnum">{type.available}/{type.total} free</span>
                        </span>
                        <span className="text-[13px] font-semibold text-paper group-hover:text-ember-strong">
                          Select →
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Pick Date, Time Slot & Duration */}
        {step === "datetime" && selectedType && (
          <div className="mt-10">
            <button
              onClick={() => setStep("select")}
              className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--gm-muted)] transition-colors hover:text-paper"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              All setups
            </button>

            <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.09] bg-[#14100d] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ember/15 text-ember-strong">
                  <Gamepad2 className="size-5" />
                </span>
                <div>
                  <p className="text-xs text-[var(--gm-muted)]">{selectedType.category}</p>
                  <h3 className="font-heading text-xl font-bold tracking-tight text-paper">{selectedType.name}</h3>
                </div>
              </div>
              <p className="tnum font-heading text-2xl font-extrabold text-paper">
                {formatPrice(selectedType.base_price_per_hour)}<span className="text-sm font-medium text-[var(--gm-muted)]">/hr</span>
              </p>
            </div>

            <div className="mb-8 mt-8">
              <h3 className="text-sm font-semibold text-paper">
                Pick a date
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                {getDateOptions().map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    aria-pressed={selectedDate === date}
                    className={`rounded-xl border p-3 text-center transition-colors ${
                      selectedDate === date
                        ? "border-paper bg-paper text-ink"
                        : "border-white/[0.09] bg-white/[0.02] text-[var(--gm-muted)] hover:border-white/20 hover:text-paper"
                    }`}
                  >
                    <span className="block text-xs">
                      {formatDelhiDate(date, { weekday: "short" })}
                    </span>
                    <span className="tnum mt-0.5 block font-heading text-base font-bold">
                      {formatDelhiDate(date, { day: "numeric", month: "short" })}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-paper">
                Pick a start time <span className="font-normal text-[var(--gm-muted)]">· 10 AM – 11 PM IST</span>
              </h3>
              {loading ? (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-[4.25rem] animate-pulse rounded-xl border border-white/[0.08] bg-white/[0.02]" />
                  ))}
                </div>
              ) : slots.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
                  {slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      onClick={() => setSelectedSlot(slot.startTime)}
                      disabled={slot.available === 0}
                      aria-pressed={selectedSlot === slot.startTime}
                      className={`rounded-xl border p-3 transition-colors ${
                        selectedSlot === slot.startTime
                          ? "border-ember bg-ember text-ember-ink"
                          : slot.available > 0
                            ? "border-white/[0.09] bg-white/[0.02] text-paper hover:border-white/20"
                            : "cursor-not-allowed border-white/[0.05] text-[var(--gm-subtle)] opacity-40"
                      }`}
                    >
                      <span className="tnum block text-sm font-bold">{slot.startTime}</span>
                      <span className="tnum mt-0.5 block text-xs opacity-70">
                        {slot.available > 0 ? `${slot.available} free` : "Full"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-white/[0.09] p-5 text-center">
                  <p className="text-sm text-[var(--gm-muted)]">Nothing free on this date — try another day.</p>
                </div>
              )}
            </div>

            {selectedSlot && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-paper">
                  How long?
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from(
                    { length: Math.min(5, 23 - parseInt(selectedSlot.split(":")[0], 10)) },
                    (_, i) => i + 1
                  ).map((h) => (
                    <button
                      key={h}
                      onClick={() => setHours(h)}
                      aria-pressed={hours === h}
                      className={`h-12 w-14 rounded-xl border font-heading text-base font-bold transition-colors ${
                        hours === h
                          ? "border-paper bg-paper text-ink"
                          : "border-white/[0.09] bg-white/[0.02] text-[var(--gm-muted)] hover:border-white/20 hover:text-paper"
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
                <p className="mt-2.5 text-[13px] text-[var(--gm-muted)]">
                  Pass and happy-hour discounts apply automatically at the counter.
                </p>
              </div>
            )}

            {/* Continue Button */}
            {selectedSlot && (
              <DynamicButton
                variant="primary"
                size="lg"
                onClick={() => setStep("confirm")}
                className="mt-2"
              >
                <span>Review booking</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </DynamicButton>
            )}
          </div>
        )}

        {/* Step 3: Confirmation Terminal */}
        {step === "confirm" && selectedType && selectedSlot && (
          <div className="mx-auto mt-10 max-w-xl">
            <button
              onClick={() => setStep("datetime")}
              className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--gm-muted)] transition-colors hover:text-paper"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Change time
            </button>

            <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#14100d]">
              <div className="bg-paper px-6 py-5 text-ink">
                <p className="text-xs font-bold uppercase tracking-[0.16em]">Your booking</p>
                <h2 className="ops-heading mt-1 font-heading text-2xl font-extrabold tracking-tight">{selectedType.name}</h2>
              </div>
              <dl className="space-y-0 px-6 py-2 text-sm">
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] py-3.5">
                  <dt className="text-[var(--gm-muted)]">Date</dt>
                  <dd className="tnum text-right font-semibold text-paper">{formatDate(selectedDate)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] py-3.5">
                  <dt className="text-[var(--gm-muted)]">Time</dt>
                  <dd className="tnum text-right font-semibold text-paper">
                    {selectedSlot} – {`${(parseInt(selectedSlot.split(":")[0]) + hours).toString().padStart(2, "0")}:00`}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] py-3.5">
                  <dt className="text-[var(--gm-muted)]">Duration</dt>
                  <dd className="tnum text-right font-semibold text-paper">{hours} {hours === 1 ? "hour" : "hours"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-[var(--gm-muted)]">Pay at counter</dt>
                  <dd className="tnum font-heading text-2xl font-extrabold text-ember-strong">
                    {bookingPrice === null ? "—" : formatPrice(bookingPrice)}
                  </dd>
                </div>
              </dl>
              <div className="ticket-edge mx-6" aria-hidden="true" />
              <div className="flex items-start gap-3 px-6 py-5">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden="true" />
                <p className="text-[13px] leading-5 text-[var(--gm-muted)]">
                  UPI, cash or card on arrival. Held for 15 minutes past start time — then released.
                </p>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="mt-5 inline-flex min-h-[3.25rem] w-full items-center justify-center whitespace-nowrap rounded-xl bg-paper px-8 text-[15px] font-semibold text-ink transition-colors hover:bg-white disabled:opacity-50"
            >
              {submitting ? "Reserving…" : "Confirm reservation"}
            </button>
          </div>
        )}

        {/* Step 4: Success Receipt */}
        {step === "done" && (
          <div className="mx-auto mt-10 max-w-xl text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
              <CheckCircle2 className="size-8" aria-hidden="true" />
            </span>

            <h2 className="ops-heading mt-5 font-heading text-3xl font-extrabold tracking-tight text-paper sm:text-4xl">
              You&rsquo;re booked<span className="text-ember">.</span>
            </h2>
            <p className="mt-2 text-[15px] text-[var(--gm-muted)]">
              Show this at the Kalkaji counter and pay on arrival.
            </p>
            <p className="tnum mt-2 text-[13px] font-semibold text-paper">
              ID: {bookingId?.slice(0, 8).toUpperCase()}
            </p>

            <dl className="mt-7 space-y-0 rounded-2xl border border-white/[0.09] bg-[#14100d] px-6 py-2 text-left text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] py-3.5">
                <dt className="text-[var(--gm-muted)]">Setup</dt>
                <dd className="font-semibold text-paper">{selectedType?.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] py-3.5">
                <dt className="text-[var(--gm-muted)]">Date</dt>
                <dd className="tnum font-semibold text-paper">{formatDate(selectedDate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] py-3.5">
                <dt className="text-[var(--gm-muted)]">Time</dt>
                <dd className="tnum font-semibold text-paper">
                  {selectedSlot} – {selectedSlot && `${(parseInt(selectedSlot.split(":")[0]) + hours).toString().padStart(2, "0")}:00`}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-[var(--gm-muted)]">Due at counter</dt>
                <dd className="tnum font-heading text-xl font-extrabold text-paper">
                  {bookingPrice !== null ? formatPrice(bookingPrice) : "At desk"}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
              <DynamicButton href="/dashboard" variant="primary" size="md">
                My bookings
              </DynamicButton>
              <DynamicButton href="/" variant="secondary" size="md">
                Back home
              </DynamicButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
