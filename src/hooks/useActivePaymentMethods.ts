import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ActivePaymentMethod {
  id: string;
  name: string;
  name_en: string | null;
  code: string;
  account_id: string;
  is_active: boolean;
}

/**
 * Fetches only active payment methods that are linked to an account.
 * Use this in all input screens (invoices, treasury, etc.)
 */
export const useActivePaymentMethods = (companyId: string | null | undefined) => {
  return useQuery({
    queryKey: ["active-payment-methods", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("payment_methods")
        .select("id, name, name_en, code, account_id, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .not("account_id", "is", null)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as ActivePaymentMethod[];
    },
    enabled: !!companyId,
  });
};

export default useActivePaymentMethods;
