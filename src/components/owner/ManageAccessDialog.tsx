import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Settings2 } from "lucide-react";

interface ManageAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: any;
  onSaved: () => void;
}

interface OverrideData {
  custom_override: boolean;
  module_sales: boolean | null;
  module_purchases: boolean | null;
  module_reports: boolean | null;
  module_inventory: boolean | null;
  module_hr: boolean | null;
  module_auto_parts: boolean | null;
  max_journal_entries: number | null;
  max_sales_invoices: number | null;
  max_purchase_invoices: number | null;
  max_users: number | null;
}

const defaultOverride: OverrideData = {
  custom_override: false,
  module_sales: null,
  module_purchases: null,
  module_reports: null,
  module_inventory: null,
  module_hr: null,
  module_auto_parts: null,
  max_journal_entries: null,
  max_sales_invoices: null,
  max_purchase_invoices: null,
  max_users: null,
};

const ManageAccessDialog = ({ open, onOpenChange, company, onSaved }: ManageAccessDialogProps) => {
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OverrideData>(defaultOverride);
  const [planFeatures, setPlanFeatures] = useState<any>(null);

  useEffect(() => {
    if (!open || !company) return;
    const load = async () => {
      setLoading(true);
      // Load current overrides
      const { data: override } = await supabase
        .from("company_feature_overrides" as any)
        .select("*")
        .eq("company_id", company.id)
        .maybeSingle();

      if (override) {
        setData(override as any);
      } else {
        setData({ ...defaultOverride });
      }

      // Load plan features
      const { data: features } = await supabase.rpc("get_company_features" as any, {
        p_company_id: company.id,
      });
      setPlanFeatures(features);
      setLoading(false);
    };
    load();
  }, [open, company]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("company_feature_overrides" as any)
        .upsert({
          company_id: company.id,
          ...data,
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id" } as any);

      if (error) throw error;
      toast({ title: isRTL ? "تم الحفظ" : "Saved", description: isRTL ? "تم تحديث صلاحيات الوصول" : "Access settings updated" });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const moduleItems = [
    { key: "module_sales", labelAr: "المبيعات", labelEn: "Sales" },
    { key: "module_purchases", labelAr: "المشتريات", labelEn: "Purchases" },
    { key: "module_reports", labelAr: "التقارير", labelEn: "Reports" },
    { key: "module_inventory", labelAr: "المخزون", labelEn: "Inventory" },
    { key: "module_hr", labelAr: "الموارد البشرية", labelEn: "Human Resources" },
    { key: "module_auto_parts", labelAr: "قطع الغيار", labelEn: "Auto Parts" },
  ];

  const limitItems = [
    { key: "max_journal_entries", labelAr: "قيود اليومية / شهر", labelEn: "Journal Entries / Month" },
    { key: "max_sales_invoices", labelAr: "فواتير مبيعات / شهر", labelEn: "Sales Invoices / Month" },
    { key: "max_purchase_invoices", labelAr: "فواتير مشتريات / شهر", labelEn: "Purchase Invoices / Month" },
    { key: "max_users", labelAr: "عدد المستخدمين", labelEn: "Max Users" },
  ];

  const getEffectiveValue = (key: string) => {
    if (!planFeatures) return "—";
    return (planFeatures as any)[key] ?? (isRTL ? "غير محدود" : "Unlimited");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isRTL ? "إدارة الوصول" : "Manage Access"}
          </DialogTitle>
          <DialogDescription>
            {company?.name} — {isRTL ? "تحكم في الوحدات والحدود" : "Control modules and limits"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Custom Override Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div>
                <p className="font-medium text-sm">{isRTL ? "تجاوز مخصص" : "Custom Override"}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? "استخدم قيم مخصصة بدلاً من إعدادات الخطة" : "Use custom values instead of plan defaults"}
                </p>
              </div>
              <Switch
                checked={data.custom_override}
                onCheckedChange={(v) => setData((d) => ({ ...d, custom_override: v }))}
              />
            </div>

            {data.custom_override && (
              <>
                {/* Plan info badge */}
                {planFeatures?.plan_name && (
                  <Badge variant="outline" className="gap-1">
                    <Settings2 className="h-3 w-3" />
                    {isRTL ? "الخطة الحالية:" : "Current plan:"} {planFeatures.plan_name}
                  </Badge>
                )}

                <Separator />

                {/* Module Toggles */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">{isRTL ? "الوحدات" : "Modules"}</h4>
                  {moduleItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-sm">{isRTL ? item.labelAr : item.labelEn}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          ({isRTL ? "الخطة:" : "Plan:"} {getEffectiveValue(item.key) ? "✓" : "✗"})
                        </span>
                        <Switch
                          checked={(data as any)[item.key] ?? (planFeatures as any)?.[item.key] ?? false}
                          onCheckedChange={(v) => setData((d) => ({ ...d, [item.key]: v }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Limits */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">{isRTL ? "الحدود الشهرية" : "Monthly Limits"}</h4>
                  {limitItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm">{isRTL ? item.labelAr : item.labelEn}</span>
                        <p className="text-xs text-muted-foreground">
                          ({isRTL ? "الخطة:" : "Plan:"} {getEffectiveValue(item.key)})
                        </p>
                      </div>
                      <Input
                        type="number"
                        className="w-24 text-center"
                        placeholder={isRTL ? "غير محدود" : "∞"}
                        value={(data as any)[item.key] ?? ""}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            [item.key]: e.target.value ? parseInt(e.target.value) : null,
                          }))
                        }
                        min={0}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {isRTL ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageAccessDialog;
