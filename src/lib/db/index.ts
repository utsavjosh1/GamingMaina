import "server-only";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Single data path: Next.js Server Actions/Route Handlers -> Drizzle ->
// Supabase-hosted Postgres (Session Pooler). No @supabase/supabase-js in
// request paths; that client is only for one-off Storage uploads in scripts/.
const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@127.0.0.1:5432/gaming_mania_unconfigured";

// Reuse the pool across HMR reloads in dev to avoid exhausting the
// Supabase Session Pooler (max ~ a handful of connections on free tier).
const globalForDb = globalThis as unknown as {
  __gamingManiaPostgres?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__gamingManiaPostgres ??
  postgres(connectionString, {
    // Supabase Session Pooler requires prepare:false (no prepared statements
    // over the pooler in transaction mode).
    prepare: false,
    // Keep the pool small and fast: server actions are short-lived.
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // Recycle connections so a stale pooler slot never hangs a request.
    max_lifetime: 60 * 30,
    // Fail fast instead of queuing behind a saturated pool.
    connection: { application_name: "gaming-mania-web" },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__gamingManiaPostgres = client;
}

export const db = drizzle(client, { schema });
