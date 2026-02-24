import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantIsolation } from "./useTenantIsolation";

export type PermissionMap = Record<string, boolean>;

export const usePermissions = () => {
  const { companyId, isLoadingCompany } = useTenantIsolation();

  const { data: permissions, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["company-permissions", companyId],
    queryFn: async (): Promise<PermissionMap> => {
      if (!companyId) return {};
      const { data, error } = await supabase.rpc("get_company_permissions" as any, {
        p_company_id: companyId,
      });
      if (error) {
        console.error("Failed to fetch permissions:", error);
        return {};
      }
      return (data as any) || {};
    },
    enabled: !!companyId,
    staleTime: 30 * 1000, // 30 seconds for near-real-time owner updates
  });

  const hasPermission = (featureKey: string): boolean => {
    if (!permissions) return true; // Default allow while loading
    // If no entry exists for this key, default to allowed
    return permissions[featureKey] !== false;
  };

  const checkPermission = async (featureKey: string): Promise<boolean> => {
    if (!companyId) return false;
    const { data, error } = await supabase.rpc("check_permission" as any, {
      p_company_id: companyId,
      p_feature_key: featureKey,
    });
    if (error) {
      console.error("Permission check failed:", error);
      return false;
    }
    return (data as any)?.allowed ?? true;
  };

  return {
    permissions: permissions || {},
    isLoading: isLoadingCompany || isLoadingPermissions,
    hasPermission,
    checkPermission,
  };
};

export default usePermissions;
