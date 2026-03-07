import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Settings } from "lucide-react";

const ACCOUNT_FIELDS = [
  { key: "asset_account_id", labelAr: "حساب الأصول الثابتة", labelEn: "Fixed Asset Account" },
  { key: "depreciation_expense_account_id", labelAr: "حساب مصروف الإهلاك", labelEn: "Depreciation Expense Account" },
  { key: "accumulated_depreciation_account_id", labelAr: "حساب مجمع الإهلاك", labelEn: "Accumulated Depreciation Account" },
  { key: "disposal_gain_account_id", labelAr: "حساب أرباح بيع الأصول", labelEn: "Disposal Gain Account" },
  { key: "disposal_loss_account_id", labelAr: "حساب خسائر بيع الأصول", labelEn: "Disposal Loss Account" },
  { key: "maintenance_expense_account_id", labelAr: "حساب مصروفات الصيانة", labelEn: "Maintenance Expense Account" },
];

const AssetAccountSetup = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: accounts } = useQuery({
    queryKey: ["accounts-leaf", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("accounts")
        .select("id, code, name, name_en")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .eq("is_parent", false)
        .order("code");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: settings } = useQuery({
    queryKey: ["fixed-asset-account-settings", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("fixed_asset_account_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (settings) {
      const mapped: Record<string, string> = {};
      ACCOUNT_FIELDS.forEach(f => {
        if (settings[f.key]) mapped[f.key] = settings[f.key];
      });
      setForm(mapped);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { company_id: companyId };
      ACCOUNT_FIELDS.forEach(f => { payload[f.key] = form[f.key] || null; });

      if (settings?.id) {
        const { error } = await (supabase as any).from("fixed_asset_account_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("fixed_asset_account_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-asset-account-settings"] });
      toast({ title: isRTL ? "تم حفظ الإعدادات" : "Settings saved" });
    },
    onError: (err: Error) => toast({ title: isRTL ? "خطأ" : "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6" />
        {isRTL ? "تجهيز حسابات الأصول الثابتة" : "Fixed Asset Account Setup"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "ربط الحسابات" : "Account Mapping"}</CardTitle>
          <CardDescription>
            {isRTL
              ? "اختر الحسابات المحاسبية المرتبطة بعمليات الأصول الثابتة"
              : "Select the accounting accounts linked to fixed asset operations"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ACCOUNT_FIELDS.map(field => (
              <div key={field.key} className="space-y-2">
                <Label>{isRTL ? field.labelAr : field.labelEn}</Label>
                <Select value={form[field.key] || ""} onValueChange={v => setForm(f => ({ ...f, [field.key]: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? "اختر حساب..." : "Select account..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((acc: any) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {isRTL ? acc.name : (acc.name_en || acc.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            {isRTL ? "حفظ الإعدادات" : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetAccountSetup;
