"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { DynamicButton } from "@/components/ui/DynamicButton";
import { getStationTypes, getAvailableSlots, createBooking } from "./actions";
import { getDelhiDate, getNextDelhiDates, formatDelhiDate } from "@/lib/dates";

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

export default function BookOnlinePage() {
  const [step, setStep] = useState<BookingStep>("select");
  const [stationTypes, setStationTypes] = useState<
    StationTypeWithAvailability[]
  >([]);
  const [selectedType, setSelectedType] =
    useState<StationTypeWithAvailability | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingPrice, setBookingPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load station types on mount and keep failures visible.
  useEffect(() => {
    getStationTypes()
      .then(setStationTypes)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load stations"))
      .finally(() => setLoading(false));
  }, []);

  // Dates are local business dates, not UTC dates.
  useEffect(() => setSelectedDate(getDelhiDate()), []);

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

  useEffect(() => {
    if (step === "datetime") {
      loadSlots();
    }
  }, [step, selectedDate, selectedType, loadSlots]);

  const handleSelectType = (type: StationTypeWithAvailability) => {
    setSelectedType(type);
    setStep("datetime");
    setSelectedSlot(null);
    setHours(1);
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
      });
      setBookingId(booking.id);
      setBookingPrice(booking.estimated_price);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (paise: number) =>
    `₹${(paise / 100).toLocaleString("en-IN")}`;

  const formatDate = (dateStr: string) =>
    formatDelhiDate(dateStr, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const getDateOptions = () => getNextDelhiDates(7);

  return (
    <div className="min-h-[80vh] pt-32 pb-20 bg-obsidian relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/8 blur-[200px] pointer-events-none -mr-64 -mt-64"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-12 bg-brand"></span>
            <span className="text-brand font-mono text-sm tracking-widest uppercase">
              Booking Portal
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-heading font-black tracking-tighter text-white mb-4 uppercase">
            Reserve{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-brand to-zinc-500">
              Station
            </span>
          </h1>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-8">
            {(["select", "datetime", "confirm", "done"] as BookingStep[]).map(
              (s, i) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                      step === s
                        ? "bg-brand text-white shadow-[0_0_20px_rgba(136,88,237,0.5)]"
                        : ["select", "datetime", "confirm", "done"].indexOf(
                              step,
                            ) > i
                          ? "bg-brand/30 text-brand"
                          : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 3 && (
                    <div
                      className={`flex-1 h-px max-w-16 ${
                        ["select", "datetime", "confirm", "done"].indexOf(
                          step,
                        ) > i
                          ? "bg-brand/50"
                          : "bg-zinc-800"
                      }`}
                    ></div>
                  )}
                </React.Fragment>
              ),
            )}
          </div>
          {error && <div role="alert" className="mt-6 max-w-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 font-mono">{error}</div>}
        </div>

        {/* Step 1: Select Station Type */}
        {step === "select" && (
          <div>
            <h2 className="text-2xl font-heading font-bold text-white mb-8 tracking-wide uppercase">
              Select Your Station
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-56 bg-zinc-900 border border-zinc-800 animate-pulse"
                  ></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stationTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type)}
                    disabled={type.available === 0}
                    className="relative overflow-hidden border border-zinc-800 bg-zinc-900 p-0 text-left group hover:border-brand/50 transition-all duration-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <div className="relative h-36 w-full overflow-hidden">
                      {type.image_url && (
                        <Image
                          src={type.image_url}
                          alt={type.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover opacity-40 group-hover:opacity-70 group-hover:scale-110 transition-all duration-700"
                        />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-zinc-900 via-zinc-900/40 to-transparent"></div>
                      <div className="absolute top-3 right-3">
                        <span className="bg-obsidian/80 backdrop-blur-md border border-brand/30 px-2 py-1 text-white font-heading font-bold text-sm">
                          {formatPrice(type.base_price_per_hour)}/hr
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <span className="text-brand font-mono text-[10px] tracking-widest uppercase">
                        {type.category}
                      </span>
                      <h3 className="text-xl font-heading font-black text-white tracking-wide uppercase mt-1">
                        {type.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-3">
                        <span
                          className={`w-2 h-2 rounded-full ${type.available > 0 ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                        ></span>
                        <span className="text-zinc-400 font-mono text-xs">
                          {type.available}/{type.total} available
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Pick Date & Time */}
        {step === "datetime" && selectedType && (
          <div>
            <button
              onClick={() => setStep("select")}
              className="text-zinc-500 hover:text-brand text-sm font-heading font-bold uppercase tracking-widest mb-8 flex items-center gap-2 transition-colors cursor-pointer"
            >
              ← Back to Stations
            </button>

            <div className="flex items-center gap-4 mb-10">
              <h2 className="text-2xl font-heading font-bold text-white tracking-wide uppercase">
                {selectedType.name}
              </h2>
              <span className="bg-brand/10 border border-brand/30 px-2 py-0.5 text-brand font-mono text-xs">
                {formatPrice(selectedType.base_price_per_hour)}/hr
              </span>
            </div>

            {/* Date Selection */}
            <div className="mb-10">
              <h3 className="text-sm font-heading font-bold text-zinc-400 uppercase tracking-widest mb-4">
                Select Date
              </h3>
              <div className="flex flex-wrap gap-3">
                {getDateOptions().map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`px-4 py-3 border font-heading text-sm font-bold uppercase transition-all cursor-pointer ${
                      selectedDate === date
                        ? "border-brand bg-brand/10 text-white shadow-[0_0_15px_rgba(136,88,237,0.2)]"
                        : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    <div className="text-[10px] font-mono text-zinc-500">
                      {formatDelhiDate(date, { weekday: "short" })}
                    </div>
                    <div>
                      {formatDelhiDate(date, { day: "numeric", month: "short" })}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            <div className="mb-10">
              <h3 className="text-sm font-heading font-bold text-zinc-400 uppercase tracking-widest mb-4">
                Select Start Time
              </h3>
              {loading ? (
                <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                  {[...Array(13)].map((_, i) => (
                    <div
                      key={i}
                      className="h-14 bg-zinc-900 border border-zinc-800 animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                  {slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      onClick={() => setSelectedSlot(slot.startTime)}
                      disabled={slot.available === 0}
                      className={`px-3 py-3 border font-mono text-sm transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer ${
                        selectedSlot === slot.startTime
                          ? "border-brand bg-brand/10 text-white shadow-[0_0_15px_rgba(136,88,237,0.2)]"
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {slot.startTime}
                      <div className="text-[9px] text-zinc-600 mt-0.5">
                        {slot.available} left
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Duration */}
            {selectedSlot && (
              <div className="mb-10">
                <h3 className="text-sm font-heading font-bold text-zinc-400 uppercase tracking-widest mb-4">
                  Duration (Hours)
                </h3>
                <div className="flex gap-3">
                  {Array.from(
                    { length: Math.min(5, 23 - parseInt(selectedSlot.split(":")[0], 10)) },
                    (_, i) => i + 1,
                  ).map((h) => (
                    <button
                      key={h}
                      onClick={() => setHours(h)}
                      className={`w-14 h-14 border font-heading font-bold text-lg transition-all cursor-pointer ${
                        hours === h
                          ? "border-brand bg-brand/10 text-white shadow-[0_0_15px_rgba(136,88,237,0.2)]"
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <p className="text-zinc-500 font-mono text-xs mt-3">
                  Total:{" "}
                  <span className="text-white font-bold">
                    Final price is calculated securely at confirmation.
                  </span>
                </p>
              </div>
            )}

            {selectedSlot && (
              <DynamicButton
                variant="primary"
                className="text-lg px-12"
                onClick={() => setStep("confirm")}
              >
                Continue →
              </DynamicButton>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && selectedType && selectedSlot && (
          <div>
            <button
              onClick={() => setStep("datetime")}
              className="text-zinc-500 hover:text-brand text-sm font-heading font-bold uppercase tracking-widest mb-8 flex items-center gap-2 transition-colors cursor-pointer"
            >
              ← Back
            </button>

            <div className="max-w-lg">
              <div className="bg-stealth/30 border border-zinc-800 backdrop-blur-xl relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand"></div>

                <div className="p-8">
                  <h2 className="text-2xl font-heading font-black text-white uppercase tracking-wide mb-8">
                    Confirm Booking
                  </h2>

                  <div className="space-y-5">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                      <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                        Station
                      </span>
                      <span className="text-white font-heading font-bold text-lg">
                        {selectedType.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                      <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                        Date
                      </span>
                      <span className="text-white font-heading font-bold">
                        {formatDate(selectedDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                      <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                        Time
                      </span>
                      <span className="text-white font-heading font-bold">
                        {selectedSlot} –{" "}
                        {`${(parseInt(selectedSlot.split(":")[0]) + hours).toString().padStart(2, "0")}:00`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                      <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                        Duration
                      </span>
                      <span className="text-white font-heading font-bold">
                        {hours} {hours === 1 ? "hour" : "hours"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                        Total
                      </span>
                      <span className="text-brand font-heading font-black text-2xl">
                        {bookingPrice === null ? "Calculated at confirmation" : formatPrice(bookingPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 bg-cyan/5 border border-cyan/20 p-4 flex items-center gap-3">
                    <span className="text-cyan text-lg">💰</span>
                    <div>
                      <p className="text-white font-heading font-bold text-sm">
                        Pay at Counter
                      </p>
                      <p className="text-zinc-500 text-xs font-mono">
                        Cash or UPI accepted at the shop
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      onClick={handleConfirm}
                      disabled={submitting}
                      className="w-full bg-brand hover:bg-brand/90 text-white font-heading font-bold text-sm tracking-widest uppercase py-4 transition-all duration-300 hover:shadow-[0_0_30px_rgba(136,88,237,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitting ? "PROCESSING..." : "CONFIRM BOOKING"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="text-center max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center mx-auto mb-8">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-3xl font-heading font-black text-white uppercase mb-4">
              Booking{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-green-400 to-cyan">
                Confirmed
              </span>
            </h2>
            <p className="text-zinc-400 mb-2">
              Your station has been reserved.
            </p>
            <p className="text-zinc-600 font-mono text-xs mb-8">
              Booking ID: {bookingId?.slice(0, 8).toUpperCase()}
            </p>

            <div className="bg-stealth/30 border border-zinc-800 p-6 mb-8 text-left">
              <div className="flex justify-between items-center mb-3">
                <span className="text-zinc-500 font-mono text-xs">Station</span>
                <span className="text-white font-heading font-bold">
                  {selectedType?.name}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-zinc-500 font-mono text-xs">Date</span>
                <span className="text-white font-heading font-bold">
                  {formatDate(selectedDate)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-zinc-500 font-mono text-xs">Time</span>
                <span className="text-white font-heading font-bold">
                  {selectedSlot} –{" "}
                  {selectedSlot &&
                    `${(parseInt(selectedSlot.split(":")[0]) + hours).toString().padStart(2, "0")}:00`}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                <span className="text-zinc-500 font-mono text-xs">
                  Pay at Counter
                </span>
                <span className="text-brand font-heading font-black text-xl">
                  {selectedType && bookingPrice !== null
                    ? formatPrice(bookingPrice)
                    : "Calculated at confirmation"}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <DynamicButton href="/dashboard" variant="primary" className="text-sm px-8">
                View My Bookings
              </DynamicButton>
              <DynamicButton href="/" variant="secondary" className="text-sm px-8">
                Return to Base
              </DynamicButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
