import React from "react";
import { getBranchProfile } from "./actions";
import { BranchClient } from "./BranchClient";
import { getActingContext } from "../actions";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Branch | Gaming Mania Delhi" };

export default async function BranchPage() {
  const [profile, acting] = await Promise.all([getBranchProfile(), getActingContext()]);
  return (
    <BranchClient
      initialProfile={profile}
      canManage={hasPermission(acting.effectiveRole, "branch.manage")}
    />
  );
}
