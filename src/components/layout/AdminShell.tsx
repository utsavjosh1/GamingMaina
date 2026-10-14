"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChartColumn,
  ChevronLeft,
  CircleHelp,
  CreditCard,
  LayoutGrid,
  LogOut,
  Menu,
  MonitorPlay,
  Package,
  ReceiptText,
  Search,
  Settings,
  Timer,
  UserSearch,
  Building2,
  Users,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { Profile } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const primaryNav: Array<{
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  permission: Permission;
}> = [
  { href: "/admin", label: "Floor", description: "Live stations", icon: LayoutGrid, permission: "dashboard.view" },
  { href: "/admin/stations", label: "Stations", description: "Setup & status", icon: MonitorPlay, permission: "station.view" },
  { href: "/admin/sessions", label: "Sessions", description: "Active timers", icon: Timer, permission: "session.view" },
  { href: "/admin/payments", label: "Payments", description: "Collect & history", icon: CreditCard, permission: "payment.collect" },
  { href: "/admin/customers", label: "Customers", description: "Directory & tiers", icon: UserSearch, permission: "customer.view" },
  { href: "/admin/staff", label: "Staff", description: "Roster & roles", icon: Users, permission: "staff.view" },
  { href: "/admin/branch", label: "Branch", description: "Profile & setup", icon: Building2, permission: "staff.view" },
  { href: "/admin/expenses", label: "Expenses", description: "Money in & out", icon: ReceiptText, permission: "expense.view" },
  { href: "/admin/inventory", label: "Inventory", description: "Stock & products", icon: Package, permission: "inventory.view" },
  { href: "/admin/reports", label: "Reports", description: "P&L & occupancy", icon: ChartColumn, permission: "reports.view" },
];

const soonModules = [
  { label: "Bookings", icon: CalendarDays, note: "Reservations queue" },
];

const bottomLinks = [
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/help", label: "Help", icon: CircleHelp },
];

export function AdminShell({ children, profile }: { children: React.ReactNode; profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const initials = (profile.full_name || profile.role || "GM")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const signOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  const visiblePrimary = primaryNav.filter((item) =>
    hasPermission(profile.role, item.permission),
  );

  return (
    <div className="min-h-screen bg-[var(--erp-bg)] text-slate-100">
      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-white/[0.08] bg-[var(--erp-bg-secondary)] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            collapsed && "lg:w-[76px]",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
            <Link href="/admin" className="flex min-w-0 items-center gap-2.5" aria-label="Gaming Mania floor">
              <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-ember text-sm font-black text-ember-ink">
                G
              </span>
              {!collapsed && (
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[14px] font-semibold tracking-tight text-white">
                    Gaming Mania
                  </span>
                  <span className="block truncate text-xs text-[var(--erp-muted)]">
                    Floor operations
                  </span>
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-white lg:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft className={cn("size-4 transition", collapsed && "rotate-180")} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white lg:hidden"
              aria-label="Close navigation"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {!collapsed && (
            <div className="shrink-0 border-b border-white/[0.08] p-3">
              <div className="flex items-center gap-3 rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2.5">
                <span className="size-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[13px] font-semibold text-white">Delhi · Rohini</span>
                  <span className="block truncate text-xs text-[var(--erp-muted)]">Shift open</span>
                </span>
              </div>
            </div>
          )}

          <nav className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="Operations">
            {!collapsed && (
              <p className="mb-1.5 px-2 text-xs font-medium text-[var(--erp-subtle)]">Operations</p>
            )}
            <ul className="space-y-1">
              {visiblePrimary.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm transition",
                        active
                          ? "bg-white/[0.07] font-semibold text-white"
                          : "font-medium text-slate-400 hover:bg-white/[0.05] hover:text-white",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <item.icon
                        className={cn("size-[18px] shrink-0", active ? "text-ember-strong" : "text-slate-500")}
                        aria-hidden="true"
                      />
                      {!collapsed && (
                        <span className="min-w-0 leading-tight">
                          <span className="block truncate">{item.label}</span>
                          <span className="block truncate text-xs font-normal text-[var(--erp-subtle)]">
                            {item.description}
                          </span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {!collapsed && (
              <details className="group mt-4 rounded-[10px] border border-white/[0.06] bg-black/10">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[13px] font-medium text-slate-400 hover:text-white [&::-webkit-details-marker]:hidden">
                  <span>More modules</span>
                  <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-[11px] text-[var(--erp-subtle)]">
                    Soon
                  </span>
                </summary>
                <ul className="space-y-1 px-2 pb-2">
                  {soonModules.map((item) => (
                    <li
                      key={item.label}
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-2 py-2 opacity-60"
                      title={`${item.label} — coming after the floor is stable`}
                    >
                      <item.icon className="size-4 shrink-0 text-slate-600" aria-hidden="true" />
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-[13px] text-slate-400">{item.label}</span>
                        <span className="block truncate text-xs text-[var(--erp-subtle)]">{item.note}</span>
                      </span>
                    </li>
                  ))}
                  <li className="px-2 py-1 text-xs leading-5 text-[var(--erp-subtle)]">
                    Customers, POS, inventory and reports unlock after bookings + cash are stable.
                  </li>
                </ul>
              </details>
            )}
          </nav>

          <div className="shrink-0 border-t border-white/[0.08] p-3">
            <ul className="space-y-1">
              {bottomLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={signOut}
                  title={collapsed ? "Sign out" : undefined}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-200",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <LogOut className="size-4 shrink-0" aria-hidden="true" />
                  {!collapsed && <span>Sign out</span>}
                </button>
              </li>
            </ul>
            {!collapsed && (
              <div className="mt-3 flex items-center gap-3 rounded-[12px] border border-white/[0.08] bg-black/20 p-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-ember/15 text-xs font-semibold text-ember-strong">
                  {initials}
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[13px] font-semibold text-white">
                    {profile.full_name || "Staff member"}
                  </p>
                  <p className="truncate text-xs capitalize text-[var(--erp-muted)]">
                    {profile.role} · on shift
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {mobileOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-white/[0.08] bg-[var(--erp-bg)]/90 px-4 backdrop-blur-lg lg:gap-3 lg:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <p className="hidden min-w-0 flex-1 truncate text-sm text-[var(--erp-muted)] lg:block">
              Delhi · Rohini <span className="mx-1.5 text-slate-700">/</span>
              <span className="font-medium text-slate-200">{currentTitle(pathname)}</span>
            </p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("gamingmania:open-command"))}
              className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 text-left text-sm text-[var(--erp-muted)] transition hover:bg-white/[0.06] hover:text-slate-200 lg:max-w-sm"
            >
              <Search className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Search stations, sessions…</span>
              <kbd className="ml-auto hidden shrink-0 rounded border border-white/[0.1] px-1.5 py-0.5 text-[11px] text-[var(--erp-subtle)] sm:inline">
                ⌘K
              </kbd>
            </button>
            <button
              type="button"
              className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Notifications, 1 unread"
            >
              <Bell className="size-4" aria-hidden="true" />
              <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
            </button>
          </header>
          <main className="min-w-0 flex-1 p-4 lg:p-6 xl:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

function currentTitle(pathname: string) {
  if (pathname === "/admin") return "Floor";
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "Floor";
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
