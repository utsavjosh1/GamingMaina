# Gaming Mania Delhi

Next.js App Router application for a gaming lounge booking and staff operations portal.

## Requirements

- Node.js 20+
- A Supabase project (Postgres and Storage)
- Google OAuth credentials

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these values in `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server-only database and Better Auth configuration
DATABASE_URL=<Supabase Session Pooler connection URI>
BETTER_AUTH_SECRET=generate-a-random-secret-at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Only for the one-off upload command; never prefix this with NEXT_PUBLIC_.
SUPABASE_SECRET_KEY=sb_secret_your-key
```

Apply the Drizzle migration, then seed and upload the media:

```bash
npm run db:migrate
npm run db:seed
npm run media:upload
```

`0003_media_storage.sql` creates the public `media` bucket with a 10 MB image limit. Files are served from Supabase Storage's CDN with one-year cache headers; Next Image still handles responsive browser sizing. The upload command requires a server-only `SUPABASE_SECRET_KEY` and must never run in the browser or deployment client.

Use the Session Pooler URI from Supabase Dashboard → Connect for `DATABASE_URL` when the direct `db.<project-ref>.supabase.co` host is IPv6-only. `supabase/seed.sql` contains only idempotent reference data. Better Auth stores users and sessions in Postgres through Drizzle; application authorization is enforced in server actions and layouts. The generated Drizzle migration in `drizzle/0000_initial.sql` includes the application schema, security constraints, and Storage bucket setup.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Prices are stored in paise. Booking dates and operating hours are Delhi local time (`Asia/Kolkata`); timestamps remain PostgreSQL timestamptz values.

Google OAuth callback URLs:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://your-domain.com/api/auth/callback/google`
