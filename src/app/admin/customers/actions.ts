"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  authUsers,
  bookings,
  branchMemberships,
  branches,
  organizationMemberships,
  payments,
  profiles,
  sessions,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/server";
import { AUDIT_ACTIONS, writeAudit } from "@/lib/domain/audit";
import { conflict, notFound, validationError } from "@/lib/domain/errors";
import { changeTierSchema } from "@/lib/domain/validation";

/**
 * Customer directory + tier management (Phase 5, contract §15).
 * Aggregates span the acting ORG's branches (a customer may play anywhere
 * in the org); tier changes are staff-gated and audited. Tiers affect
 * future quotes only — past charges are append-only history.
 */

export interface CustomerEntry {
  userId: string;
  name: string | null;
  email: string;
  phone: string | null;
  tier: string;
  bookings: number;
  sessions: number;
  lifetimePaid: number;
  lastActivity: string | null;
}

async function orgBranchIds(orgId: string) {
  const rows = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.orgId, orgId));
  return rows.map((r) => r.id);
}

export async function getCustomerDirectory(): Promise<CustomerEntry[]> {
  const { org } = await requirePermission("customer.view");
  const branchIds = await orgBranchIds(org.id);
  if (branchIds.length === 0) return [];

  const [bookingAgg, sessionAgg, paymentAgg, memberIds] = await Promise.all([
    db.select({
      userId: bookings.userId,
      n: sql<number>`count(*)`,
      last: sql<Date | null>`max(${bookings.createdAt})`,
    }).from(bookings).where(inArray(bookings.branchId, branchIds)).groupBy(bookings.userId),
    db.select({
      userId: sessions.userId,
      n: sql<number>`count(*)`,
      last: sql<Date | null>`max(${sessions.createdAt})`,
    }).from(sessions).where(inArray(sessions.branchId, branchIds)).groupBy(sessions.userId),
    db.select({
      userId: payments.userId,
      paid: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.paymentStatus} = 'paid'), 0)`,
      last: sql<Date | null>`max(${payments.createdAt})`,
    }).from(payments).where(inArray(payments.branchId, branchIds)).groupBy(payments.userId),
    db.select({ userId: organizationMemberships.userId })
      .from(organizationMemberships)
      .where(eq(organizationMemberships.orgId, org.id)),
  ]);

  const userIds = new Set<string>([
    ...bookingAgg.map((r) => r.userId).filter((v): v is string => v !== null),
    ...sessionAgg.map((r) => r.userId).filter((v): v is string => v !== null),
    ...paymentAgg.map((r) => r.userId).filter((v): v is string => v !== null),
    ...memberIds.map((r) => r.userId),
  ]);
  if (userIds.size === 0) return [];
  const ids = [...userIds];

  const users = await db.select({
    id: authUsers.id,
    name: authUsers.name,
    email: authUsers.email,
    fullName: profiles.fullName,
    phone: profiles.phone,
    tier: profiles.membershipType,
  })
    .from(authUsers)
    .leftJoin(profiles, eq(profiles.id, authUsers.id))
    .where(inArray(authUsers.id, ids));

  const bMap = new Map(bookingAgg.map((r) => [r.userId, r]));
  const sMap = new Map(sessionAgg.map((r) => [r.userId, r]));
  const pMap = new Map(paymentAgg.map((r) => [r.userId, r]));

  return users.map((u) => {
    const b = bMap.get(u.id);
    const s = sMap.get(u.id);
    const p = pMap.get(u.id);
    const lasts = [b?.last, s?.last, p?.last]
      .filter((d): d is Date => d instanceof Date)
      .map((d) => d.getTime());
    return {
      userId: u.id,
      name: u.fullName ?? u.name,
      email: u.email,
      phone: u.phone,
      tier: u.tier ?? "none",
      bookings: Number(b?.n ?? 0),
      sessions: Number(s?.n ?? 0),
      lifetimePaid: Number(p?.paid ?? 0),
      lastActivity: lasts.length > 0 ? new Date(Math.max(...lasts)).toISOString() : null,
    };
  }).sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));
}

export interface CustomerHistory {
  bookings: Array<{ id: string; date: string; start: string; end: string; status: string; price: number }>;
  sessions: Array<{ id: string; stationId: string; status: string; startedAt: string }>;
  payments: Array<{ id: string; amount: number; method: string | null; status: string; createdAt: string }>;
}

export async function getCustomerHistory(userId: string): Promise<CustomerHistory> {
  const { org } = await requirePermission("customer.view");
  const branchIds = await orgBranchIds(org.id);
  if (branchIds.length === 0) return { bookings: [], sessions: [], payments: [] };
  const [bRows, sRows, pRows] = await Promise.all([
    db.select({
      id: bookings.id, date: bookings.bookingDate, start: bookings.startTime,
      end: bookings.endTime, status: bookings.status, price: bookings.estimatedPrice,
    }).from(bookings)
      .where(and(eq(bookings.userId, userId), inArray(bookings.branchId, branchIds)))
      .orderBy(desc(bookings.createdAt)).limit(10),
    db.select({
      id: sessions.id, stationId: sessions.stationId, status: sessions.status, startedAt: sessions.startedAt,
    }).from(sessions)
      .where(and(eq(sessions.userId, userId), inArray(sessions.branchId, branchIds)))
      .orderBy(desc(sessions.createdAt)).limit(10),
    db.select({
      id: payments.id, amount: payments.amount, method: payments.paymentMethod,
      status: payments.paymentStatus, createdAt: payments.createdAt,
    }).from(payments)
      .where(and(eq(payments.userId, userId), inArray(payments.branchId, branchIds)))
      .orderBy(desc(payments.createdAt)).limit(10),
  ]);
  return {
    bookings: bRows.map((r) => ({ id: r.id, date: r.date, start: r.start, end: r.end, status: r.status, price: r.price })),
    sessions: sRows.map((r) => ({ id: r.id, stationId: r.stationId, status: r.status, startedAt: r.startedAt.toISOString() })),
    payments: pRows.map((r) => ({ id: r.id, amount: r.amount, method: r.method, status: r.status, createdAt: r.createdAt.toISOString() })),
  };
}

export async function changeCustomerTier(raw: { userId: string; tier: string }) {
  const parsed = changeTierSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid tier change");
  const { user, org, branch } = await requirePermission("customer.manage");
  const { userId: targetId, tier } = parsed.data;

  return db.transaction(async (tx) => {
    const [account] = await tx.select({ id: authUsers.id })
      .from(authUsers).where(eq(authUsers.id, targetId)).limit(1);
    if (!account) throw notFound("Customer not found");
    // Staff/admin roles change in /admin/staff — tiers are for customers.
    const elevated = await tx.select({ role: branchMemberships.role })
      .from(branchMemberships)
      .innerJoin(branches, eq(branchMemberships.branchId, branches.id))
      .where(and(
        eq(branchMemberships.userId, targetId),
        eq(branches.orgId, org.id),
        inArray(branchMemberships.role, ["admin", "staff"]),
      ))
      .limit(1);
    if (elevated.length > 0) {
      throw conflict("Staff roles change in Staff, not Customers", { userId: targetId });
    }
    const [before] = await tx.select({ tier: profiles.membershipType })
      .from(profiles).where(eq(profiles.id, targetId)).limit(1);
    await tx.insert(profiles)
      .values({ id: targetId, membershipType: tier })
      .onConflictDoUpdate({ target: profiles.id, set: { membershipType: tier } });
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.customerUpdated,
      entityType: "customer",
      entityId: targetId,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { tier: before?.tier ?? "none" },
      newValue: { tier },
    });
    return { userId: targetId, tier };
  });
}
