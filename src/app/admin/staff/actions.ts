"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  authUsers,
  branchMemberships,
  branches,
  organizationMemberships,
  profiles,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/server";
import { hasPermission } from "@/lib/permissions";
import { AUDIT_ACTIONS, writeAudit } from "@/lib/domain/audit";
import { conflict, notFound, validationError } from "@/lib/domain/errors";
import {
  addStaffSchema,
  changeRoleSchema,
  removeStaffSchema,
} from "@/lib/domain/validation";

/**
 * Staff + role management (Phase 4, contract §15).
 * All membership writes derive org/branch from the acting context —
 * never client input (§3, §4). Safety rails fail closed.
 */

export interface StaffRosterEntry {
  userId: string;
  name: string | null;
  email: string;
  orgRole: string;
  branches: Array<{ branchId: string; code: string; name: string; role: string }>;
}

export async function getStaffRoster(): Promise<StaffRosterEntry[]> {
  const { org } = await requirePermission("staff.view");
  const members = await db
    .select({
      userId: organizationMemberships.userId,
      orgRole: organizationMemberships.role,
      name: authUsers.name,
      email: authUsers.email,
      fullName: profiles.fullName,
    })
    .from(organizationMemberships)
    .innerJoin(authUsers, eq(organizationMemberships.userId, authUsers.id))
    .leftJoin(profiles, eq(profiles.id, authUsers.id))
    .where(eq(organizationMemberships.orgId, org.id));
  const branchRows = await db
    .select({
      userId: branchMemberships.userId,
      branchId: branchMemberships.branchId,
      role: branchMemberships.role,
      code: branches.code,
      name: branches.name,
    })
    .from(branchMemberships)
    .innerJoin(branches, eq(branchMemberships.branchId, branches.id))
    .where(eq(branches.orgId, org.id));
  const byUser = new Map<string, StaffRosterEntry>();
  for (const m of members) {
    byUser.set(m.userId, {
      userId: m.userId,
      name: m.fullName ?? m.name,
      email: m.email,
      orgRole: m.orgRole,
      branches: [],
    });
  }
  for (const b of branchRows) {
    byUser.get(b.userId)?.branches.push({
      branchId: b.branchId,
      code: b.code,
      name: b.name,
      role: b.role,
    });
  }
  return [...byUser.values()].sort((a, b) => a.email.localeCompare(b.email));
}

type StaffTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function countPeers(
  tx: StaffTx,
  kind: "branch-admin" | "org-owner",
  orgId: string,
  branchId: string,
  excludeUserId: string,
) {
  if (kind === "branch-admin") {
    const [row] = await tx
      .select({ n: sql<number>`count(*)` })
      .from(branchMemberships)
      .where(and(
        eq(branchMemberships.branchId, branchId),
        eq(branchMemberships.role, "admin"),
        ne(branchMemberships.userId, excludeUserId),
      ));
    return Number(row?.n ?? 0);
  }
  const [row] = await tx
    .select({ n: sql<number>`count(*)` })
    .from(organizationMemberships)
    .where(and(
      eq(organizationMemberships.orgId, orgId),
      eq(organizationMemberships.role, "owner"),
      ne(organizationMemberships.userId, excludeUserId),
    ));
  return Number(row?.n ?? 0);
}

export async function addStaff(raw: { email: string; orgRole?: string; branchRole?: string }) {
  const parsed = addStaffSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid staff entry");
  const { user, org, branch, effectiveRole } = await requirePermission("staff.manage");
  const { email, orgRole, branchRole } = parsed.data;
  // Granting org owner/admin is org administration, not day-to-day staffing.
  if ((orgRole === "owner" || orgRole === "admin") && !hasPermission(effectiveRole, "organization.manage")) {
    throw new Error("Forbidden");
  }
  const [target] = await db
    .select({ id: authUsers.id, email: authUsers.email })
    .from(authUsers)
    .where(sql`lower(${authUsers.email}) = ${email}`)
    .limit(1);
  if (!target) throw notFound("No account exists for this email");
  if (target.id === user.id) throw conflict("You cannot change your own roles");

  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ role: organizationMemberships.role })
      .from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.userId, target.id),
        eq(organizationMemberships.orgId, org.id),
      ))
      .limit(1);
    await tx.insert(organizationMemberships)
      .values({ userId: target.id, orgId: org.id, role: orgRole })
      .onConflictDoUpdate({
        target: [organizationMemberships.userId, organizationMemberships.orgId],
        set: { role: orgRole },
      });
    await tx.insert(branchMemberships)
      .values({ userId: target.id, branchId: branch.id, role: branchRole })
      .onConflictDoUpdate({
        target: [branchMemberships.userId, branchMemberships.branchId],
        set: { role: branchRole },
      });
    await writeAudit(tx, {
      actorId: user.id,
      action: existing ? AUDIT_ACTIONS.staffPermissionChanged : AUDIT_ACTIONS.staffAdded,
      entityType: "staff",
      entityId: target.id,
      orgId: org.id,
      branchId: branch.id,
      oldValue: existing ? { org_role: existing.role } : null,
      newValue: { email: target.email, org_role: orgRole, branch_role: branchRole },
    });
    return { userId: target.id, created: !existing };
  });
}

