# Phase 4 Spec — RBAC Hardening (single-venue slice)

Status: IMPLEMENTED — migration `0005_amusing_captain_america` dropped `profiles.role` live (zero column refs); `/admin/staff` roster UI with `staff.view`/`staff.manage`/`organization.manage` gates, self-change + last-admin/owner rails, `staff.added/permission_changed/removed` audit; `db:verify` proves isolation live (second branch invisible, cross-branch writes match zero); `test:logic` 24/24, `tsc`/`lint`/`build` green.
Contract refs: §3 (server authoritative), §4 (isolation), §15 (authZ chain),
§16 (tenancy), §20 (audit), §21 (testing), §25 (DoD).

## 1. Goal

Close the RBAC loop Phase 3 left open: roles are manageable at runtime by
admins (not SQL), every grant/change/revoke is audited, the deprecated
`profiles.role` column is dropped, and tenant isolation is proven live —
not just by string drift-guards.

## 2. Scope

### 2a. Drop `profiles.role` (migration 0005)
- Precondition: zero code refs to `profiles.role` (only the schema comment
  and deprecated CHECK remain). Verify by grep before generating.
- Migration: `DROP CHECK profiles_role_check` (generated as drop-constraint),
  then `ALTER TABLE profiles DROP COLUMN role`. Forward-only.
- `profiles` table itself stays: `full_name`, `phone`, `membership_type`
  still drive booking display + pricing.

### 2b. Permission matrix completion (§15)
Add to `permissions.ts`: `staff.view`, `staff.manage`, `customer.manage`,
`reports.view`, `organization.manage`, `branch.manage`.
- customer: none (unchanged).
- staff: + `staff.view`, `customer.manage`, `reports.view`
  (staff see the roster and manage customers; they do NOT change roles).
- admin: all (unchanged pattern).
- Enforcement: staff roster page requires `staff.view`; every role
  grant/change/revoke requires `staff.manage`; org-role changes additionally
  require `organization.manage` (admin-only in practice).

### 2c. Staff management UI (`/admin/staff`)
- Roster: every org member → name/email, org role, branch role(s) in this
  org's branches. Read path gated by `staff.view`.
- Actions (each `staff.manage`, audited, idempotent where replayable):
  - Add existing user by email → org membership (default `staff`) + branch
    membership in acting branch. No email invitations (no mail infra —
    explicit non-goal). Unknown email → structured not-found, no enumeration
    beyond staff viewers.
  - Change branch role (admin/staff/customer), change org role
    (`organization.manage`).
  - Revoke branch membership / org membership (removing org membership
    cascades branch memberships via explicit deletes in one tx).
- Safety rails (fail closed, server-side):
  - Cannot change your own roles; cannot revoke yourself.
  - Cannot demote/remove the last branch admin of the acting branch.
  - Demoting an org owner requires `organization.manage` + a second owner
    must remain (single-org: at least one owner stays).
- Validation: Zod schemas for email + role enums. Invalid transitions →
  structured conflicts, same error system.

### 2d. Audit (§20)
New canonical actions: `staff.added`, `staff.permission_changed`,
`staff.removed` — all carrying actor, org_id, branch_id, old/new role.
Extend the `logic-test` audit drift-guard.

### 2e. Tenant-isolation live tests (§21, Phase 3 §5 gap)
Extend `db:verify` (all inside rolled-back txs):
- A second branch created in-tx is invisible to branch-scoped predicates
  (stations/bookings/payments filtered queries return zero for it).
- Cross-branch write blocked: update with wrong `branch_id` predicate
  matches zero rows (conditional-update pattern).
- Membership CHECKs reject bogus roles; unique membership pairs reject
  duplicates (23505).
- Dev guest still holds admin/admin (regression pin).

## 3. Explicit non-goals
Branch switcher UI (single branch — acting branch stays server-derived),
email invitations, custom roles / `roles`+`permissions` tables (§16 full
SaaS model), multi-org, SaaS billing, public staff pages.

## 4. DoD
Drop migration applied live · zero `profiles.role` refs · roster UI with
loading/error/conflict states · safety rails tested · audit drift-guard
extended · `db:verify` isolation tests green · `test:logic` green ·
lint + tsc + build green · this file marked IMPLEMENTED.
