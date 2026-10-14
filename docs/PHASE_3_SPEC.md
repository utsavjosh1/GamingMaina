# Phase 3 Spec — Multi-tenancy, Memberships, Tenant Isolation

Status: IMPLEMENTED — migrations `0003_special_mulholland_black` (tenancy tables, seed, backfill, NOT NULL) and `0004_perpetual_loa` (per-branch open-register uniqueness) applied live; `requireRole` resolves from memberships; mutating actions gated by `requirePermission`; all reads/writes branch-scoped; `test:logic` 23/23, `db:verify` 8/8, `tsc`/`lint`/`build` green.
Contract refs: §3 (server authoritative), §4 (tenant isolation invariant),
§14–16 (authN/authZ/multi-tenancy), §20 (audit), §25 (DoD).

## 1. Domain model

```
Organization (gaming-mania-delhi)
 └─ Branch (rohini — more later)
     ├─ Stations, Bookings, Sessions, Payments, PricingRules, CashRegisters
     ├─ BranchMemberships (user → branch → branch role)
     └─ OrganizationMemberships (user → org → org role)
```

- `organizations`: id, name, slug UNIQUE, created_at.
- `branches`: id, org_id → organizations CASCADE, name, code, timezone
  default `Asia/Kolkata`, created_at. UNIQUE(org_id, code).
- `organization_memberships`: user_id → user CASCADE, org_id CASCADE,
  role ∈ {owner, admin, staff, customer}, created_at. UNIQUE(user_id, org_id).
- `branch_memberships`: user_id CASCADE, branch_id CASCADE,
  role ∈ {admin, staff, customer}, created_at. UNIQUE(user_id, branch_id).
- Branch scope added (NOT NULL after backfill): stations, bookings,
  sessions, payments, pricing_rules, cash_registers → `branch_id`.
- Org scope added: station_types → `org_id` (shared catalog).
- Audit: `org_id` + `branch_id` NULLABLE (cross-branch/platform events exist).
- `profiles.role` is DEPRECATED: backfilled FROM it once, never read again.
  Column removal is Phase 4 cleanup (separate drop migration, zero code refs).

## 2. Role resolution (server is authoritative, §3)

- `resolveMembership(userId)` → { org, branch, orgRole, branchRole }.
  Branch = user's branch membership, else the org's default (only) branch.
- `effectiveRole` = branchRole ?? (orgRole owner/admin → admin,
  staff → staff, else customer).
- `requireRole(roles)` checks `effectiveRole` — no `profiles.role` reads.
- Org owners/admins act as admin in every branch of their org.
- NEW `requirePermission(permission)`: `hasPermission(effectiveRole, …)`.
  Enforced on mutating actions with a matching permission
  (payment.collect, cash.manage, booking.manage, station/session verbs);
  reads keep requireStaff/requireAdmin gates.
- `permissions.ts` gains `booking.manage`, `cash.view`, `cash.manage`.
  UI (`Can`, `AdminShell`) unchanged — same `Profile.role` shape, now
  membership-resolved by `AdminLayout`.
- Dev bypass: `ensureDevGuestUser` also upserts org + branch memberships
  (role from `AUTH_DEV_BYPASS_ROLE`), else local admin locks itself out.

## 3. Migration 0003 (one transaction, idempotent guards)

1. CREATE organizations, branches, memberships (+ indexes, CHECKs, RLS enable).
2. ADD COLUMN branch_id/org_id NULLABLE + RLS enable on new tables.
3. SEED org (`gaming-mania-delhi`) + branch (`rohini`) by slug.
4. BACKFILL memberships FROM profiles.role (owner? No — map admin→admin,
   staff→staff, else customer; org role mirrors branch role).
5. BACKFILL branch_id/org_id on all existing rows to the default branch/org.
6. VERIFY: raise on any NULL branch_id/org_id or orphan membership.
7. SET NOT NULL. (Partial unique / FKs included.)

Rollback: full transaction — any failure reverts. Forward-only after merge.

## 4. Tenant scoping rules (§4 — every query scoped)

- Writes stamp `branch_id` from the acting context (never client input).
- Reads filter by acting branch: stations, bookings, sessions, payments,
  cash, availability joins, revenue.
- Pricing: branch-scoped rules only (shared catalog deferred).
- Station types: org-scoped (no branch filter within one org).
- `station → session → payment → cash` chain verified same-branch on write.

## 5. Tests (§21 — invariants, not coverage)

- Logic (mirror): effectiveRole matrix, permission matrix incl. new perms,
  scoping predicate (row visible iff row.branch == acting branch).
- Live (`db:verify`, rolled-back txs): second org/branch invisible to
  branch-scoped predicates; NOT NULL + CHECK + RLS present; dev guest holds
  admin membership; no orphan branch_ids.

## 6. Explicit non-goals (later phases)

Multi-org SaaS, branch switcher UI, invitations, custom roles, SaaS billing
(Phase 6), profiles.role column drop (Phase 4), public branch pages.

## 7. DoD for this phase

Domain clear · validation (slugs/codes) · membership authZ · branch scope on
all reads/writes · constraints + tx boundaries · idempotency untouched ·
audit carries org/branch · cache invalidation unchanged · isolation tests ·
loading/error UI unchanged · docs (this file) · lint + tsc + tests + build.