export async function changeStaffRole(raw: { userId: string; orgRole?: string; branchRole?: string }) {
  const parsed = changeRoleSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid role change");
  const { user, org, branch, effectiveRole } = await requirePermission("staff.manage");
  const { userId: targetId, orgRole, branchRole } = parsed.data;
  if (targetId === user.id) throw conflict("You cannot change your own roles");
  // Org-role changes are org administration (§15: organization.manage).
  if (orgRole !== undefined && !hasPermission(effectiveRole, "organization.manage")) {
    throw new Error("Forbidden");
  }

  return db.transaction(async (tx) => {
    const [membership] = await tx.select({ role: organizationMemberships.role })
      .from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.userId, targetId),
        eq(organizationMemberships.orgId, org.id),
      ))
      .limit(1);
    if (!membership) throw notFound("Staff member not found in this organization");
    const [branchMembership] = await tx.select({ role: branchMemberships.role })
      .from(branchMemberships)
      .where(and(
        eq(branchMemberships.userId, targetId),
        eq(branchMemberships.branchId, branch.id),
      ))
      .limit(1);

    // Last-admin / last-owner rails: the floor must always have an admin.
    if (branchRole !== undefined && branchMembership?.role === "admin" && branchRole !== "admin") {
      const peers = await countPeers(tx, "branch-admin", org.id, branch.id, targetId);
      if (peers === 0) throw conflict("Cannot demote the last admin of this branch");
    }
    if (orgRole !== undefined && membership.role === "owner" && orgRole !== "owner") {
      const peers = await countPeers(tx, "org-owner", org.id, branch.id, targetId);
      if (peers === 0) throw conflict("Cannot demote the last owner of this organization");
    }

    if (orgRole !== undefined) {
      await tx.update(organizationMemberships).set({ role: orgRole })
        .where(and(
          eq(organizationMemberships.userId, targetId),
          eq(organizationMemberships.orgId, org.id),
        ));
    }
    if (branchRole !== undefined) {
      if (!branchMembership) throw notFound("Staff member has no role in this branch");
      await tx.update(branchMemberships).set({ role: branchRole })
        .where(and(
          eq(branchMemberships.userId, targetId),
          eq(branchMemberships.branchId, branch.id),
        ));
    }
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.staffPermissionChanged,
      entityType: "staff",
      entityId: targetId,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { org_role: membership.role, branch_role: branchMembership?.role ?? null },
      newValue: { org_role: orgRole ?? membership.role, branch_role: branchRole ?? branchMembership?.role ?? null },
    });
    return { userId: targetId };
  });
}

export async function removeStaff(raw: { userId: string }) {
  const parsed = removeStaffSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid request");
  const { user, org, branch } = await requirePermission("staff.manage");
  const targetId = parsed.data.userId;
  if (targetId === user.id) throw conflict("You cannot remove yourself");

  return db.transaction(async (tx) => {
    const [membership] = await tx.select({ role: organizationMemberships.role })
      .from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.userId, targetId),
        eq(organizationMemberships.orgId, org.id),
      ))
      .limit(1);
    if (!membership) throw notFound("Staff member not found in this organization");
    const [branchMembership] = await tx.select({ role: branchMemberships.role })
      .from(branchMemberships)
      .where(and(
        eq(branchMemberships.userId, targetId),
        eq(branchMemberships.branchId, branch.id),
      ))
      .limit(1);
    if (branchMembership?.role === "admin") {
      const peers = await countPeers(tx, "branch-admin", org.id, branch.id, targetId);
      if (peers === 0) throw conflict("Cannot remove the last admin of this branch");
    }
    if (membership.role === "owner") {
      const peers = await countPeers(tx, "org-owner", org.id, branch.id, targetId);
      if (peers === 0) throw conflict("Cannot remove the last owner of this organization");
    }
    // Explicit deletes in one tx: org removal cascades branch roles logically.
    await tx.delete(branchMemberships)
      .where(and(
        eq(branchMemberships.userId, targetId),
        eq(branchMemberships.branchId, branch.id),
      ));
    const remaining = await tx.select({ branchId: branchMemberships.branchId })
      .from(branchMemberships)
      .innerJoin(branches, eq(branchMemberships.branchId, branches.id))
      .where(and(
        eq(branchMemberships.userId, targetId),
        eq(branches.orgId, org.id),
      ))
      .limit(1);
    if (remaining.length === 0) {
      await tx.delete(organizationMemberships)
        .where(and(
          eq(organizationMemberships.userId, targetId),
          eq(organizationMemberships.orgId, org.id),
        ));
    }
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.staffRemoved,
      entityType: "staff",
      entityId: targetId,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { org_role: membership.role, branch_role: branchMembership?.role ?? null },
      newValue: { status: "removed" },
    });
    return { userId: targetId };
  });
}
