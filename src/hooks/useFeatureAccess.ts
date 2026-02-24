import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantIsolation } from "./useTenantIsolation";

export interface FeatureAccess {
  has_plan: boolean;
  plan_name: string;
  module_sales: boolean;
  module_purchases: boolean;
  module_reports: boolean;
  module_inventory: boolean;
  module_hr: boolean;
  module_auto_parts: boolean;
  max_journal_entries: number | null;
  max_sales_invoices: number | null;
  max_purchase_invoices: number | null;
  max_users: number | null;
  custom_override: boolean;
}

export interface UsageInfo {
  used: number;
  limit: number | null;
  unlimited: boolean;
}

export interface CompanyUsage {
  journal_entries: UsageInfo;
  sales_invoices: UsageInfo;
  purchase_invoices: UsageInfo;
  year: number;
  month: number;
}

const defaultFeatures: FeatureAccess = {
  has_plan: false,
  plan_name: "none",
  module_sales: true,
  module_purchases: true,
  module_reports: true,
  module_inventory: true,
  module_hr: true,
  module_auto_parts: true,
  max_journal_entries: null,
  max_sales_invoices: null,
  max_purchase_invoices: null,
  max_users: null,
  custom_override: false,
};

export const useFeatureAccess = () => {
  const { companyId, isLoadingCompany } = useTenantIsolation();

  const { data: features, isLoading: isLoadingFeatures } = useQuery({
    queryKey: ["company-features", companyId],
    queryFn: async () => {
      if (!companyId) return defaultFeatures;
      const { data, error } = await supabase.rpc("get_company_features" as any, {
        p_company_id: companyId,
      });
      if (error) {
        console.error("Failed to fetch features:", error);
        return defaultFeatures;
      }
      return data as unknown as FeatureAccess;
    },
    enabled: !!companyId,
    staleTime: 30 * 1000, // 30 seconds for near-real-time owner updates
  });

  const { data: usage, isLoading: isLoadingUsage, refetch: refetchUsage } = useQuery({
    queryKey: ["company-usage", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.rpc("get_company_usage" as any, {
        p_company_id: companyId,
      });
      if (error) {
        console.error("Failed to fetch usage:", error);
        return null;
      }
      return data as unknown as CompanyUsage;
    },
    enabled: !!companyId,
    staleTime: 60 * 1000, // 1 min
  });

  const checkUsageLimit = async (
    usageType: "journal_entries" | "sales_invoices" | "purchase_invoices"
  ): Promise<{ allowed: boolean; current: number; limit: number | null; unlimited: boolean }> => {
    if (!companyId) return { allowed: false, current: 0, limit: 0, unlimited: false };
    const { data, error } = await supabase.rpc("check_usage_limit" as any, {
      p_company_id: companyId,
      p_usage_type: usageType,
    });
    if (error) {
      console.error("Failed to check usage limit:", error);
      return { allowed: false, current: 0, limit: 0, unlimited: false };
    }
    return data as any;
  };

  const incrementUsage = async (
    usageType: "journal_entries" | "sales_invoices" | "purchase_invoices"
  ) => {
    if (!companyId) return;
    await supabase.rpc("increment_usage" as any, {
      p_company_id: companyId,
      p_usage_type: usageType,
    });
    refetchUsage();
  };

  const isModuleEnabled = (module: string): boolean => {
    const f = features || defaultFeatures;
    switch (module) {
      case "sales": return f.module_sales;
      case "purchases": return f.module_purchases;
      case "reports": return f.module_reports;
      case "inventory": return f.module_inventory;
      case "hr": return f.module_hr;
      case "auto_parts": return f.module_auto_parts;
      default: return true;
    }
  };

  return {
    features: features || defaultFeatures,
    usage,
    isLoading: isLoadingCompany || isLoadingFeatures,
    isLoadingUsage,
    checkUsageLimit,
    incrementUsage,
    isModuleEnabled,
    refetchUsage,
  };
};

export default useFeatureAccess;
