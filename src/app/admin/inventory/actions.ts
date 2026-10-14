"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, stockMovements } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/server";
import { AUDIT_ACTIONS, writeAudit } from "@/lib/domain/audit";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/lib/domain/idempotency";
import { conflict, notFound, validationError } from "@/lib/domain/errors";
import { productSchema, recordStockMovementSchema } from "@/lib/domain/validation";

/**
 * Inventory (Phase 6, contract §19). Movement history is the source of
 * truth; quantity is a live SUM() projection, never stored. Sales validate
 * against live stock inside an advisory-locked tx — no negative stock.
 */

type InventoryTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function liveQuantity(tx: InventoryTx, productId: string) {
  const [row] = await tx.select({ qty: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)` })
    .from(stockMovements)
    .where(eq(stockMovements.productId, productId));
  return Number(row?.qty ?? 0);
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  reorderLevel: number;
  isActive: boolean;
  quantity: number;
  lowStock: boolean;
}

export async function getInventory(): Promise<InventoryItem[]> {
  const { branch } = await requirePermission("inventory.view");
  const rows = await db.select({
    id: products.id,
    name: products.name,
    unit: products.unit,
    reorderLevel: products.reorderLevel,
    isActive: products.isActive,
    quantity: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)`,
  }).from(products)
    .leftJoin(stockMovements, eq(stockMovements.productId, products.id))
    .where(eq(products.branchId, branch.id))
    .groupBy(products.id, products.name, products.unit, products.reorderLevel, products.isActive)
    .orderBy(products.name);
  return rows.map((r) => {
    const quantity = Number(r.quantity ?? 0);
    return {
      id: r.id,
      name: r.name,
      unit: r.unit,
      reorderLevel: r.reorderLevel,
      isActive: r.isActive,
      quantity,
      lowStock: r.isActive && quantity <= r.reorderLevel,
    };
  });
}

export async function getStockHistory(productId: string, limit = 50) {
  const { branch } = await requirePermission("inventory.view");
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
  return db.select().from(stockMovements)
    .where(and(eq(stockMovements.productId, productId), eq(stockMovements.branchId, branch.id)))
    .orderBy(desc(stockMovements.createdAt))
    .limit(safeLimit);
}

export async function addProduct(raw: { name: string; unit?: string; reorderLevel?: number }) {
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid product");
  const { user, org, branch } = await requirePermission("inventory.manage");
  try {
    const [product] = await db.insert(products).values({
      branchId: branch.id,
      name: parsed.data.name.trim(),
      unit: parsed.data.unit?.trim() || "pcs",
      reorderLevel: parsed.data.reorderLevel ?? 0,
    }).returning();
    if (!product) throw conflict("Product could not be added");
    await writeAudit(db, {
      actorId: user.id,
      action: AUDIT_ACTIONS.productCreated,
      entityType: "product",
      entityId: product.id,
      orgId: org.id,
      branchId: branch.id,
      newValue: { name: product.name, unit: product.unit, reorder_level: product.reorderLevel },
    });
    return product;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw conflict("A product with this name already exists", { name: parsed.data.name });
    }
    throw error;
  }
}

export async function setProductActive(productId: string, isActive: boolean) {
  if (typeof productId !== "string" || productId.length < 8) throw validationError("Invalid product");
  const { user, org, branch } = await requirePermission("inventory.manage");
  const [updated] = await db.update(products).set({ isActive })
    .where(and(eq(products.id, productId), eq(products.branchId, branch.id)))
    .returning({ id: products.id });
  if (!updated) throw notFound("Product not found");
  await writeAudit(db, {
    actorId: user.id,
    action: AUDIT_ACTIONS.productUpdated,
    entityType: "product",
    entityId: updated.id,
    orgId: org.id,
    branchId: branch.id,
    newValue: { is_active: isActive },
  });
  return { id: updated.id, isActive };
}

export async function recordStockMovement(raw: {
  productId: string; type: string; quantity: number; notes?: string; idempotencyKey?: string;
}) {
  const parsed = recordStockMovementSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Invalid movement");
  const data = parsed.data;
  const { user, org, branch } = await requirePermission("inventory.manage");

  return db.transaction(async (tx) => {
    if (data.idempotencyKey) {
      const claim = await claimIdempotencyKey(tx, {
        key: data.idempotencyKey, userId: user.id, action: "stock.move", ttlHours: 24 * 90,
      });
      if (claim.replay) return claim.response as typeof stockMovements.$inferSelect & { quantityAfter: number };
    }
    // Serialize per product: two concurrent sales must not both pass the
    // stock guard (same advisory-lock pattern as booking creation).
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`stock:${data.productId}`}, 0))`);
    const [product] = await tx.select()
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.branchId, branch.id)))
      .limit(1);
    if (!product) throw notFound("Product not found");
    if (!product.isActive) throw conflict("Product is inactive", { productId: product.id });
    // Branch denormalization guard: the movement lands where the product lives.
    const onHand = await liveQuantity(tx, product.id);
    if (data.quantity < 0 && onHand + data.quantity < 0) {
      throw conflict("Insufficient stock", { productId: product.id, onHand, requested: data.quantity });
    }
    const [movement] = await tx.insert(stockMovements).values({
      productId: product.id,
      branchId: branch.id,
      type: data.type,
      quantity: data.quantity,
      actorId: user.id,
      notes: data.notes?.trim() || null,
    }).returning();
    if (!movement) throw conflict("Movement could not be recorded");
    const response = { ...movement, quantityAfter: onHand + data.quantity };
    await writeAudit(tx, {
      actorId: user.id,
      action: AUDIT_ACTIONS.inventoryMovement,
      entityType: "stock_movement",
      entityId: movement.id,
      orgId: org.id,
      branchId: branch.id,
      oldValue: { on_hand: onHand },
      newValue: { type: movement.type, quantity: movement.quantity, on_hand_after: onHand + data.quantity },
    });
    if (data.idempotencyKey) await completeIdempotencyKey(tx, data.idempotencyKey, response);
    return response;
  });
}
