import type { UserRole } from "@/lib/supabase/types";

export type Permission =
  | "dashboard.view"
  | "station.view"
  | "station.start_session"
  | "station.end_session"
  | "station.update_status"
  | "session.view"
  | "session.pause_resume"
  | "payment.collect"
  | "reservation.view"
  | "booking.manage"
  | "cash.view"
  | "cash.manage"
  | "customer.view"
  | "customer.manage"
  | "staff.view"
  | "staff.manage"
  | "organization.manage"
  | "branch.manage"
  | "expense.view"
  | "expense.manage"
  | "income.view"
  | "income.manage"
  | "inventory.view"
  | "inventory.manage"
  | "membership.view"
  | "wallet.view"
  | "pos.sell"
  | "pricing.view"
  | "maintenance.view"
  | "staff.view"
  | "analytics.view"
  | "reports.view"
  | "games.view"
  | "settings.view";

const permissionsByRole: Record<UserRole, ReadonlySet<Permission>> = {
  customer: new Set([]),
  staff: new Set([
    "dashboard.view",
    "station.view",
    "station.start_session",
    "station.end_session",
    "station.update_status",
    "session.view",
    "session.pause_resume",
    "payment.collect",
    "reservation.view",
    "booking.manage",
    "cash.view",
    "cash.manage",
    "customer.view",
    "customer.manage",
    "staff.view",
    "expense.view",
    "income.view",
    "membership.view",
    "wallet.view",
    "pos.sell",
    "inventory.view",
    "inventory.manage",
    "maintenance.view",
    "analytics.view",
    "reports.view",
    "games.view",
  ]),
  admin: new Set([
    "dashboard.view",
    "station.view",
    "station.start_session",
    "station.end_session",
    "station.update_status",
    "session.view",
    "session.pause_resume",
    "payment.collect",
    "reservation.view",
    "booking.manage",
    "cash.view",
    "cash.manage",
    "customer.view",
    "customer.manage",
    "staff.view",
    "staff.manage",
    "organization.manage",
    "branch.manage",
    "expense.view",
    "expense.manage",
    "income.view",
    "income.manage",
    "membership.view",
    "wallet.view",
    "pos.sell",
    "inventory.view",
    "inventory.manage",
    "pricing.view",
    "maintenance.view",
    "analytics.view",
    "reports.view",
    "games.view",
    "settings.view",
  ]),
};

export function hasPermission(role: UserRole, permission: Permission) {
  return permissionsByRole[role]?.has(permission) ?? false;
}
