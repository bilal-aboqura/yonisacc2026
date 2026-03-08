import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyId } from "@/hooks/useCompanyId";

/**
 * Returns the allowed_modules list for the current user's company membership.
 * If no membership record or no allowed_modules column, all modules are allowed.
 */
export const useAllowedModules = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();

  const { data: allowedModules, isLoading } = useQuery({
    queryKey: ["allowed-modules", user?.id, companyId],
    queryFn: async () => {
      if (!user?.id || !companyId) return null;

      const { data } = await supabase
        .from("company_members")
        .select("allowed_modules")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (data?.allowed_modules && Array.isArray(data.allowed_modules)) {
        return data.allowed_modules as string[];
      }

      // No record or null → allow everything
      return null;
    },
    enabled: !!user?.id && !!companyId,
    staleTime: 2 * 60 * 1000,
  });

  const isModuleAllowed = (moduleKey: string): boolean => {
    // null means no restrictions (owner without membership record, or no data)
    if (allowedModules === null || allowedModules === undefined) return true;
    return allowedModules.includes(moduleKey);
  };

  return { allowedModules, isLoading, isModuleAllowed };
};

export default useAllowedModules;
