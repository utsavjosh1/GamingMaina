"use server";

import { unstable_cache } from "next/cache";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  bookings,
  cashRegisters,
  expenses,
  incomes,
  payments,
  products,
  sessions,
  stations,
  stockMovements,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/server";
import { getDelhiDate, toDelhiInstant } from "@/lib/dates";

/**
 * Reports / analytics (Phase 7). Read-only aggregates over existing tables,
 * branch-scoped, Delhi period boundaries, 60s cache per (branch, period).
 * Report views are not financial mutations — no audit, no idempotency.
 */

export type ReportPeriod = "today" | "7d" | "30d" | "month";

const PERIOD_DAYS: Record<ReportPeriod, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  month: 0, // calendar month, computed below
};

export interface DayPoint {
  date: string;
  revenue: number;
  sessions: number;
  minutes: number;
  bookings: number;
}

export interface StationUtilization {
  stationId: string;
  name: string;
  minutes: number;
  utilization: number;
}

export interface ReportPayload {
  period: ReportPeriod;
  from: string;
  to: string;
  revenue: { total: number; byMethod: Record<string, number>; count: number };
  income: { total: number; byCategory: Record<string, number> };
  expenses: { total: number; byCategory: Record<string, number> };
  net: number;
  byDay: DayPoint[];
  utilization: StationUtilization[];
  generatedAt: string;
}

const OPEN_MINUTES_PER_DAY = 13 * 60; // 10:00–23:00 floor hours

function periodBounds(period: ReportPeriod): { from: Date; to: Date; days: string[] } {
  const todayStr = getDelhiDate();
  if (period === "month") {
    const first = `${todayStr.slice(0, 7)}-01`;
    const [y, m] = first.split("-").map(Number);
    const nextMonth = new Date(Date.UTC(y, m, 1));
    const last = nextMonth.toISOString().slice(0, 10);
    const days: string[] = [];
    const cursor = new Date(Date.UTC(y, m - 1, 1));
    while (cursor < nextMonth) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return { from: toDelhiInstant(first, "00:00"), to: toDelhiInstant(last, "00:00"), days };
  }
  const n = PERIOD_DAYS[period];
  const [y, m, d] = todayStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  start.setUTCDate(start.getUTCDate() - (n - 1));
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= new Date(Date.UTC(y, m - 1, d))) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const end = new Date(Date.UTC(y, m - 1, d));
  end.setUTCDate(end.getUTCDate() + 1);
  return { from: toDelhiInstant(days[0], "00:00"), to: toDelhiInstant(end.toISOString().slice(0, 10), "00:00"), days };
}

async function buildReport(branchId: string, period: ReportPeriod): Promise<ReportPayload> {
  const { from, to, days } = periodBounds(period);
  const inRange = (col: PgColumn) =>
    and(gte(col, from), lt(col, to));

  const [payRows, incomeRows, expenseRows, sessionRows, bookingRows, stationRows] = await Promise.all([
    db.select({ amount: payments.amount, method: payments.paymentMethod, at: payments.createdAt })
      .from(payments)
      .where(and(eq(payments.branchId, branchId), eq(payments.paymentStatus, "paid"), inRange(payments.createdAt))),
    db.select({ amount: incomes.amount, category: incomes.category })
      .from(incomes)
      .where(and(eq(incomes.branchId, branchId), inRange(incomes.createdAt))),
    db.select({ amount: expenses.amount, category: expenses.category })
      .from(expenses)
      .where(and(eq(expenses.branchId, branchId), inRange(expenses.createdAt))),
    db.select({ stationId: sessions.stationId, startedAt: sessions.startedAt, endedAt: sessions.endedAt, paused: sessions.totalPausedMinutes, at: sessions.createdAt })
      .from(sessions)
      .where(and(eq(sessions.branchId, branchId), inRange(sessions.createdAt))),
    db.select({ date: bookings.bookingDate, status: bookings.status })
      .from(bookings)
      .where(and(eq(bookings.branchId, branchId), gte(sql`${bookings.bookingDate}`, days[0]), lt(sql`${bookings.bookingDate}`, toDelhiEndDay(days)))),
    db.select({ id: stations.id, name: stations.name })
      .from(stations)
      .where(eq(stations.branchId, branchId)),
  ]);

  // Helpers aggregate in Delhi-day buckets (created_at stored as instants).
  const dayKey = (at: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);

  const byDay: DayPoint[] = days.map((date) => ({ date, revenue: 0, sessions: 0, minutes: 0, bookings: 0 }));
  const dayIdx = new Map(days.map((d, i) => [d, i]));
  const byMethod: Record<string, number> = {};
  let revenueTotal = 0;
  let revenueCount = 0;
  for (const p of payRows) {
    revenueTotal += p.amount;
    revenueCount += 1;
    if (p.method) byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
    const slot = dayIdx.get(dayKey(p.at));
    if (slot !== undefined) byDay[slot].revenue += p.amount;
  }
  const incomeByCategory: Record<string, number> = {};
  let incomeTotal = 0;
  for (const i of incomeRows) {
    incomeTotal += i.amount;
    incomeByCategory[i.category] = (incomeByCategory[i.category] ?? 0) + i.amount;
  }
  const expenseByCategory: Record<string, number> = {};
  let expenseTotal = 0;
  for (const e of expenseRows) {
    expenseTotal += e.amount;
    expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + e.amount;
  }
  const minutesByStation = new Map<string, number>();
  const sessionMinutes = (s: { startedAt: Date; endedAt: Date | null; paused: number }) => {
    const end = s.endedAt ?? new Date();
    return Math.max(0, Math.round((end.getTime() - s.startedAt.getTime()) / 60_000) - s.paused);
  };
  for (const s of sessionRows) {
    const minutes = sessionMinutes(s);
    const slot = dayIdx.get(dayKey(s.at));
    if (slot !== undefined) {
      byDay[slot].sessions += 1;
      byDay[slot].minutes += minutes;
    }
    minutesByStation.set(s.stationId, (minutesByStation.get(s.stationId) ?? 0) + minutes);
  }
  for (const b of bookingRows) {
    const slot = dayIdx.get(b.date);
    if (slot !== undefined) byDay[slot].bookings += 1;
  }

  const denominator = OPEN_MINUTES_PER_DAY * days.length;
  const utilization: StationUtilization[] = stationRows.map((st) => {
    const minutes = minutesByStation.get(st.id) ?? 0;
    return {
      stationId: st.id,
      name: st.name,
      minutes,
      utilization: denominator > 0 ? Math.min(1, minutes / denominator) : 0,
    };
  }).sort((a, b) => b.utilization - a.utilization);

  return {
    period,
    from: days[0],
    to: days[days.length - 1],
    revenue: { total: revenueTotal, byMethod, count: revenueCount },
    income: { total: incomeTotal, byCategory: incomeByCategory },
    expenses: { total: expenseTotal, byCategory: expenseByCategory },
    net: revenueTotal + incomeTotal - expenseTotal,
    byDay,
    utilization,
    generatedAt: new Date().toISOString(),
  };
}

