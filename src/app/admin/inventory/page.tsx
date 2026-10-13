import React from "react";
import { getInventory } from "./actions";
import { InventoryClient } from "./InventoryClient";
import { getActingContext } from "../actions";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Inventory | Gaming Mania Delhi" };

export default async function InventoryPage() {
  const [items, acting] = await Promise.all([getInventory(), getActingContext()]);
  return (
    <InventoryClient
      initialItems={items}
      canManage={hasPermission(acting.effectiveRole, "inventory.manage")}
    />
  );
}
