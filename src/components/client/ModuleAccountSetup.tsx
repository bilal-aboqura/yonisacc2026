import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Settings2, Loader2 } from "lucide-react";

interface AccountOption {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
}

export type SettingField = {
  key: string;
  labelAr: string;
  labelEn: string;
};

export type SettingSection = {
  titleAr: string;
  titleEn: string;
  fields: SettingField[];
};

interface Props {
  tableName: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  sections: SettingSection[];
}

const ModuleAccountSetup = ({ tableName, titleAr, titleEn, descriptionAr, descriptionEn, sections }: Props) => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
  const emptyForm = Object.fromEntries(allKeys.map((k) => [k, null])) as Record<string, string | null>;
  const [form, setForm] = useState<Record<string, string | null>>(emptyForm);

  const { data: accounts = [] } = useQuery({
    queryKey: ["setup-accounts", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("accounts")
        .select("id, code, name, name_en, is_parent")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .eq("is_parent", false)
        .order("code");
      return (data || []) as AccountOption[];
    },
    enabled: !!companyId,
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: [tableName, companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from(tableName)
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (existing) {
      const mapped: Record<string, string | null> = { ...emptyForm };
      for (const key of allKeys) {
        mapped[key] = existing[key] || null;
      }
      setForm(mapped);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId, updated_at: new Date().toISOString() };
      if (existing?.id) {
        const { error } = await (supabase as any).from(tableName).update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from(tableName).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
      queryClient.invalidateQueries({ queryKey: [tableName] });
    },
    onError: (e: any) => toast.error(e?.message || (isRTL ? "خطأ" : "Error")),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? titleAr : titleEn}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? descriptionAr : descriptionEn}</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {isRTL ? "حفظ الإعدادات" : "Save Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                {isRTL ? section.titleAr : section.titleEn}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-sm font-medium">{isRTL ? field.labelAr : field.labelEn}</Label>
                  <Select
                    value={form[field.key] || "none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, [field.key]: v === "none" ? null : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر الحساب" : "Select Account"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{isRTL ? "-- بدون --" : "-- None --"}</SelectItem>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code} - {isRTL ? acc.name : acc.name_en || acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ModuleAccountSetup;
