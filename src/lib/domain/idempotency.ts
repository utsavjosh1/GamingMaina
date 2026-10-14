/**
 * Idempotency for dangerous mutations (contract §7).
 * A client-supplied key is claimed inside the domain transaction:
 * first claim wins and runs; replays return the stored response.
 * A rolled-back transaction releases its claim automatically, so
 * retries after failures proceed as fresh attempts.
 */
import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { idempotencyKeys } from "@/lib/db/schema";
import { conflict } from "./errors";

type Store = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function claimIdempotencyKey(
  store: Store,
  input: { key: string; userId?: string | null; action: string; ttlHours?: number },
): Promise<{ replay: false } | { replay: true; response: unknown }> {
  const expiresAt = new Date(Date.now() + (input.ttlHours ?? 24) * 3_600_000);
  const [claimed] = await store
    .insert(idempotencyKeys)
    .values({
      key: input.key,
      userId: input.userId ?? null,
      action: input.action,
      status: "processing",
      expiresAt,
    })
    .onConflictDoNothing()
    .returning({ key: idempotencyKeys.key });
  if (claimed) return { replay: false };

  const [existing] = await store
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, input.key))
    .limit(1);
  if (!existing) {
    throw conflict("Duplicate request in progress — retry shortly", { action: input.action });
  }
  if (existing.status === "completed" && existing.response != null) {
    return { replay: true, response: existing.response };
  }
  if (existing.expiresAt.getTime() < Date.now()) {
    await store
      .update(idempotencyKeys)
      .set({ status: "processing", userId: input.userId ?? null, action: input.action, expiresAt, response: null })
      .where(eq(idempotencyKeys.key, input.key));
    return { replay: false };
  }
  throw conflict("Duplicate request in progress — retry shortly", { action: input.action });
}

export async function completeIdempotencyKey(store: Store, key: string, response: unknown) {
  await store
    .update(idempotencyKeys)
    .set({
      status: "completed",
      response: response as typeof idempotencyKeys.$inferInsert.response,
    })
    .where(eq(idempotencyKeys.key, key));
}
