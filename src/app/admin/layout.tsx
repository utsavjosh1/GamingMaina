import React from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireStaff } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin | Gaming Mania Delhi" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let staffContext: Awaited<ReturnType<typeof requireStaff>>;

  try {
    staffContext = await requireStaff();
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") redirect("/login");
    redirect("/");
  }

  const { profile } = staffContext;

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
