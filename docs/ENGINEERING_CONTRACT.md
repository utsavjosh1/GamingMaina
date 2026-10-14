# Gaming Outlet SaaS — Engineering Execution Contract

You are continuing work on an existing gaming-lounge management application.
The repository has already been investigated (see `docs/API_ARCHITECTURE_AUDIT.md`
and related docs). Do NOT repeat repository discovery unless new evidence
requires it. Treat the existing assessment as the working baseline, but verify
important claims against the repository before modifying code.

Objective: evolve the app from a working gaming-lounge MVP into a
production-grade, multi-tenant gaming-outlet operations SaaS.

The application must remain:

- Next.js, React, TypeScript
- Drizzle ORM, PostgreSQL, Supabase-hosted PostgreSQL
- Better-Auth

Supabase is infrastructure (PostgreSQL + Storage). Do NOT introduce
`@supabase/supabase-js` into normal application request paths.

---

# 1. Domain before features

Do not implement ERP modules merely because they appear in the sidebar.
The domain model comes first. Prioritize:

```text
Organization → Branch → Stations → Customers → Bookings → Sessions
  → Payments → Cash
```

Then: Staff, Memberships, Inventory, Expenses, Reports, Analytics, SaaS billing.

Do not create tables or abstractions for future functionality without a
concrete current use case.

# 2. One source of truth

One authoritative database schema, migration system, pricing engine,
authorization system, validation system, error system, financial model,
booking lifecycle, and session lifecycle. Remove stale implementations rather
than maintaining compatibility with dead architecture indefinitely.

# 3. Server is authoritative

Browser input is untrusted. The server determines identity, organization,
branch, permissions, pricing, availability, payment amount, financial state,
and session state. Never trust client-provided `organizationId`, `branchId`,
`role`, `permission`, `price`, `payment amount`, or station/customer ownership
where the server can derive them.

# 4. Tenant isolation is a security invariant

Every tenant-owned resource belongs to an organization. Every branch-scoped
resource belongs to a branch. Tenant scope is resolved from authenticated
membership, not browser input. Use explicit scoped data-access helpers.
A query accessing tenant data without explicit tenant/branch scope is an
architectural defect.

# 5. Database integrity matters

Enforce business-critical invariants with transactions, foreign keys, unique
and check constraints, indexes, conditional updates, advisory locks where
required, and idempotency constraints. Do not rely only on TypeScript.

# 6. Financial data is append-only

Never silently overwrite financial history. Prefer `Payment`,
`PaymentReversal`, `CashTransaction`, `Expense`, `Income`, `StockMovement`
over mutable balance fields. Derive balances from transaction history wherever
practical.

# 7. Idempotency is mandatory for dangerous mutations

At minimum: booking creation, session start/end, payment collection, refund,
cash transaction, inventory movement. A double-click or network retry must not
create duplicate financial/business events.

# 8. Explicit state machines

Booking and session transitions are defined centrally, not scattered across
actions and components. Suggested starting point (finalize with product before
implementing):

```text
Booking: pending → confirmed → checked_in → completed
         confirmed → cancelled | expired | no_show
Session: created → active ⇄ paused → completed
         active/paused → force_ended
```

Invalid transitions return structured conflicts.

# 9. One pricing engine

One authoritative, deterministic, thoroughly tested pricing service used by
both booking and session billing. Returns subtotal, discounts, package and
membership adjustments, tax if introduced, final amount, and line-item
explanation. No dependence on incidental row/array ordering for precedence.

# 10. Technology strategy

Preferred foundation: Drizzle, Better-Auth, Zod, React Hook Form +
@hookform/resolvers, Vitest (Playwright later), TanStack Query only where
server-state behavior benefits, Zustand only for genuine client UI state.
For every new dependency ask what problem it solves, whether the current
architecture already solves it, whether it reduces complexity, whether it
introduces a new source of truth, and whether the feature can stay simpler
without it. If unclear, do not add it.

# 11. Frontend architecture

Keep route files thin: load, authorize, render, compose feature components.
No SQL, pricing, authorization, financial, or state-machine logic in route
components. Feature components consume feature APIs.

# 12. Server mutations

Conceptual order: validate → authenticate → resolve organization → resolve
branch → authorize → load authoritative state → validate domain transition →
transaction → write domain state → write audit event → invalidate affected
cache → return typed result. Never skip authorization because the UI hides
the button.

# 13. Error architecture

Structured errors at minimum: `VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN,
NOT_FOUND, CONFLICT, INVALID_STATE, PAYMENT_ERROR, DATABASE_ERROR,
INTERNAL_ERROR`. Safe typed errors to clients; internals stay server-side.

# 14. Authentication architecture

