import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import type { Profile, UserRole } from "@/lib/supabase/types";

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return { db, user: session.user, session };
}

async function requireRole(roles: UserRole[]) {
  const { user, session } = await requireUser();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

  if (!profile || !roles.includes(profile.role as UserRole)) {
    throw new Error("Forbidden");
  }

  return { db, user, session, profile: toProfile(profile) };
}

function toProfile(profile: typeof profiles.$inferSelect): Profile {
  return {
    id: profile.id,
    full_name: profile.fullName,
    avatar_url: profile.avatarUrl,
    phone: profile.phone,
    role: profile.role as Profile["role"],
    membership_type: profile.membershipType as Profile["membership_type"],
    created_at: profile.createdAt.toISOString(),
  };
}

export function requireStaff() {
  return requireRole(["staff", "admin"]);
}

export function requireAdmin() {
  return requireRole(["admin"]);
}
