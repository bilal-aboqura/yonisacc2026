import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, ShieldCheck, Settings2, ArrowLeft, ArrowRight, Building2, Save,
} from "lucide-react";

interface OverrideData {
  custom_override: boolean;
  max_journal_entries: number | null;
  max_sales_invoices: number | null;
  max_purchase_invoices: number | null;
  max_users: number | null;
}

const defaultOverride: OverrideData = {
  custom_override: false,
  max_journal_entries: null,
  max_sales_invoices: null,
  max_purchase_invoices: null,
  max_users: null,
};

const limitItems = [
  { key: "max_journal_entries", labelAr: "قيود اليومية / شهر", labelEn: "Journal Entries / Month" },
  { key: "max_sales_invoices", labelAr: "فواتير مبيعات / شهر", labelEn: "Sales Invoices / Month" },
  { key: "max_purchase_invoices", labelAr: "فواتير مشتريات / شهر", labelEn: "Purchase Invoices / Month" },
  { key: "max_users", labelAr: "عدد المستخدمين", labelEn: "Max Users" },
];

const ManageCompanyAccess = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [data, setData] = useState<OverrideData>(defaultOverride);
  const [planFeatures, setPlanFeatures] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: companyData } = await supabase
          .from("companies")
          .select("id, name, name_en, email")
          .eq("id", id)
          .single();
        setCompany(companyData);

        const { data: override } = await supabase
          .from("company_feature_overrides" as any)
          .select("*")
          .eq("company_id", id)
          .maybeSingle();
        if (override) {
          setData({
            custom_override: (override as any).custom_override ?? false,
            max_journal_entries: (override as any).max_journal_entries,
            max_sales_invoices: (override as any).max_sales_invoices,
            max_purchase_invoices: (override as any).max_purchase_invoices,
            max_users: (override as any).max_users,
          });
        }

        const { data: features } = await supabase.rpc("get_company_features" as any, {
          p_company_id: id,
        });
        setPlanFeatures(features);
      } catch (e) {
        console.error("Failed to load:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("company_feature_overrides" as any)
        .upsert({
          company_id: id,
          custom_override: data.custom_override,
          max_journal_entries: data.max_journal_entries,
          max_sales_invoices: data.max_sales_invoices,
          max_purchase_invoices: data.max_purchase_invoices,
          max_users: data.max_users,
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id" } as any);
      if (error) throw error;

      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم تحديث حدود الاستخدام بنجاح" : "Usage limits updated successfully",
      });
    } catch (e: any) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getEffectiveValue = (key: string) => {
    if (!planFeatures) return "—";
    return (planFeatures as any)[key] ?? (isRTL ? "غير محدود" : "Unlimited");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        {isRTL ? "الشركة غير موجودة" : "Company not found"}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/owner/subscribers")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {isRTL ? "حدود الاستخدام" : "Usage Limits"}
            </h1>
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {company.name}
              {company.name_en && ` — ${company.name_en}`}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isRTL ? "حفظ" : "Save"}
        </Button>
      </div>

      {/* Custom Override Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{isRTL ? "تجاوز مخصص" : "Custom Override"}</p>
              <p className="text-sm text-muted-foreground">
                {isRTL ? "استخدم قيم مخصصة بدلاً من حدود الباقة" : "Use custom values instead of plan limits"}
              </p>
            </div>
            <Switch
              checked={data.custom_override}
              onCheckedChange={(v) => setData((d) => ({ ...d, custom_override: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {data.custom_override && (
        <>
          {planFeatures?.plan_name && (
            <Badge variant="outline" className="gap-1 w-fit">
              <Settings2 className="h-3 w-3" />
              {isRTL ? "الباقة الحالية:" : "Current plan:"} {planFeatures.plan_name}
            </Badge>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {isRTL ? "الحدود الشهرية" : "Monthly Limits"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {limitItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm">{isRTL ? item.labelAr : item.labelEn}</span>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "القيمة الافتراضية:" : "Default:"} {getEffectiveValue(item.key)}
                    </p>
                  </div>
                  <Input
                    type="number"
                    className="w-28 text-center"
                    placeholder={isRTL ? "غير محدود" : "Unlimited"}
                    value={(data as any)[item.key] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : parseInt(e.target.value);
                      setData((d) => ({ ...d, [item.key]: val }));
                    }}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                {isRTL ? "اتركه فارغاً لاستخدام القيمة الافتراضية من الباقة" : "Leave empty to use plan default value"}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ManageCompanyAccess;
