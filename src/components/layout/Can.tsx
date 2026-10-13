import type { Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/lib/supabase/types";

export function Can({
  role,
  permission,
  children,
  fallback = null,
}: {
  role: UserRole;
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return hasPermission(role, permission) ? <>{children}</> : <>{fallback}</>;
}
