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
        console.error("Failed to fetch RBAC permissions:", error);
        return {};
      }
      return (data as any) || {};
    },
    enabled: !!user?.id && !!companyId,
    staleTime: 30 * 1000,
  });

  /**
   * Check if the current user has a specific permission.
   * Returns true while loading to avoid flash of locked UI.
   */
  const can = (permissionCode: string): boolean => {
    if (!permissions) return true; // Default allow while loading
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
