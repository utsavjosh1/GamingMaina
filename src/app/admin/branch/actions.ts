"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branchMemberships,
  branches,
  stations,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/server";
import { AUDIT_ACTIONS, writeAudit } from "@/lib/domain/audit";
import { notFound, validationError } from "@/lib/domain/errors";
import { updateBranchSchema } from "@/lib/domain/validation";

/**
 * Branch profile read/update (Phase 5, contract §15: branch.manage).
 * Code is immutable — seeds and backfills key on it.
 */

export interface BranchProfile {
  id: string;
  code: string;
  name: string;
  timezone: string;
  orgName: string;
  stationCount: number;
  staffCount: number;
}

export async function getBranchProfile(): Promise<BranchProfile> {
  const { org, branch } = await requirePermission("staff.view");
  const [row] = await db.select({ name: branches.name, timezone: branches.timezone })
    .from(branches).where(eq(branches.id, branch.id)).limit(1);
  const [stationRow] = await db.select({ n: sql<number>`count(*)` })
    .from(stations).where(eq(stations.branchId, branch.id));
  const [staffRow] = await db.select({ n: sql<number>`count(*)` })
    .from(branchMemberships).where(eq(branchMemberships.branchId, branch.id));
  return {
    id: branch.id,
    code: branch.code,
    name: row?.name ?? branch.name,
    timezone: row?.timezone ?? "Asia/Kolkata",
    orgName: org.name,
    stationCount: Number(stationRow?.n ?? 0),
    staffCount: Number(staffRow?.n ?? 0),
  };
}

export async function updateBranchProfile(raw: { name: string; timezone: string }) {
  const parsed = updateBranchSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid branch profile");
  const { user, org, branch } = await requirePermission("branch.manage");

  return db.transaction(async (tx) => {
    const [before] = await tx.select({ name: branches.name, timezone: branches.timezone })
      .from(branches)
      .where(and(eq(branches.id, branch.id), eq(branches.orgId, org.id)))
      .limit(1);
    if (!before) throw notFound("Branch not found");
    await tx.update(branches)
      .set({ name: parsed.data.name, timezone: parsed.data.timezone })
      .where(and(eq(branches.id, branch.id), eq(branches.orgId, org.id)));
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.branchUpdated,
      entityType: "branch",
      entityId: branch.id,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { ...before },
      newValue: { ...parsed.data },
    });
    return { id: branch.id, ...parsed.data };
  });
}
