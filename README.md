# Gaming Mania Delhi

Next.js App Router application for a gaming lounge booking and staff operations portal.

## Requirements

- Node.js 20+
- A Supabase project
- Google OAuth enabled in Supabase Auth

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these values in `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Apply the database with the Supabase CLI:

```bash
supabase db reset
# or apply supabase/migrations in order, then supabase/seed.sql
```

`supabase/seed.sql` contains only idempotent reference data. Authorization, RLS, audit triggers, booking allocation, session transitions, and payment reconciliation are migrations.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Prices are stored in paise. Booking dates and operating hours are Delhi local time (`Asia/Kolkata`); timestamps remain PostgreSQL timestamptz values.
