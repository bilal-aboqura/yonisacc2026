import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantIsolation } from "./useTenantIsolation";

/**
 * Hook to check which screens are enabled for the current company.
 * Fetches client_screens joined with system_screens to get screen keys.
 * Uses a short staleTime (30s) so owner changes propagate quickly.
 */
export const useScreenAccess = () => {
  const { companyId, isLoadingCompany } = useTenantIsolation();

  const { data: enabledScreenKeys, isLoading: isLoadingScreens } = useQuery({
    queryKey: ["company-screens", companyId],
    queryFn: async (): Promise<Set<string>> => {
      if (!companyId) return new Set();

      // Fetch enabled screens with their keys
      const { data, error } = await supabase
        .from("client_screens")
        .select("screen_id, is_enabled, system_screens:screen_id(key)")
        .eq("company_id", companyId)
        .eq("is_enabled", true);

      if (error) {
        console.error("Failed to fetch screen access:", error);
        return new Set();
      }

      const keys = new Set<string>();
      (data || []).forEach((row: any) => {
        const key = row.system_screens?.key;
        if (key) keys.add(key);
      });
      return keys;
    },
    enabled: !!companyId,
    staleTime: 30 * 1000, // 30 seconds for near-real-time updates
  });

  /**
   * Check if no screens have been configured at all (meaning show everything by default)
   */
  const hasNoScreenConfig = enabledScreenKeys?.size === 0;

  // Settings-related screen keys that are always mandatory
  const mandatoryKeys = new Set(["settings", "company_settings", "users_management", "branches", "chart_of_accounts"]);

  /**
   * Check if a specific screen key is enabled.
   * If no screen config exists for this company, all screens are shown by default.
   * Settings screens are always enabled regardless of configuration.
   */
  const isScreenEnabled = (screenKey: string): boolean => {
    if (mandatoryKeys.has(screenKey)) return true;
    if (!enabledScreenKeys || hasNoScreenConfig) return true;
    return enabledScreenKeys.has(screenKey);
  };

  return {
    enabledScreenKeys: enabledScreenKeys || new Set<string>(),
    isLoading: isLoadingCompany || isLoadingScreens,
    isScreenEnabled,
    hasNoScreenConfig,
  };
};

export default useScreenAccess;
