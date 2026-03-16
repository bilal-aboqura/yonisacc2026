import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for strict tenant (company) isolation.
 * Works for both company owners AND team members (company_members).
 */
export const useTenantIsolation = () => {
  const { user, isLoading: isAuthLoading } = useAuth();

  const { data: company, isLoading: isLoadingCompanyQuery } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // 1. Check as owner first
      const { data: owned } = await supabase
        .from("companies")
        .select("id, name, name_en, owner_id, activity_type")
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
          .select("id, name, name_en, owner_id, activity_type")
          .eq("id", membership.company_id)
          .is("deleted_at", null)
          .maybeSingle();
        return memberCompany;
      }

      return null;
    },
    enabled: !isAuthLoading && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // isLoadingCompany should be true while auth is loading OR while company query is loading
  const isLoadingCompany = isAuthLoading || (!!user?.id && isLoadingCompanyQuery);

  /**
   * Verify that a company_id belongs to the current user (owner or member)
   */
  const verifyTenantAccess = async (companyId: string): Promise<boolean> => {
    if (!user?.id || !companyId) return false;
    if (company?.id === companyId) return true;

    // Check ownership
    const { data: owned } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (owned) return true;

    // Check membership
    const { data: member } = await supabase
      .from("company_members")
      .select("id")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (member) return true;

    console.error("Tenant access verification failed:", { companyId, userId: user.id });
    await logAccessDenied("companies", "ACCESS", companyId);
    return false;
  };

  const logAccessDenied = async (
    tableName: string,
    operation: string,
    recordId?: string,
    details?: string
  ) => {
    try {
      await supabase.from("audit_logs").insert({
        company_id: company?.id || null,
        user_id: user?.id || "00000000-0000-0000-0000-000000000000",
        operation_type: "ACCESS_DENIED",
        table_name: tableName,
        record_id: recordId || null,
        severity: "critical",
        details: details || `Unauthorized access attempt to ${operation} on ${tableName}`,
      });
    } catch (error) {
      console.error("Failed to log access denied:", error);
    }
  };

  const logAuditEvent = async (
    operationType: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "EXPORT" | "PRINT" | "API_ACCESS",
    tableName: string,
    recordId?: string,
    oldData?: Record<string, unknown>,
    newData?: Record<string, unknown>,
    severity: "info" | "warning" | "error" | "critical" = "info",
    details?: string
  ) => {
    if (!company?.id || !user?.id) return;

    try {
      await supabase.from("audit_logs").insert({
        company_id: company.id,
        user_id: user.id,
        operation_type: operationType,
        table_name: tableName,
        record_id: recordId || null,
        old_data: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        new_data: newData ? JSON.parse(JSON.stringify(newData)) : null,
        severity: severity,
        details: details || null,
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
    }
  };

  const getTenantId = (): string | null => {
    return company?.id || null;
  };

  const hasTenantAccess = (): boolean => {
    return !!company?.id;
  };

  return {
    company,
    companyId: company?.id,
    isLoadingCompany,
    verifyTenantAccess,
    logAccessDenied,
    logAuditEvent,
    getTenantId,
    hasTenantAccess,
  };
};

export default useTenantIsolation;
