import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Settings, Stethoscope } from "lucide-react";

const ACCOUNT_FIELDS = [
  { key: "medical_revenue_account_id", labelAr: "حساب إيراد الخدمات الطبية", labelEn: "Medical Service Revenue Account" },
  { key: "patient_receivable_account_id", labelAr: "حساب ذمم المرضى", labelEn: "Patient Receivable Account" },
  { key: "insurance_receivable_account_id", labelAr: "حساب ذمم التأمين", labelEn: "Insurance Receivable Account" },
  { key: "cash_account_id", labelAr: "حساب النقدية", labelEn: "Cash Account" },
  { key: "bank_account_id", labelAr: "حساب البنك", labelEn: "Bank Account" },
];

const ClinicAccountSetup = () => {
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

  const { data: settings, isLoading } = useQuery({
    queryKey: ["clinic-account-settings", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("clinic_account_settings")
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
      const payload: any = { company_id: companyId, updated_at: new Date().toISOString() };
      ACCOUNT_FIELDS.forEach(f => { payload[f.key] = form[f.key] || null; });

      if (settings?.id) {
        const { error } = await (supabase as any).from("clinic_account_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("clinic_account_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-account-settings"] });
      toast.success(isRTL ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            {isRTL ? "تجهيز حسابات العيادة" : "Clinic Account Setup"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "ربط عمليات العيادة بحسابات دليل الحسابات لإنشاء القيود المحاسبية آلياً"
              : "Link clinic operations to Chart of Accounts for automatic journal entries"}
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {isRTL ? "حفظ الإعدادات" : "Save Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              {isRTL ? "حسابات الإيرادات والذمم" : "Revenue & Receivables"}
            </CardTitle>
            <CardDescription>
              {isRTL ? "الحسابات المرتبطة بإيرادات الخدمات الطبية وذمم المرضى والتأمين" : "Accounts linked to medical revenues and patient/insurance receivables"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ACCOUNT_FIELDS.slice(0, 3).map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm font-medium">{isRTL ? field.labelAr : field.labelEn}</Label>
                <Select
                  value={form[field.key] || "none"}
                  onValueChange={v => setForm(f => ({ ...f, [field.key]: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? "اختر الحساب" : "Select Account"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRTL ? "-- بدون --" : "-- None --"}</SelectItem>
                    {accounts?.map((acc: any) => (
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              {isRTL ? "حسابات المقبوضات" : "Payment Accounts"}
            </CardTitle>
            <CardDescription>
              {isRTL ? "حسابات النقدية والبنك لتسجيل المدفوعات" : "Cash and bank accounts for recording payments"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ACCOUNT_FIELDS.slice(3).map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm font-medium">{isRTL ? field.labelAr : field.labelEn}</Label>
                <Select
                  value={form[field.key] || "none"}
                  onValueChange={v => setForm(f => ({ ...f, [field.key]: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? "اختر الحساب" : "Select Account"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRTL ? "-- بدون --" : "-- None --"}</SelectItem>
                    {accounts?.map((acc: any) => (
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
      </div>

      {/* Accounting Integration Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isRTL ? "القيود المحاسبية التلقائية" : "Automatic Journal Entries"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-semibold text-sm">{isRTL ? "فاتورة مريض" : "Patient Invoice"}</h4>
              <p className="text-xs text-muted-foreground">{isRTL ? "مدين: ذمم المرضى" : "Debit: Patient Receivable"}</p>
              <p className="text-xs text-muted-foreground">{isRTL ? "دائن: إيراد الخدمات الطبية" : "Credit: Medical Service Revenue"}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-semibold text-sm">{isRTL ? "تحصيل مبلغ" : "Payment Received"}</h4>
              <p className="text-xs text-muted-foreground">{isRTL ? "مدين: النقدية / البنك" : "Debit: Cash / Bank"}</p>
              <p className="text-xs text-muted-foreground">{isRTL ? "دائن: ذمم المرضى" : "Credit: Patient Receivable"}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-semibold text-sm">{isRTL ? "دفعة تأمين" : "Insurance Payment"}</h4>
              <p className="text-xs text-muted-foreground">{isRTL ? "مدين: ذمم التأمين" : "Debit: Insurance Receivable"}</p>
              <p className="text-xs text-muted-foreground">{isRTL ? "دائن: إيراد الخدمات الطبية" : "Credit: Medical Revenue"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClinicAccountSetup;
