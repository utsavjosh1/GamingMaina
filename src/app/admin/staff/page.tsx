import React from "react";
import { getStaffRoster } from "./actions";
import { StaffClient } from "./StaffClient";
import { getActingContext } from "../actions";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Staff | Gaming Mania Delhi" };

export default async function StaffPage() {
  const [roster, acting] = await Promise.all([getStaffRoster(), getActingContext()]);
  return (
    <StaffClient
      initialRoster={roster}
      canManage={hasPermission(acting.effectiveRole, "staff.manage")}
      branchName={acting.branch.name}
    />
  );
}
