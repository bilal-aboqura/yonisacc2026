import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PrintSettings, defaultPrintSettings } from "@/components/print/types";

export function usePrintSettings(companyId: string | null | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["print-settings", companyId],
    queryFn: async () => {
      if (!companyId) return defaultPrintSettings;
      const { data, error } = await supabase
        .from("company_print_settings" as any)
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { ...defaultPrintSettings, company_id: companyId };
      const row = data as Record<string, any>;
      return {
        ...defaultPrintSettings,
        ...row,
      } as PrintSettings;
    },
    enabled: !!companyId,
    staleTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: Partial<PrintSettings>) => {
      if (!companyId) throw new Error("No company");
      const payload = {
        ...newSettings,
        company_id: companyId,
        updated_at: new Date().toISOString(),
      };
      // Upsert
      const { error } = await (supabase as any)
        .from("company_print_settings")
        .upsert(payload, { onConflict: "company_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-settings", companyId] });
    },
  });

  return {
    settings: settings || defaultPrintSettings,
    isLoading,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
