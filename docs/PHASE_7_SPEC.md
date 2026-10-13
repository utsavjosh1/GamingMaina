# Phase 7 Spec — Reports / Analytics (single-venue slice)

Status: IMPLEMENTED (recommended defaults) — `/admin/reports` with period P&L, daily bars, occupancy, utilization, category splits + derived operational alerts; `reports.view` for staff+admin; 60s branch cache; `test:logic` 27/27, `tsc`/`lint`/`build`/`db:verify` green.
Contract refs: §15 (`reports.view`), §21, §25. Contract phase map:
contract Phase 5 ("reporting, analytics, notifications, dashboards").
Notifications are a separate decision below; SaaS billing stays last.

## 1. Decisions needed

1. **Report set.** Proposed minimum useful set (all derivable today):
   - P&L: session/booking revenue + misc income − expenses = net,
     by day, with category breakdowns.
   - Occupancy: bookings/day by status, sessions/day + minutes,
     per-station utilization vs open hours (10:00–23:00).
   - Tender: revenue by method (cash/upi/card).
   Anything beyond this (cohorts, retention, forecasts) is deferred.
2. **Notifications.** No mail/SMS/push infra exists. Options:
   - (a) In-app operational alerts derived from live data (low stock —
     exists; register left open overnight; bookings expiring unhandled) —
     no new infra, concrete value now. RECOMMENDED.
   - (b) Defer notifications entirely until a channel is chosen.
3. **Who sees P&L.** Staff already see revenue totals and expense lines
   (`expense.view`), so `reports.view` for staff + admin adds no new
   sensitivity. Proposed: grant both (matrix already has `analytics.view`;
   add contract-literal `reports.view` alongside it).

## 2. Domain (no migration)

- Read-only aggregates over existing tables, branch-scoped to the acting
  branch, periods: today / 7d / 30d / current month (Delhi boundaries via
  existing date helpers — no new timezone logic).
- One `getReports(period)` action returning a single serializable payload:
  `{ revenue: {total, byDay[], byMethod}, income: {total, byCategory},
  expenses: {total, byCategory}, net, occupancy: {bookingsByDay,
  sessionsByDay, minutesByDay, utilizationByStation}, generatedAt }`.
- Short cache: `unstable_cache` 60s per (branch, period) — same pattern as
  station-type availability. Reads only; no idempotency, no audit writes
  (report views are not financial mutations; audit stays for money moves).
- Utilization denominator: stations × 13 open hours/day, prorated by
  period days; sessions contribute billable minutes (existing computation).

## 3. UI

- `/admin/reports`: period selector, P&L cards, daily bars (pure CSS/SVG —
  no chart dependency), category tables, utilization table. Nav entry gated
  `reports.view`. Loading/error states via existing Ops primitives.
- If decision 2(a): alerts panel on the floor overview (register open >
  N hours, low-stock count, unhandled expiring bookings) — read-only,
  derived, dismissible client-side only (no alert-state tables).

## 4. Tests (§21)

- Logic: P&L arithmetic mirror (net = rev + income − expenses), period
  boundary helper (Delhi day/month edges), utilization formula, permission
  string-pins for `reports.view` on the action + nav.
- Live: none beyond existing guards (no schema change; aggregates run
  against live shape in the smoke step only).

## 5. Explicit non-goals

Cohorts/retention/forecasts, CSV/PDF export (until asked), push/email/SMS,
alert persistence/escalation, SaaS/platform analytics.

## 6. DoD

Period reports correct against hand-computed fixtures · branch-scoped ·
cached + invalidated sanely · loading/error UI · `test:logic` green ·
lint + tsc + build green · this file marked IMPLEMENTED.
