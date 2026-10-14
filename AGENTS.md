# Gaming Mania — Agent Operating Contract

This repo is evolving from a working gaming-lounge MVP into a production-grade,
multi-tenant gaming-outlet operations SaaS. Read `docs/ENGINEERING_CONTRACT.md`
before any meaningful change. It is the authoritative execution contract.

## Stack (do not change without explicit product decision)

- Next.js + React + TypeScript
- Drizzle ORM + PostgreSQL hosted on Supabase
- Better-Auth
- Supabase = infrastructure only (Postgres + Storage). Do NOT introduce
  `@supabase/supabase-js` into normal application request paths.

## Active skill set (only these)

Use only these skills for this project, each for its defined purpose:

```text
grill-with-docs
domain-modeling
to-spec
improve-codebase-architecture
tdd
implement
code-review
diagnosing-bugs
to-tickets
supabase
supabase-postgres-best-practices
```

Workflow:

```text
grill-with-docs → domain-modeling → to-spec → improve-codebase-architecture
  → tdd → implement → code-review → diagnosing-bugs → to-tickets → next phase
```

Database work inserts this sub-loop:

```text
domain-modeling → supabase-postgres-best-practices → supabase
  → tdd → implement → code-review
```

## Deferred skills (do NOT invoke for this project)

These are installed globally but are out of scope here. Do not pull their
philosophies into this repo:

```text
agents-sdk, ask-matt, cloudflare, cloudflare-email-service, cloudflare-one,
cloudflare-one-migrations, durable-objects, git-guardrails-claude-code,
mcp-scripting, migrate-to-shoehorn, prototype, research,
resolving-merge-conflicts, sandbox-migrate-to-next, sandbox-next,
sandbox-stable, scaffold-exercises, setup-matt-pocock-skills,
setup-pre-commit, setup-ts-deep-modules, teach, to-questionnaire,
turnstile-spin, wait-what, web-perf, workers-best-practices, wrangler,
writing-*, wizard, claude-handoff
```

Exception: if a task genuinely requires one (e.g. a merge conflict blocks you),
say so explicitly and get confirmation. Default is no.

## Domain before features

Do not implement ERP modules because they appear in the sidebar. Build in this order:

```text
FOUNDATION → Booking + Availability → Station + Session → Pricing Engine
  → Payments → Cash Register → Multi-tenancy + RBAC
  → Customers / Staff / Branches → Expenses / Inventory
  → Reports / Analytics → SaaS Subscription (last)
```

Cash (`station → session → payment → cash reconciliation`) is core, not a
later add-on. Do not create tables for future modules without a concrete
current use case.

## Non-negotiable invariants

1. **Server is authoritative.** Never trust client-provided `organizationId`,
   `branchId`, `role`, `price`, or ownership. Derive from authenticated membership.
2. **Tenant isolation is a security invariant.** Every tenant-owned row belongs
   to an organization; every branch-scoped row belongs to a branch. Unscoped
   tenant queries are architectural defects.
3. **Financial data is append-only.** Prefer `Payment / PaymentReversal /
   CashTransaction / Expense / Income / StockMovement` over mutable balances.
4. **Idempotency for dangerous mutations:** booking creation, session
   start/end, payment collect/refund, cash and inventory movements.
5. **Explicit state machines** for bookings and sessions, defined centrally.
   Invalid transitions return structured conflicts.
6. **One pricing engine, one auth system, one error system, one migration system.**
   Remove stale implementations instead of carrying dead architecture.

## Definition of done (every feature)

Domain model clear · validation · authN + authZ enforced · tenant scope
correct · DB constraints + transaction boundaries · idempotency addressed ·
audit emitted · cache invalidated · invariant tests · loading/error/conflict UI ·
docs updated · `lint + tsc + tests + build` pass.

## Agent behavior

Optimize for correctness, clarity, maintainability, security, DX — not speed.
Do not guess at ambiguous financial or authorization behavior. Surface the
decision with options and consequences instead. Prefer explicit code a
competent TypeScript dev can understand in six months.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
