# Phase 5 Spec — Customers + Branches (single-venue slice)

Status: IMPLEMENTED — `/admin/customers` directory (org-wide aggregates, history, tier changes via `customer.manage`, staff-role guard) + `/admin/branch` profile read/update (`branch.manage`, code immutable), `customer.updated`/`branch.updated` audit; `test:logic` 25/25, `tsc`/`lint`/`build`/`db:verify` green. Caught live: timezone allowlist would have rejected `Asia/Kolkata` (V8 lists `Asia/Calcutta`) — validates by `Intl.DateTimeFormat` construction instead.
Contract refs: §3 (server authoritative), §4 (isolation), §15
(`customer.view/manage`, `branch.manage`), §20 (audit), §25 (DoD).
Contract phase map: this is the Customers + Branches half of contract
Phase 4 ("customers, memberships, expenses, income, inventory").
Expenses/income/inventory are the next slice, not this one.

## 1. Goal

Staff can see every customer of their branch (visits, spend, tier) and
manage membership tiers that drive pricing; admins can maintain the branch
profile. No new tables — profiles + aggregates + branches cover it.

## 2. Customers (`/admin/customers`)

- Directory: one row per customer = auth user with ANY booking/session in
  the acting org's branches OR an org membership. Columns: name, email,
  phone, tier, bookings count, sessions count, lifetime paid (paise),
  last activity. Sorted by last activity desc. Gated by `customer.view`.
- Aggregates computed live from branch-scoped bookings/sessions/payments
  (join via org branches, not acting branch only — a customer may play at
  any branch of the org; staff.view roster stays branch-scoped).
- Detail: selecting a row shows tier control + history (recent bookings,
  sessions, payments) on the same page. No separate route.
- Tier change (none/silver/gold/platinum): `customer.manage`, Zod enum,
  audited as `customer.updated` with old/new tier. Tier feeds the pricing
  engine's membership_discount rules — changing it changes future quotes
  only, never past charges (append-only finance, §18-adjacent).
- Safety: cannot change tier of users with staff/admin branch roles from
  this surface (roles change in /admin/staff). Unknown user → not-found.
- No wallet, no notes, no customer self-edit in this slice (non-goals).

## 3. Branches (`/admin/branch`)

- Profile read: acting branch code (immutable), name, timezone, org name,
  counts (stations, staff, customers). Gated by `staff.view`.
- Profile update (name, timezone): `branch.manage`, Zod (name 2–80 chars;
  timezone must be in `Intl.supportedValuesOf("timeZone")`), audited as
  `branch.updated` with old/new. Code/slug immutable — renames never break
  backfills or seeds that key on them.
- No branch creation/deletion UI (single venue; creation is a migration/
  seed concern until multi-branch lands). Explicit non-goal.

## 4. Audit (§20)
New canonical actions: `customer.updated`, `branch.updated` (actor, org,
branch, old/new). Extend the `logic-test` audit drift-guard.

## 5. Tests (§21)
- Logic: tier enum validation (bogus tier rejected), pricing still honors
  tiers (existing tests pin this), timezone validator accepts
  Asia/Kolkata + rejects garbage, branch code immutability (no update path
  touches code — string guard on actions file).
- Live (`db:verify` untouched — no schema change in this phase; nothing to
  prove at the constraint level).

## 6. Explicit non-goals
Expenses/income/inventory (next slice), wallet balances, customer notes,
customer self-service profile edit, branch create/delete/switcher,
public branch pages.

## 7. DoD
Directory + detail + tier change with loading/error/conflict UI ·
branch read/update gated + audited · audit drift-guard extended ·
`test:logic` green · lint + tsc + build green · this file marked IMPLEMENTED.
