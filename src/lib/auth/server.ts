import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DEV_GUEST_EMAIL, DEV_GUEST_NAME, DEV_GUEST_USER_ID, getDevAuthBypassRole, isDevAuthBypassEnabled } from "@/lib/auth/dev";
import { db } from "@/lib/db";
import { authUsers, profiles } from "@/lib/db/schema";
import { ensureMembership, resolveActingContext } from "@/lib/db/tenancy";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { Profile, UserRole } from "@/lib/supabase/types";

let devGuestUserPromise: Promise<void> | null = null;
let devGuestUserRole: UserRole | null = null;

async function ensureDevGuestUser(role: UserRole = getDevAuthBypassRole()) {
  if (devGuestUserPromise && devGuestUserRole === role) return devGuestUserPromise;

  devGuestUserRole = role;
  devGuestUserPromise = (async () => {
    const now = new Date();

    await db.insert(authUsers).values({
      id: DEV_GUEST_USER_ID,
      name: DEV_GUEST_NAME,
      email: DEV_GUEST_EMAIL,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: authUsers.id,
      set: {
        name: DEV_GUEST_NAME,
        email: DEV_GUEST_EMAIL,
        emailVerified: true,
        updatedAt: now,
      },
    });

    await db.insert(profiles).values({
      id: DEV_GUEST_USER_ID,
      fullName: DEV_GUEST_NAME,
      avatarUrl: null,
      phone: null,
      membershipType: "none",
      createdAt: now,
    }).onConflictDoUpdate({
      target: profiles.id,
      set: {
        fullName: DEV_GUEST_NAME,
        membershipType: "none",
      },
    });

    // Phase 3: the dev guest needs real memberships — roles no longer
    // resolve from profiles.role.
    await ensureMembership(
      DEV_GUEST_USER_ID,
      role === "customer" ? "customer" : role === "staff" ? "staff" : "admin",
    );
  })().catch((error) => {
    devGuestUserPromise = null;
    devGuestUserRole = null;
    throw error;
  });

  return devGuestUserPromise;
}

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) return { db, user: session.user, session };

  if (!isDevAuthBypassEnabled()) throw new Error("Not authenticated");

  await ensureDevGuestUser();
  return {
    db,
    user: {
      id: DEV_GUEST_USER_ID,
      name: DEV_GUEST_NAME,
      email: DEV_GUEST_EMAIL,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: null,
  };
}

async function requireRole(roles: UserRole[]) {
  const { user, session } = await requireUser();
  if (!session && isDevAuthBypassEnabled()) await ensureDevGuestUser(roles.includes("admin") ? "admin" : roles[0]);

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  // Phase 3: authZ resolves from memberships, never profiles.role (§4, §15).
  const ctx = await resolveActingContext(user.id);

  if (!roles.includes(ctx.effectiveRole)) {
    throw new Error("Forbidden");
  }

  return {
    db,
    user,
    session,
    profile: toProfile(profile, ctx.effectiveRole),
    org: ctx.org,
    branch: ctx.branch,
    effectiveRole: ctx.effectiveRole,
  };
}

/** Server-side permission gate (contract §15). Fails closed. */
export async function requirePermission(permission: Permission) {
  const { user, session } = await requireUser();
  const ctx = await resolveActingContext(user.id);
  if (!hasPermission(ctx.effectiveRole, permission)) {
    throw new Error("Forbidden");
  }
  return { db, user, session, ...ctx };
}

function toProfile(profile: typeof profiles.$inferSelect | undefined, effectiveRole: UserRole): Profile {
  return {
    id: profile?.id ?? "",
    full_name: profile?.fullName ?? null,
    avatar_url: profile?.avatarUrl ?? null,
    phone: profile?.phone ?? null,
    role: effectiveRole,
    membership_type: (profile?.membershipType as Profile["membership_type"] | undefined) ?? "none",
    created_at: profile?.createdAt.toISOString() ?? new Date(0).toISOString(),
  };
}

export function requireStaff() {
  return requireRole(["staff", "admin"]);
}

export function requireAdmin() {
  return requireRole(["admin"]);
}
