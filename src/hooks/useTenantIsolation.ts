import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for strict tenant (company) isolation
 * Ensures all data access is scoped to the user's company
 */
export const useTenantIsolation = () => {
  const { user } = useAuth();

  // Get user's company ID securely
  const { data: company, isLoading: isLoadingCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, name_en, owner_id, activity_type")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) {
        console.error("Failed to fetch company:", error);
        return null;
      }
      
      return data?.[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  /**
   * Verify that a company_id belongs to the current user
   * Use this before any sensitive operation
   */
  const verifyTenantAccess = async (companyId: string): Promise<boolean> => {
    if (!user?.id || !companyId) return false;
    if (company?.id === companyId) return true;
    
    // Double-check with database
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("owner_id", user.id)
      .single();
    
    if (error || !data) {
      console.error("Tenant access verification failed:", { companyId, userId: user.id });
      // Log access denied attempt
      await logAccessDenied("companies", "ACCESS", companyId);
      return false;
    }
    
    return true;
  };

  /**
   * Log an access denied event
   */
  const logAccessDenied = async (
    tableName: string,
    operation: string,
    recordId?: string,
    details?: string
  ) => {
    try {
      // Use direct insert since the function may not be in types yet
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

  /**
   * Log an audit event
   */
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
      // Use direct insert for better type safety
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

  /**
   * Get the current tenant's company ID
   * Returns null if not authenticated or no company
   */
  const getTenantId = (): string | null => {
    return company?.id || null;
  };

  /**
   * Check if user has access to their company
   */
  const hasTenantAccess = (): boolean => {
    return !!company?.id && company.owner_id === user?.id;
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
