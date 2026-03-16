import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyId } from "@/hooks/useCompanyId";

/**
 * Returns the allowed_modules list for the current user's company membership.
 * Falls back to the subscription plan's allowed_modules if no custom override exists.
 * If no data at all, all modules are allowed.
 */
export const useAllowedModules = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();

  const { data: allowedModules, isLoading } = useQuery({
    queryKey: ["allowed-modules", user?.id, companyId],
    queryFn: async () => {
      if (!user?.id || !companyId) return null;

      // 1. Check company_members for this specific user
      const { data: memberData } = await supabase
        .from("company_members")
        .select("allowed_modules")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      // If a record exists AND allowed_modules is explicitly set (even empty array),
      // use it. null means "not configured" = allow all.
      if (memberData && memberData.allowed_modules !== null && Array.isArray(memberData.allowed_modules)) {
        return memberData.allowed_modules as string[];
      }

      // 2. Fallback: check ANY company_member record for this company
      // (platform owner saves to the company owner's member record)
      const { data: anyMemberData } = await supabase
        .from("company_members")
        .select("allowed_modules")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .not("allowed_modules", "is", null)
        .limit(1)
        .maybeSingle();

      if (anyMemberData && anyMemberData.allowed_modules !== null && Array.isArray(anyMemberData.allowed_modules)) {
        return anyMemberData.allowed_modules as string[];
      }

      // 3. Fallback: get from subscription plan
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("company_id", companyId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subData?.plan_id) {
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("id", subData.plan_id)
          .maybeSingle();

        const planAny = planData as any;
        if (planAny?.allowed_modules && Array.isArray(planAny.allowed_modules) && planAny.allowed_modules.length > 0) {
          return planAny.allowed_modules as string[];
        }
      }

      // No restrictions configured at all
      return null;
    },
    enabled: !!user?.id && !!companyId,
    staleTime: 2 * 60 * 1000,
  });

  const isModuleAllowed = (moduleKey: string): boolean => {
    if (allowedModules === null || allowedModules === undefined) return true;
    return allowedModules.includes(moduleKey);
  };

  return { allowedModules, isLoading, isModuleAllowed };
};

export default useAllowedModules;
