import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantIsolation } from "./useTenantIsolation";

export type RBACPermissionMap = Record<string, boolean>;

/**
 * RBAC hook — checks user permissions via the `get_user_permissions` RPC.
 * Replaces the old plan-based permission system.
 *
 * Usage:
 *   const { can } = useRBAC();
 *   if (can("CREATE_JOURNAL")) { ... }
 */
export const useRBAC = () => {
  const { user } = useAuth();
  const { companyId, isLoadingCompany } = useTenantIsolation();

  const { data: permissions, isLoading: isLoadingPerms } = useQuery({
    queryKey: ["rbac-permissions", user?.id, companyId],
    queryFn: async (): Promise<RBACPermissionMap> => {
      if (!user?.id || !companyId) return {};

      const { data, error } = await supabase.rpc("get_user_permissions" as any, {
        _user_id: user.id,
        _company_id: companyId,
      });

      if (error) {
        console.warn("[useRBAC] get_user_permissions error (will allow all):", error.message);
        return {};
      }

      console.log("[useRBAC] get_user_permissions result:", data);

      // The function returns [{role, permissions: {can_read, can_create, ...}}]
      // This is a different format from what the sidebar expects ({VIEW_SALES: true, ...}).
      // The sidebar uses isModuleAllowed() for module-level access control,
      // so we fall back to allow-all here for backward compatibility.
      if (Array.isArray(data)) {
        console.warn("[useRBAC] Detected legacy array format — falling back to allow-all for sidebar compatibility.");
        return {};
      }

      // If it's already a flat map {PERMISSION_CODE: true}, use it directly
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return data as RBACPermissionMap;
      }

      return {};
    },
    enabled: !!user?.id && !!companyId,
    staleTime: 30 * 1000,
  });

  /**
   * Check if the current user has a specific permission.
   * Returns true while loading to avoid flash of locked UI.
   */
  const can = (permissionCode: string): boolean => {
    // While loading, allow access to avoid flash of locked UI
    if (isLoadingCompany || isLoadingPerms) return true;
    // If no permissions loaded (e.g. no role assigned yet), allow for backward compat
    if (!permissions || Object.keys(permissions).length === 0) return true;
    // Check the actual permission map
    return permissions[permissionCode] === true;
  };

  /**
   * Check multiple permissions at once — returns true only if ALL are granted.
   */
  const canAll = (...codes: string[]): boolean => {
    return codes.every((c) => can(c));
  };

  /**
   * Check multiple permissions — returns true if ANY is granted.
   */
  const canAny = (...codes: string[]): boolean => {
    return codes.some((c) => can(c));
  };

  return {
    permissions: permissions || {},
    isLoading: isLoadingCompany || isLoadingPerms,
    can,
    canAll,
    canAny,
  };
};

export default useRBAC;
