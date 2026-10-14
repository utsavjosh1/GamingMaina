# Phase 6 Spec — Expenses / Income / Inventory (single-venue slice)

Status: IMPLEMENTED — migration `0006_chunky_the_hand` live (expenses, incomes, products, stock_movements, cash-leg links + RLS); cash auto-posts with single-posting uniques; advisory-locked stock guards; `/admin/expenses` + `/admin/inventory` UI; `test:logic` 26/26, `db:verify` all green incl. CHECKs, linkage, lock serialization; `tsc`/`lint`/`build` green.
Contract refs: §3 (server authoritative), §4 (isolation), §6 (append-only
finance), §7 (idempotency), §15 (`expense.view/manage`, `inventory.view/
manage`), §18 (cash equation), §19 (movement history), §20 (audit), §25.
Contract phase map: the second half of contract Phase 4. Reports/analytics
(contract Phase 5) and SaaS billing (contract Phase 6) are not this slice.

## 1. Goal

Money out (expenses), misc money in (income), and physical stock
(inventory) become first-class append-only records, wired into the cash
equation — with the same safety properties as payments: branch-scoped,
idempotent, audited, permission-gated.

## 2. Domain model (migration 0006, Drizzle sole authority)

- `expenses`: id, branch_id NOT NULL → branches, category enum
  (rent, utilities, salaries, maintenance, supplies, food_beverage,
  other), amount_paise int > 0 CHECK, vendor NULL, notes NULL,
  method ∈ (cash, upi, card, bank), actor_id → profiles NULL ON DELETE
  SET NULL, created_at. Index (branch_id, created_at).
- `incomes`: same shape, category enum (food_beverage, membership_fee,
  service, other). Covers misc counter income (snacks, printouts);
  session/booking revenue stays in `payments` — no double counting.
- `products`: id, branch_id NOT NULL, name, unit (default "pcs"),
  reorder_level int ≥ 0 default 0 (low-stock threshold — the concrete
  reader), is_active bool default true. UNIQUE(branch_id, name).
  No price column: money moves through `incomes`, quantities through
  `stock_movements` (mirrors the session/time vs payment/money split).
- `stock_movements`: id, product_id → products CASCADE, branch_id NOT
  NULL (denormalized for scoping, must equal product's branch — enforced
  in the domain tx, not just FK), type ∈ (purchase, sale, damage,
  adjustment, return), quantity int ≠ 0 CHECK with sign-per-type rule
  (purchase/return > 0; sale/damage < 0; adjustment either), actor,
  notes, idempotency key column? No — reuse `idempotency_keys` table
  with action `stock.move` (same mechanism as cash). created_at.
  Index (product_id, created_at), (branch_id, created_at).
- `cash_movements`: ADD nullable `expense_id` → expenses SET NULL and
  `income_id` → incomes SET NULL, each with a partial unique index
  (one posting per expense/income — mirrors `cash_movement_payment_uniq`).
- Quantity is a live `SUM()` projection, never a stored column (§19).
  No transfers (single branch — deferred with multi-branch), no receipts
  (no file story in this slice — notes only).
- RLS enabled, deny posture (server owns tables), same as 0002–0004.

## 3. Cash wiring (§18)

- Expense with method=cash → auto-post `cash_movements` (type `expense`,
  negative) to the open register in the same tx, linked via `expense_id`.
  No open register → expense records, movement skipped (same leniency as
  `collectPayment`, logged in response).
- Income with method=cash → auto-post type `deposit` (positive), linked
  via `income_id`. Session sales keep type `sale` — the equation and the
  cash page distinguish all three.
- Non-cash methods record without register movement. History never
  rewritten; corrections are new offsetting records.

## 4. Inventory rules (§19)

- Sale/damage/return-out validated against live computed quantity inside
  the tx; insufficient stock → structured conflict (no negative stock via
  sales). Adjustments may correct either way (that's their job).
- Concurrency: `pg_advisory_xact_lock(product_id)` per movement —
  same pattern as booking creation. Oversell races close.
- Deactivating a product (`is_active=false`) blocks new movements but
  preserves history. No product deletes (history must survive).

## 5. Permissions (§15)

- New: `expense.view`, `expense.manage`, `income.view`, `income.manage`,
  `inventory.manage` (`inventory.view` already exists).
- staff: + `expense.view`, `income.view` (reads; consistent with the revenue
  totals staff already see), `inventory.view` (already), `inventory.manage`
  (stock counts are floor work). No expense/income writes.
- admin: all. Reads (`getExpenses`, `getInventory`) on view perms;
  all writes on manage perms via `requirePermission`.

## 6. UI

- `/admin/expenses`: record expense / record income forms (method-aware
  cash hint), lists with month totals by category. Loading/error/conflict
  states, same Ops primitives.
- `/admin/inventory`: product list with live quantity + low-stock flags
  (qty ≤ reorder_level), add product, record movement, movement history.
- Nav entries gated `expense.view` / `inventory.view`. No POS selling
  surface (that's the POS module — explicit non-goal).

## 7. Audit (§20) + idempotency (§7)

- New canonical actions: `expense.created`, `income.created`,
  `inventory.movement` (contract's `inventory.adjusted` folds into this —
  one movement event with the type in metadata; purchases aren't
  "adjustments"). Plus `product.created`, `product.updated`.
- Client-minted idempotency keys on expense/income/movement creates,
  claimed in-tx via the shared `idempotency_keys` mechanism.

## 8. Tests (§21)

- Logic: sign-per-type validation matrix, cash-equation extension
  (expected = opening + sales + deposits − expenses − withdrawals −
  refunds), insufficient-stock predicate, category enums, audit
  drift-guard extended, permission gates string-pinned.
- Live (`db:verify`): CHECKs (amount > 0, qty ≠ 0, bogus category/type
  rejected), partial uniques, expense→cash posting linkage in a rolled-
  back tx, advisory-lock serialization smoke (two concurrent sale claims,
  one wins) — all rolled back.

## 9. Explicit non-goals

POS selling/checkout, stock transfers, receipts/attachments, supplier
management, purchase orders, reports/analytics pages (next slice), SaaS.

## 10. DoD

Migration 0006 applied live · cash equation holds with new legs ·
no-negative-stock proven · idempotent creates · audited · permission-gated
reads/writes · loading/error/conflict UI · `test:logic` + `db:verify`
green · lint + tsc + build green · this file marked IMPLEMENTED.
