/**
 * Seed a default admin user for local testing (Better-Auth + profiles).
 *
 * Usage:
 *   AUTH_DEV_BYPASS=true node scripts/seed-admin.mjs
 *   ADMIN_EMAIL=admin@gamingmania.local ADMIN_NAME="Gaming Mania Admin" node scripts/seed-admin.mjs
 *
 * Creates:
 *   user(id, name, email) + profiles(id) + organization_memberships(admin)
 *   + branch_memberships(admin)
 * so you can sign in as admin from his perspective and verify
 * floor -> bookings -> sessions -> payments -> cash flows.
 * (Phase 3: authZ resolves from memberships, never profiles.role.)
 */
import dotenv from "dotenv";
import postgres from "postgres";
import { randomUUID } from "node:crypto";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL before seeding the admin user.");

const email = process.env.ADMIN_EMAIL || "admin@gamingmania.local";
const name = process.env.ADMIN_NAME || "Gaming Mania Admin";
const userId = process.env.ADMIN_USER_ID || randomUUID();

const sql = postgres(connectionString, { max: 1, prepare: false });

try {
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${userId}, ${name}, ${email}, true, now(), now())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = now()
  `;
  await sql`
    INSERT INTO profiles (id, full_name, membership_type, created_at)
    VALUES (${userId}, ${name}, 'none', now())
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name
  `;
  // Phase 3 memberships: org admin acts as admin in every branch.
  await sql`
    INSERT INTO organization_memberships (user_id, org_id, role)
    SELECT ${userId}, o.id, 'admin' FROM organizations o WHERE o.slug = 'gaming-mania-delhi'
    ON CONFLICT (user_id, org_id) DO UPDATE SET role = 'admin'
  `;
  await sql`
    INSERT INTO branch_memberships (user_id, branch_id, role)
    SELECT ${userId}, b.id, 'admin' FROM branches b
    JOIN organizations o ON o.id = b.org_id AND o.slug = 'gaming-mania-delhi'
    WHERE b.code = 'rohini'
    ON CONFLICT (user_id, branch_id) DO UPDATE SET role = 'admin'
  `;
  const rows = await sql`SELECT id, full_name FROM profiles WHERE id = ${userId}`;
  console.log("Admin seed applied:", rows[0]);
  console.log(`Sign in (Google OAuth) with ${email}, or set AUTH_DEV_BYPASS=true to test as admin locally.`);
} finally {
  await sql.end({ timeout: 5 });
}
