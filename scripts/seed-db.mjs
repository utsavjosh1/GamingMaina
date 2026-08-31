import { readFile } from "node:fs/promises";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL before seeding the database.");

const sql = postgres(connectionString, { max: 1, prepare: false });
try {
  await sql.unsafe(await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"));
  console.log("Database seed applied.");
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENETUNREACH") {
    throw new Error("DATABASE_URL was loaded, but the direct Supabase database host is IPv6-only here. Use the Session Pooler URI from Supabase Dashboard → Connect.");
  }
  throw error;
} finally {
  await sql.end({ timeout: 5 });
}
