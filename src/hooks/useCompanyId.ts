import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Resolves the current user's company ID.
 * Works for both company owners and team members.
 */
export const useCompanyId = () => {
  const { user } = useAuth();

  const { data: company, isLoading } = useQuery({
    queryKey: ["resolved-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // 1. Check as owner first
      const { data: owned } = await supabase
        .from("companies")
        .select("id, name, name_en, currency, owner_id")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (owned) return owned;

      // 2. Check as team member
      const { data: membership } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (membership) {
        const { data: memberCompany } = await supabase
          .from("companies")
          .select("id, name, name_en, currency, owner_id")
          .eq("id", membership.company_id)
          .is("deleted_at", null)
          .maybeSingle();
        return memberCompany;
      }

      return null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    company,
    companyId: company?.id ?? null,
    isLoading,
  };
};

/**
 * Imperatively fetch the company ID (for use in event handlers, not render).
 * Works for both owners and team members.
 */
export const fetchCompanyId = async (userId: string): Promise<string | null> => {
  // Owner check
  const { data: owned } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (owned) return owned.id;

  // Team member check
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return membership?.company_id ?? null;
};

export default useCompanyId;
