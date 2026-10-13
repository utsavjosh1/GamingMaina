import React from "react";
import { getCustomerDirectory } from "./actions";
import { CustomersClient } from "./CustomersClient";
import { getActingContext } from "../actions";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Customers | Gaming Mania Delhi" };

export default async function CustomersPage() {
  const [directory, acting] = await Promise.all([getCustomerDirectory(), getActingContext()]);
  return (
    <CustomersClient
      initialDirectory={directory}
      canManage={hasPermission(acting.effectiveRole, "customer.manage")}
    />
  );
}
