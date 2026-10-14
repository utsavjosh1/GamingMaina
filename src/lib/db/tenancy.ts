/**
 * Tenancy resolution — server is authoritative (contract §3).
 * Branch scope always derives from memberships, never client input (§4).
 */
import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branchMemberships,
  branches,
  organizationMemberships,
  organizations,
} from "@/lib/db/schema";
import type { UserRole } from "@/lib/supabase/types";

export interface ActingContext {
  org: { id: string; name: string; slug: string };
  branch: { id: string; name: string; code: string };
  orgRole: string | null;
  branchRole: string | null;
  effectiveRole: UserRole;
}

/** Pure role fold — mirrored in scripts/logic-test.mjs. */
export function toEffectiveRole(orgRole: string | null, branchRole: string | null): UserRole {
  if (branchRole === "admin" || branchRole === "staff" || branchRole === "customer") return branchRole;
  if (orgRole === "owner" || orgRole === "admin") return "admin";
  if (orgRole === "staff") return "staff";
  return "customer";
}

export async function getDefaultOrg() {
  const [bySlug] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, "gaming-mania-delhi"))
    .limit(1);
  if (bySlug) return bySlug;
  const [first] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .limit(1);
  if (!first) throw new Error("No organization seeded");
  return first;
}

export async function getDefaultBranch(orgId?: string) {
  const org = orgId
    ? { id: orgId } as { id: string }
    : await getDefaultOrg();
  const [branch] = await db
    .select({ id: branches.id, name: branches.name, code: branches.code })
    .from(branches)
    .where(eq(branches.orgId, org.id))
    .limit(1);
  if (!branch) throw new Error("No branch seeded");
  return { orgId: org.id, ...branch };
}

export async function resolveActingContext(userId: string): Promise<ActingContext> {
  const org = await getDefaultOrg();
  const [orgMembership] = await db
    .select({ role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(and(
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.orgId, org.id),
    ))
    .limit(1);

  const [branchMembership] = await db
    .select({ role: branchMemberships.role, branchId: branchMemberships.branchId })
    .from(branchMemberships)
    .innerJoin(branches, eq(branchMemberships.branchId, branches.id))
    .where(and(
      eq(branchMemberships.userId, userId),
      eq(branches.orgId, org.id),
    ))
    .limit(1);

  let branch: ActingContext["branch"];
  if (branchMembership) {
    const [row] = await db
      .select({ id: branches.id, name: branches.name, code: branches.code })
      .from(branches)
      .where(eq(branches.id, branchMembership.branchId))
      .limit(1);
    branch = row ?? await getDefaultBranch(org.id).then((b) => ({ id: b.id, name: b.name, code: b.code }));
  } else {
    const fallback = await getDefaultBranch(org.id);
    branch = { id: fallback.id, name: fallback.name, code: fallback.code };
  }

  const orgRole = orgMembership?.role ?? null;
  const branchRole = branchMembership?.role ?? null;
  return { org, branch, orgRole, branchRole, effectiveRole: toEffectiveRole(orgRole, branchRole) };
}

/** Idempotent membership grant (dev bypass, seeds, future invites). */
export async function ensureMembership(
  userId: string,
  role: "owner" | "admin" | "staff" | "customer",
  branchRole?: "admin" | "staff" | "customer",
) {
  const org = await getDefaultOrg();
  const branch = await getDefaultBranch(org.id);
  const effectiveBranchRole = branchRole ?? (role === "owner" || role === "admin" ? "admin" : role);
  // Upsert: dev-bypass role switches and re-seeds must converge, not stick.
  await db.insert(organizationMemberships)
    .values({ userId, orgId: org.id, role })
    .onConflictDoUpdate({
      target: [organizationMemberships.userId, organizationMemberships.orgId],
      set: { role },
    });
  await db.insert(branchMemberships)
    .values({ userId, branchId: branch.id, role: effectiveBranchRole })
    .onConflictDoUpdate({
      target: [branchMemberships.userId, branchMemberships.branchId],
      set: { role: effectiveBranchRole },
    });
  return { org, branch };
}
