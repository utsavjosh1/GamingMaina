"use client";

import React from "react";
import {
  addProduct,
  getInventory,
  getStockHistory,
  recordStockMovement,
  setProductActive,
  type InventoryItem,
} from "./actions";
import { OpsAlert, OpsEmpty, OpsPanel } from "@/components/ui/OpsPrimitives";
import { cn } from "@/lib/utils";

const MOVEMENT_TYPES = [
  { id: "purchase", label: "Purchase (+)", sign: 1 },
  { id: "return", label: "Return (+)", sign: 1 },
  { id: "sale", label: "Sale (−)", sign: -1 },
  { id: "damage", label: "Damage (−)", sign: -1 },
  { id: "adjustment", label: "Adjustment (±)", sign: 0 },
] as const;

type History = Awaited<ReturnType<typeof getStockHistory>>;

const inputClass =
  "tnum w-full rounded-[10px] border border-white/[0.1] bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-[var(--erp-subtle)] focus:border-ember/60 focus:outline-none";
const selectClass =
  "rounded-[10px] border border-white/[0.1] bg-black/30 px-2.5 py-2.5 text-sm text-white focus:border-ember/60 focus:outline-none";
const labelClass = "mb-1.5 block text-[13px] font-medium text-[var(--erp-muted)]";