Better-Auth owns authentication. Separate authentication from authorization
from business customer identity — a Better-Auth user is not automatically a
business customer. Remove the unsafe dev-bypass architecture: dev helpers must
be explicitly enabled, never work in production, never expose secrets, never
expose role config via public env vars, never leak into production auth.

# 15. Authorization architecture

`User → OrganizationMembership → org role → Branch membership → branch role
→ Permission`. Example permissions: `station.view/manage`, `session.start/
pause/end`, `booking.view/manage`, `payment.view/collect/refund`,
`cash.view/manage`, `expense.view/manage`, `inventory.view/manage`,
`customer.view/manage`, `staff.view/manage`, `reports.view`,
`organization.manage`, `branch.manage`. Evolve the exact set from product
requirements. Enforce server-side.

# 16. Multi-tenancy

Introduce `organizations, organization_memberships, branches,
branch_memberships, roles, permissions` only after single-venue behavior is
stabilized. Migration: create org → default branch → associate existing rows →
verify every tenant-owned row has ownership → make ownership mandatory →
enable scoped queries → add tenant-isolation tests. Do not sprinkle
`organization_id` without the authorization/data-access model.

# 17. Gaming operations core

First complete SaaS product = Floor (available / reserved / in-use / paused /
maintenance / offline) + Bookings (view, confirm, check in, assign station,
cancel, no-show, expiry) + Sessions (start, pause, resume, end, force-end) +
Payments (collect, method, reference, refund, void, history) + Cash (open,
movement, close, count, expected, variance).

# 18. Cash model

Immutable transactions, not a mutable number:

```text
Opening + Cash Sales + Deposits + Adjustments
  - Expenses - Withdrawals - Refunds = Expected Cash
Expected vs Counted = Variance (recorded at close, history never rewritten)
```

# 19. Inventory

Movement history (`purchase, sale, damage, adjustment, return, transfer`) is
the source of truth. Quantity is a reconcilable projection, never just an
editable `stock = 37` field.

# 20. Audit

Every important mutation emits an audit event (`booking.created/cancelled/
checked_in/no_show`, `session.started/paused/resumed/completed`,
`payment.collected/refunded`, `cash.opened/closed/adjusted`,
`expense.created`, `inventory.adjusted`, `station.status_changed`,
`staff.permission_changed`). No secrets in audit metadata.

# 21. Testing strategy

Protect invariants, not coverage. Unit: pricing, availability, state
transitions, authorization, cash/financial math, validation. Integration:
concurrent booking, concurrent session end, payment idempotency, tenant
isolation, cash reconciliation. E2E eventually: sign in → book → check in →
assign → start → pause → resume → end → collect → close register.

# 22. Developer experience

A fresh clone must answer: how to run, how auth/DB work, where the booking
domain / permission checks / pricing live, how to add a mutation or migration,
how to run tests and seed data. Document only what exists.

# 23. Implementation workflow

`INVESTIGATE → MODEL → SPECIFY → TEST → IMPLEMENT → REVIEW → VALIDATE`.
Skills: `grill-with-docs, domain-modeling, to-spec,
improve-codebase-architecture, tdd, implement, code-review, diagnosing-bugs`;
`supabase, supabase-postgres-best-practices` for DB work; `to-tickets` once a
phase is specified. Do not invoke unrelated skills merely because they exist.

# 24. Phase execution (one phase at a time)

- **Phase 0:** migration authority, env, validation, structured errors, tests,
  logging, docs.
- **Phase 1:** booking, session, pricing, payments, concurrency, idempotency, audit.
- **Phase 2:** booking lifecycle, check-in, station assignment, floor, cash
  register + reconciliation.
- **Phase 3:** organizations, branches, memberships, roles, permissions,
  tenant isolation.
- **Phase 4:** customers, memberships, expenses, income, inventory.
- **Phase 5:** reporting, analytics, notifications, dashboards.
- **Phase 6 (only when operational SaaS is stable):** subscriptions, plans,
  usage limits, platform admin.

# 25. Definition of done

Domain clear · validation · authN + authZ · tenant scope · DB constraints ·
transaction boundaries · idempotency · audit · cache invalidation · invariant
tests · loading/error/conflict UI · docs · lint + typecheck + tests + build.

# 26. Agent behavior

Optimize for correctness, clarity, maintainability, security, DX. Do not make
silent product decisions. For genuine ambiguity state current behavior,
possible interpretations, architectural consequences, and a recommendation.
Never guess at financial or authorization behavior. No rewrites or abstractions
without concrete architectural or business reason.

# Target architecture

```text
              GAMING OUTLET OS — Organization
   Branches · Staff · Customers → Stations ← Bookings → Memberships
   → Sessions → Payments → Cash Register → Income / Expenses / Inventory
   → Reports / Analytics
```

Build progressively: trustworthy core → multi-tenant → business modules →
SaaS platform. MVP spine: `station → session → payment → cash reconciliation`.
