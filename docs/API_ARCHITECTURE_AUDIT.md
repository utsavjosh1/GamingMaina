# Gaming Mania Delhi — Production API & Backend Architecture Audit

## 1. System Architecture Map

```
CLIENT LAYER (Next.js 16 App Router)
  │
  ├── Server Components (Renders Initial Data directly from DB queries)
  │     ├── page.tsx ─────────────► getStationTypeAvailability()
  │     ├── dashboard/page.tsx ───► getUserBookings(userId)
  │     └── admin/page.tsx ───────► getBookingsForDate() + getAllStations()
  │
  ├── Server Actions (Zero client-side HTTP roundtrips)
  │     ├── createBooking() ──────► Advisory Lock + Availability Validation + Insert
  │     ├── cancelBooking() ──────► User Ownership Verification + Status Update
  │     ├── startSession() ───────► Station Status ('in_use') + Session Insert
  │     └── collectPayment() ─────► Transactional Amount Match + Receipt Update
  │
  └── Route Handlers
        ├── /api/auth/[...all] ───► Better-Auth Session & OAuth Dispatch
        ├── /api/profile ─────────► Session Verification & Role Fetch
        └── /api/health ──────────► DB Ping & Delhi Time Sync Telemetry
```

---

## 2. Concurrency Safety & Advisory Locking

When multiple users attempt to reserve the last available station in the same time slot simultaneously:
- `createBooking` executes PostgreSQL transaction-level advisory locks via:
  ```sql
  SELECT pg_advisory_xact_lock(hashtextextended(concat(station_type_id, ':', booking_date), 0));
  ```
- This serializes concurrent checks for `(station_type_id, booking_date)` within the transaction, completely preventing race conditions or double-bookings without deadlocking other stations.

---

## 3. Database Indexes Optimization

The following composite indexes are added in `src/lib/db/schema.ts` to transform sequential table scans into fast B-tree index lookups:

| Table | Index Name | Columns Indexed | Purpose |
| :--- | :--- | :--- | :--- |
| `bookings` | `bookings_station_type_date_status_idx` | `(stationTypeId, bookingDate, status)` | Fast slot availability computation during booking |
| `bookings` | `bookings_user_id_date_idx` | `(userId, bookingDate)` | Player dashboard booking history retrieval |
| `sessions` | `sessions_status_started_at_idx` | `(status, startedAt)` | Ops dashboard active session polling |
| `payments` | `payments_status_created_at_idx` | `(paymentStatus, createdAt)` | Daily revenue calculation & payment reconciliation |
| `stations` | `stations_type_status_idx` | `(stationTypeId, status)` | Station capacity counting per loadout |

---

## 4. Server-Only Boundary Enforcement

To prevent database credentials or server utility code from ever leaking into client bundles:
- `import "server-only";` is placed at the top of:
  - `src/lib/db/index.ts`
  - `src/lib/db/queries.ts`
  - `src/lib/auth/server.ts`
  - `src/lib/env.ts`

Any accidental client component import of these modules fails the Next.js compiler at build time.