export function InventoryClient({
  initialItems,
  canManage,
}: {
  initialItems: InventoryItem[];
  canManage: boolean;
}) {
  const [items, setItems] = React.useState(initialItems);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<History | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [productName, setProductName] = React.useState("");
  const [unit, setUnit] = React.useState("pcs");
  const [reorder, setReorder] = React.useState("");

  const [moveType, setMoveType] = React.useState<string>("purchase");
  const [moveQty, setMoveQty] = React.useState("");
  const [moveNotes, setMoveNotes] = React.useState("");
  const moveKeyRef = React.useRef(crypto.randomUUID());

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const refresh = React.useCallback(async (selectId?: string) => {
    const fresh = await getInventory();
    setItems(fresh);
    if (selectId) {
      setHistory(await getStockHistory(selectId));
    }
  }, []);

  const select = React.useCallback(async (id: string) => {
    setSelectedId(id);
    setHistory(null);
    setError(null);
    try {
      setHistory(await getStockHistory(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load history");
    }
  }, []);

  const add = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const reorderLevel = reorder.trim() === "" ? 0 : Math.max(0, Math.floor(Number(reorder)));
      if (!Number.isFinite(reorderLevel)) throw new Error("Invalid reorder level");
      await addProduct({ name: productName.trim(), unit: unit.trim() || "pcs", reorderLevel });
      setProductName("");
      setUnit("pcs");
      setReorder("");
      await refresh();
      setNotice("Product added to the catalog.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product not added");
    } finally {
      setBusy(false);
    }
  }, [productName, reorder, refresh, unit]);

  const move = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const meta = MOVEMENT_TYPES.find((t) => t.id === moveType);
    const raw = Math.abs(Math.floor(Number(moveQty)));
    if (!meta || !Number.isFinite(raw) || raw <= 0) {
      setError("Enter a valid quantity greater than zero.");
      return;
    }
    const quantity = meta.sign === 0 ? raw * (moveQty.trim().startsWith("-") ? -1 : 1) : raw * meta.sign;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await recordStockMovement({
        productId: selected.id,
        type: moveType,
        quantity,
        notes: moveNotes.trim() || undefined,
        idempotencyKey: moveKeyRef.current,
      });
      moveKeyRef.current = crypto.randomUUID();
      setMoveQty("");
      setMoveNotes("");
      await refresh(selected.id);
      setNotice(`Movement recorded. On hand: ${result.quantityAfter} ${selected.unit}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Movement not recorded");
    } finally {
      setBusy(false);
    }
  }, [moveNotes, moveQty, moveType, refresh, selected]);

  const toggleActive = React.useCallback(async (item: InventoryItem) => {
    setBusy(true);
    setError(null);
    try {
      await setProductActive(item.id, !item.isActive);
      await refresh(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const lowCount = items.filter((i) => i.lowStock).length;

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-6">
      <div>
        <p className="text-[13px] text-[var(--erp-muted)]">Stock · catalog &amp; movements</p>
        <h1 className="ops-heading mt-1 text-2xl font-semibold tracking-tight text-white">Inventory</h1>
        <p className="mt-1 text-sm text-[var(--erp-muted)]">
          {items.length} products{lowCount > 0 && <span className="text-amber-300"> · {lowCount} low on stock</span>}
        </p>
      </div>

      {error && <OpsAlert tone="error" title="Something went wrong.">{error}</OpsAlert>}
      {notice && <OpsAlert tone="success" title={notice}>{notice}</OpsAlert>}

      {canManage && (
        <OpsPanel title="Add product" description="History is append-only: deactivate instead of deleting.">
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
            <div>
              <label className={labelClass} htmlFor="product-name">Name</label>
              <input id="product-name" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Cold drinks" maxLength={120} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="product-unit">Unit</label>
              <input id="product-unit" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={24} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="product-reorder">Reorder at</label>
              <input id="product-reorder" inputMode="numeric" value={reorder} onChange={(e) => setReorder(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={busy} className="rounded-[10px] bg-ember px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
                {busy ? "Saving…" : "Add"}
              </button>
            </div>
          </form>
        </OpsPanel>
      )}

      <OpsPanel title="Catalog" description="Quantities derive from movement history, never stored.">
        {items.length === 0 ? <OpsEmpty title="No products yet" description="Add the first product to start tracking stock." /> : (
          <ul className="divide-y divide-white/[0.06]">
            {items.map((item) => (
              <li key={item.id} className="py-3">
                <button
                  type="button"
                  onClick={() => void select(item.id)}
                  className={cn("flex w-full items-center justify-between gap-3 text-left", !item.isActive && "opacity-50")}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {item.name}
                      {item.lowStock && <span className="ml-2 rounded-full border border-amber-400/30 px-2 py-0.5 text-[11px] font-medium text-amber-300">low stock</span>}
                      {!item.isActive && <span className="ml-2 text-[11px] text-[var(--erp-subtle)]">inactive</span>}
                    </span>
                    <span className="tnum block text-[13px] text-[var(--erp-muted)]">
                      {item.quantity} {item.unit} · reorder at {item.reorderLevel}
                    </span>
                  </span>
                  <span className={cn("tnum shrink-0 text-lg font-bold", item.lowStock ? "text-amber-300" : "text-white")}>
                    {item.quantity}
                  </span>
                </button>
                {canManage && selectedId === item.id && (
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleActive(item)}
                      className="text-[13px] text-[var(--erp-muted)] underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {item.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </OpsPanel>

      {selected && canManage && (
        <OpsPanel title={`Record movement · ${selected.name}`} description="Sales validate against live stock — no negative inventory.">
          <form onSubmit={move} className="grid gap-3 sm:grid-cols-[10rem_10rem_1fr_auto]">
            <div>
              <label className={labelClass} htmlFor="move-type">Type</label>
              <select id="move-type" value={moveType} onChange={(e) => setMoveType(e.target.value)} className={selectClass}>
                {MOVEMENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="move-qty">Quantity</label>
              <input id="move-qty" inputMode="numeric" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="move-notes">Notes</label>
              <input id="move-notes" value={moveNotes} onChange={(e) => setMoveNotes(e.target.value)} placeholder="Optional" maxLength={500} className={inputClass} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={busy} className="rounded-[10px] bg-ember px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
                {busy ? "Saving…" : "Record"}
              </button>
            </div>
          </form>
          {history && history.length > 0 && (
            <ul className="tnum mt-4 space-y-1.5 text-[13px] text-[var(--erp-muted)]">
              {history.slice(0, 10).map((h) => (
                <li key={h.id}>{h.type} · {h.quantity > 0 ? `+${h.quantity}` : h.quantity} {selected.unit}{h.notes ? ` · ${h.notes}` : ""}</li>
              ))}
            </ul>
          )}
        </OpsPanel>
      )}
    </div>
  );
}
