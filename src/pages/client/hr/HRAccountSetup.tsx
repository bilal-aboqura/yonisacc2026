import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Settings2, Loader2 } from "lucide-react";

interface AccountOption {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
}

interface HRSettings {
  salary_expense_account_id: string | null;
  housing_expense_account_id: string | null;
  transport_expense_account_id: string | null;
  other_allowance_account_id: string | null;
  salary_payable_account_id: string | null;
  social_insurance_expense_account_id: string | null;
  social_insurance_payable_account_id: string | null;
  employee_advances_account_id: string | null;
  loan_receivable_account_id: string | null;
  eos_expense_account_id: string | null;
  eos_provision_account_id: string | null;
  penalties_revenue_account_id: string | null;
  rewards_expense_account_id: string | null;
  bank_account_id: string | null;
  cash_account_id: string | null;
}

const emptySettings: HRSettings = {
  salary_expense_account_id: null,
  housing_expense_account_id: null,
  transport_expense_account_id: null,
  other_allowance_account_id: null,
  salary_payable_account_id: null,
  social_insurance_expense_account_id: null,
  social_insurance_payable_account_id: null,
  employee_advances_account_id: null,
  loan_receivable_account_id: null,
  eos_expense_account_id: null,
  eos_provision_account_id: null,
  penalties_revenue_account_id: null,
  rewards_expense_account_id: null,
  bank_account_id: null,
  cash_account_id: null,
};

type SettingField = {
  key: keyof HRSettings;
  labelAr: string;
  labelEn: string;
};

const sections: { titleAr: string; titleEn: string; fields: SettingField[] }[] = [
  {
    titleAr: "مصروفات الرواتب والبدلات",
    titleEn: "Salary & Allowance Expenses",
    fields: [
      { key: "salary_expense_account_id", labelAr: "حساب مصروف الرواتب", labelEn: "Salary Expense Account" },
      { key: "housing_expense_account_id", labelAr: "حساب مصروف بدل السكن", labelEn: "Housing Allowance Expense" },
      { key: "transport_expense_account_id", labelAr: "حساب مصروف بدل النقل", labelEn: "Transport Allowance Expense" },
      { key: "other_allowance_account_id", labelAr: "حساب مصروف البدلات الأخرى", labelEn: "Other Allowance Expense" },
    ],
  },
  {
    titleAr: "الالتزامات والمستحقات",
    titleEn: "Liabilities & Payables",
    fields: [
      { key: "salary_payable_account_id", labelAr: "حساب الرواتب المستحقة", labelEn: "Salary Payable Account" },
      { key: "social_insurance_expense_account_id", labelAr: "حساب مصروف التأمينات الاجتماعية", labelEn: "Social Insurance Expense" },
      { key: "social_insurance_payable_account_id", labelAr: "حساب التأمينات المستحقة", labelEn: "Social Insurance Payable" },
    ],
  },
  {
    titleAr: "السلف والقروض",
    titleEn: "Advances & Loans",
    fields: [
      { key: "employee_advances_account_id", labelAr: "حساب سلف الموظفين", labelEn: "Employee Advances Account" },
      { key: "loan_receivable_account_id", labelAr: "حساب القروض المستحقة", labelEn: "Loan Receivable Account" },
    ],
  },
  {
    titleAr: "نهاية الخدمة",
    titleEn: "End of Service",
    fields: [
      { key: "eos_expense_account_id", labelAr: "حساب مصروف نهاية الخدمة", labelEn: "EOS Expense Account" },
      { key: "eos_provision_account_id", labelAr: "حساب مخصص نهاية الخدمة", labelEn: "EOS Provision Account" },
    ],
  },
  {
    titleAr: "الجزاءات والمكافآت",
    titleEn: "Penalties & Rewards",
    fields: [
      { key: "penalties_revenue_account_id", labelAr: "حساب إيرادات الجزاءات", labelEn: "Penalties Revenue Account" },
      { key: "rewards_expense_account_id", labelAr: "حساب مصروف المكافآت", labelEn: "Rewards Expense Account" },
    ],
  },
  {
    titleAr: "حسابات السداد",
    titleEn: "Payment Accounts",
    fields: [
      { key: "bank_account_id", labelAr: "حساب البنك (لسداد الرواتب)", labelEn: "Bank Account (Payroll)" },
      { key: "cash_account_id", labelAr: "حساب الصندوق", labelEn: "Cash Account" },
    ],
  },
];

const HRAccountSetup = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<HRSettings>(emptySettings);

  const { data: accounts = [] } = useQuery({
    queryKey: ["hr-setup-accounts", companyId],
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
    queryKey: ["hr-account-settings", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("hr_account_settings")
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (existing) {
      const mapped: HRSettings = { ...emptySettings };
      for (const key of Object.keys(emptySettings) as (keyof HRSettings)[]) {
        mapped[key] = existing[key] || null;
      }
      setForm(mapped);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId, updated_at: new Date().toISOString() };
      if (existing?.id) {
        const { error } = await (supabase as any)
          .from("hr_account_settings")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("hr_account_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-account-settings"] });
    },
    onError: (e: any) => toast.error(e?.message || (isRTL ? "خطأ في الحفظ" : "Save error")),
  });

  const renderAccountSelect = (field: SettingField) => (
    <div key={field.key} className="space-y-1.5">
      <Label className="text-sm font-medium">
        {isRTL ? field.labelAr : field.labelEn}
      </Label>
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
  );

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
          <h1 className="text-2xl font-bold">{isRTL ? "تجهيز الموارد البشرية" : "HR Account Setup"}</h1>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? "ربط عمليات الموارد البشرية بحسابات دليل الحسابات لإنشاء القيود المحاسبية آلياً"
              : "Link HR operations to Chart of Accounts for automatic journal entry generation"}
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 me-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 me-2" />
          )}
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
              {section.fields.map((field) => renderAccountSelect(field))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HRAccountSetup;
