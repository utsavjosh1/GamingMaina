"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cashMovements,
  cashRegisters,
  expenses,
  incomes,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/server";
import { AUDIT_ACTIONS, writeAudit } from "@/lib/domain/audit";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/lib/domain/idempotency";
import { conflict, validationError } from "@/lib/domain/errors";
import { recordExpenseSchema, recordIncomeSchema } from "@/lib/domain/validation";

/**
 * Expenses + misc income (Phase 6, contract §6 append-only finance).
 * Cash legs auto-post to the open register in the same tx (§18) —
 * the collectPayment pattern, linked via expense_id/income_id.
 */

type MoneyTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function postCashLeg(
  tx: MoneyTx,
  opts: {
    branchId: string;
    type: "expense" | "deposit";
    amount: number;
    actorId: string;
    expenseId?: string;
    incomeId?: string;
    notes?: string | null;
  },
) {
  const [register] = await tx.select({ id: cashRegisters.id })
    .from(cashRegisters)
    .where(and(eq(cashRegisters.status, "open"), eq(cashRegisters.branchId, opts.branchId)))
    .limit(1);
  if (!register) return null;
  const [movement] = await tx.insert(cashMovements).values({
    registerId: register.id,
    type: opts.type,
    amount: opts.amount,
    expenseId: opts.expenseId ?? null,
    incomeId: opts.incomeId ?? null,
    actorId: opts.actorId,
    notes: opts.notes ?? null,
  }).returning({ id: cashMovements.id });
  return movement ?? null;
}

export async function getExpenses(limit = 50) {
  const { branch } = await requirePermission("expense.view");
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
  return db.select().from(expenses)
    .where(eq(expenses.branchId, branch.id))
    .orderBy(desc(expenses.createdAt))
    .limit(safeLimit);
}

export async function getExpenseTotals() {
  const { branch } = await requirePermission("expense.view");
  const rows = await db.select({
    category: expenses.category,
    total: sql<number>`sum(${expenses.amount})`,
    n: sql<number>`count(*)`,
  }).from(expenses)
    .where(and(
      eq(expenses.branchId, branch.id),
      sql`${expenses.createdAt} >= date_trunc('month', now())`,
    ))
    .groupBy(expenses.category);
  return rows.map((r) => ({ category: r.category, total: Number(r.total ?? 0), count: Number(r.n ?? 0) }));
}

export async function recordExpense(raw: {
  category: string; amount: number; method: string;
  vendor?: string; notes?: string; idempotencyKey?: string;
}) {
  const parsed = recordExpenseSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid expense");
  const data = parsed.data;
  const { user, org, branch } = await requirePermission("expense.manage");

  return db.transaction(async (tx) => {
    if (data.idempotencyKey) {
      const claim = await claimIdempotencyKey(tx, {
        key: data.idempotencyKey, userId: user.id, action: "expense.create", ttlHours: 24 * 90,
      });
      if (claim.replay) return claim.response as typeof expenses.$inferSelect & { cashPosted: boolean };
    }
    const [expense] = await tx.insert(expenses).values({
      branchId: branch.id,
      category: data.category,
      amount: data.amount,
      method: data.method,
      vendor: data.vendor?.trim() || null,
      notes: data.notes?.trim() || null,
      actorId: user.id,
    }).returning();
    if (!expense) throw conflict("Expense could not be recorded");
    // Cash leg: money physically left the drawer (§18). Skipped without an
    // open register — same leniency as collectPayment.
    let cashPosted = false;
    if (data.method === "cash") {
      try {
        const movement = await postCashLeg(tx, {
          branchId: branch.id, type: "expense", amount: -data.amount,
          actorId: user.id, expenseId: expense.id,
          notes: data.vendor?.trim() ? `Expense: ${data.vendor.trim()}` : "Expense",
        });
        cashPosted = Boolean(movement);
      } catch (error) {
        // Single-posting unique hit means a replay slipped past the claim —
        // treat as posted, never double-post.
        if (!(error && typeof error === "object" && "code" in error && error.code === "23505")) throw error;
        cashPosted = true;
      }
    }
    const response = { ...expense, cashPosted };
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.expenseCreated,
      entityType: "expense",
      entityId: expense.id,
      orgId: org.id,
      branchId: branch.id,
      newValue: { category: expense.category, amount: expense.amount, method: expense.method, cash_posted: cashPosted },
    });
    if (data.idempotencyKey) await completeIdempotencyKey(tx, data.idempotencyKey, response);
    return response;
  });
}

export async function getIncomes(limit = 50) {
  const { branch } = await requirePermission("income.view");
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
  return db.select().from(incomes)
    .where(eq(incomes.branchId, branch.id))
    .orderBy(desc(incomes.createdAt))
    .limit(safeLimit);
}

export async function getIncomeTotals() {
  const { branch } = await requirePermission("income.view");
  const rows = await db.select({
    category: incomes.category,
    total: sql<number>`sum(${incomes.amount})`,
    n: sql<number>`count(*)`,
  }).from(incomes)
    .where(and(
      eq(incomes.branchId, branch.id),
      sql`${incomes.createdAt} >= date_trunc('month', now())`,
    ))
    .groupBy(incomes.category);
  return rows.map((r) => ({ category: r.category, total: Number(r.total ?? 0), count: Number(r.n ?? 0) }));
}

export async function recordIncome(raw: {
  category: string; amount: number; method: string;
  vendor?: string; notes?: string; idempotencyKey?: string;
}) {
  const parsed = recordIncomeSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid income");
  const data = parsed.data;
  const { user, org, branch } = await requirePermission("income.manage");

  return db.transaction(async (tx) => {
    if (data.idempotencyKey) {
      const claim = await claimIdempotencyKey(tx, {
        key: data.idempotencyKey, userId: user.id, action: "income.create", ttlHours: 24 * 90,
      });
      if (claim.replay) return claim.response as typeof incomes.$inferSelect & { cashPosted: boolean };
    }
    const [income] = await tx.insert(incomes).values({
      branchId: branch.id,
      category: data.category,
      amount: data.amount,
      method: data.method,
      vendor: data.vendor?.trim() || null,
      notes: data.notes?.trim() || null,
      actorId: user.id,
    }).returning();
    if (!income) throw conflict("Income could not be recorded");
    let cashPosted = false;
    if (data.method === "cash") {
      try {
        const movement = await postCashLeg(tx, {
          branchId: branch.id, type: "deposit", amount: data.amount,
          actorId: user.id, incomeId: income.id,
          notes: data.vendor?.trim() ? `Income: ${data.vendor.trim()}` : "Income",
        });
        cashPosted = Boolean(movement);
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && error.code === "23505")) throw error;
        cashPosted = true;
      }
    }
    const response = { ...income, cashPosted };
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.incomeCreated,
      entityType: "income",
      entityId: income.id,
      orgId: org.id,
      branchId: branch.id,
      newValue: { category: income.category, amount: income.amount, method: income.method, cash_posted: cashPosted },
    });
    if (data.idempotencyKey) await completeIdempotencyKey(tx, data.idempotencyKey, response);
    return response;
  });
}
