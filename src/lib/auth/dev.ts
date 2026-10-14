import type { UserRole } from "@/lib/supabase/types";

// NOTE: src/lib/supabase/types.ts holds pure domain row types only.
// No @supabase/supabase-js client is used in request paths by design.

export const DEV_GUEST_USER_ID = "dev-guest-user";
export const DEV_GUEST_EMAIL = "dev.guest@example.local";
export const DEV_GUEST_NAME = "Dev Guest";

// Explicit opt-in only. Never enabled in production, never implied by
// missing Google OAuth creds (contract §14). Set AUTH_DEV_BYPASS=true
// locally to test as admin/staff without OAuth.
export function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_BYPASS === "true";
}

export function getDevAuthBypassRole(): UserRole {
  // Server-only env. Never expose role via NEXT_PUBLIC_* (contract §14).
  const role = process.env.AUTH_DEV_BYPASS_ROLE;
  return role === "customer" || role === "staff" || role === "admin" ? role : "admin";
}

export function getDevAuthBypassProfile() {
  return {
    id: DEV_GUEST_USER_ID,
    fullName: DEV_GUEST_NAME,
    avatarUrl: null,
    phone: null,
    role: getDevAuthBypassRole(),
    membershipType: "none" as const,
    createdAt: new Date().toISOString(),
  };
}