/** Upper-exclusive Delhi-day bound for date-column (YYYY-MM-DD) ranges. */
function toDelhiEndDay(days: string[]): string {
  const last = days[days.length - 1];
  const [y, m, d] = last.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

const cachedReport = (branchId: string, period: ReportPeriod) =>
  unstable_cache(
    () => buildReport(branchId, period),
    ["branch-reports", branchId, period],
    { revalidate: 60, tags: [`branch-reports:${branchId}`] },
  )();

export async function getReports(period: ReportPeriod): Promise<ReportPayload> {
  if (!["today", "7d", "30d", "month"].includes(period)) {
    const { validationError } = await import("@/lib/domain/errors");
    throw validationError("Invalid period");
  }
  const { branch } = await requirePermission("reports.view");
  return cachedReport(branch.id, period);
}

/** Operational alerts derived from live data — no persistence (spec §3). */
export async function getOperationalAlerts(): Promise<Array<{ id: string; tone: "warn" | "info"; text: string }>> {
  const { branch } = await requirePermission("reports.view");
  const alerts: Array<{ id: string; tone: "warn" | "info"; text: string }> = [];
  const [openRegisters, lowStock, expiring] = await Promise.all([
    db.select({ id: cashRegisters.id, openedAt: cashRegisters.createdAt })
      .from(cashRegisters)
      .where(and(eq(cashRegisters.branchId, branch.id), eq(cashRegisters.status, "open"))),
    db.select({ name: products.name, qty: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)`, reorder: products.reorderLevel })
      .from(products)
      .leftJoin(stockMovements, eq(stockMovements.productId, products.id))
      .where(and(eq(products.branchId, branch.id), eq(products.isActive, true)))
      .groupBy(products.id, products.name, products.reorderLevel),
    db.select({ n: sql<number>`count(*)` })
      .from(bookings)
      .where(and(
        eq(bookings.branchId, branch.id),
        eq(bookings.status, "confirmed"),
        lt(bookings.expiresAt, new Date(Date.now() + 15 * 60 * 1000)),
      )),
  ]);
  for (const reg of openRegisters) {
    const hours = (Date.now() - reg.openedAt.getTime()) / 3_600_000;
    if (hours > 12) {
      alerts.push({ id: `register:${reg.id}`, tone: "warn", text: `Cash register open for ${Math.floor(hours)}h — close and count the drawer.` });
    }
  }
  const low = lowStock.filter((r) => Number(r.qty ?? 0) <= r.reorder);
  if (low.length > 0) {
    const names = low.slice(0, 3).map((r) => r.name).join(", ");
    alerts.push({ id: "stock:low", tone: "warn", text: `${low.length} product${low.length === 1 ? " is" : "s are"} at or below reorder level (${names}${low.length > 3 ? ", …" : ""}).` });
  }
  const expiringCount = Number(expiring[0]?.n ?? 0);
  if (expiringCount > 0) {
    alerts.push({ id: "bookings:expiring", tone: "info", text: `${expiringCount} held booking${expiringCount === 1 ? " expires" : "s expire"} within 15 minutes — check in or release.` });
  }
  return alerts;
}
