import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/supabase/types";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Not authenticated");
  return { supabase, user };
}

async function requireRole(roles: UserRole[]) {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, phone, role, membership_type, created_at")
    .eq("id", user.id)
    .single();

  if (error || !profile || !roles.includes(profile.role)) {
    throw new Error("Forbidden");
  }

  return { supabase, user, profile: profile as Profile };
}

export function requireStaff() {
  return requireRole(["staff", "admin"]);
}

export function requireAdmin() {
  return requireRole(["admin"]);
}
