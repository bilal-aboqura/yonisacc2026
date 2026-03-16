import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyId } from "@/hooks/useCompanyId";

/**
 * Returns the allowed_modules list for the current user's company membership.
 * Falls back to ANY member record for the company, then to the subscription plan.
 *
 * Return values:
 *   - null   → no restriction config found → ALL modules allowed
 *   - []     → explicitly set to empty    → NO modules allowed
 *   - [...]  → specific modules allowed
 *
 * During loading, returns undefined (caller should treat as "show nothing" to avoid flash).
 */
export const useAllowedModules = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();

  const { data: allowedModules, isLoading } = useQuery({
    queryKey: ["allowed-modules", user?.id, companyId],
    queryFn: async () => {
      if (!user?.id || !companyId) {
        console.log("[useAllowedModules] No user or companyId, returning null");
        return null;
      }

      console.log("[useAllowedModules] Checking modules for:", { userId: user.id, companyId });

      // 1. Check company_members for this specific user
      const { data: memberData, error: memberError } = await supabase
        .from("company_members")
        .select("allowed_modules")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      console.log("[useAllowedModules] Step 1 - My member record:", { memberData, memberError });

      // explicitly set (even empty array [] = block all). Only null means "not configured".
      if (memberData && memberData.allowed_modules !== null && Array.isArray(memberData.allowed_modules)) {
        console.log("[useAllowedModules] ✅ Using MY member record:", memberData.allowed_modules);
        return memberData.allowed_modules as string[];
      }

      // 2. Fallback: check ANY company_member record with allowed_modules set
      const { data: anyMemberData, error: anyMemberError } = await supabase
        .from("company_members")
        .select("allowed_modules, user_id")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .not("allowed_modules", "is", null)
        .limit(1)
        .maybeSingle();

      console.log("[useAllowedModules] Step 2 - Any member record:", { anyMemberData, anyMemberError });

      if (anyMemberData && anyMemberData.allowed_modules !== null && Array.isArray(anyMemberData.allowed_modules)) {
        console.log("[useAllowedModules] ✅ Using ANY member record:", anyMemberData.allowed_modules);
        return anyMemberData.allowed_modules as string[];
      }

      // 3. Fallback: get from subscription plan
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("company_id", companyId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("[useAllowedModules] Step 3 - Subscription:", { subData, subError });

      if (subData?.plan_id) {
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("id", subData.plan_id)
          .maybeSingle();

        const planAny = planData as any;
        console.log("[useAllowedModules] Step 3b - Plan allowed_modules:", planAny?.allowed_modules);

        if (planAny?.allowed_modules && Array.isArray(planAny.allowed_modules) && planAny.allowed_modules.length > 0) {
          return planAny.allowed_modules as string[];
        }
      }

      // No restrictions configured at all → allow everything
      console.log("[useAllowedModules] ⚠️ No restriction config → returning null (all modules allowed)");
      return null;
    },
    enabled: !!user?.id && !!companyId,
    staleTime: 30 * 1000, // reduced to 30s so changes reflect faster
  });

  /**
   * While loading: return false to avoid flash of restricted modules.
   * After load: null = all allowed, [] = none allowed, [...] = specific list.
   */
  const isModuleAllowed = (moduleKey: string): boolean => {
    // Still fetching — hide modules to prevent flash (they'll appear once loaded)
    if (isLoading) return false;
    // No config found → allow all
    if (allowedModules === null || allowedModules === undefined) return true;
    // Check specific list
    return allowedModules.includes(moduleKey);
  };

  return { allowedModules, isLoading, isModuleAllowed };
};

export default useAllowedModules;
