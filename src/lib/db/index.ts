import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@127.0.0.1:5432/gaming_mania_unconfigured";

const client = postgres(connectionString, {
  max: 5,
  prepare: false,
});

export const db = drizzle(client, { schema });
