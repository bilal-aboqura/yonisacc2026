import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Settings2, Save } from "lucide-react";

interface ManageAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: any;
  onSaved: () => void;
}

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
      try {
        const { data: override } = await supabase
          .from("company_feature_overrides" as any)
          .select("*")
          .eq("company_id", company.id)
          .maybeSingle();
        if (override) {
          setData({
            custom_override: (override as any).custom_override ?? false,
            max_journal_entries: (override as any).max_journal_entries,
            max_sales_invoices: (override as any).max_sales_invoices,
            max_purchase_invoices: (override as any).max_purchase_invoices,
            max_users: (override as any).max_users,
          });
        } else {
          setData({ ...defaultOverride });
        }

        const { data: features } = await supabase.rpc("get_company_features" as any, {
          p_company_id: company.id,
        });
        setPlanFeatures(features);
      } catch (e) {
        console.error("Failed to load:", e);
      } finally {
        setLoading(false);
      }
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
      onSaved();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isRTL ? "حدود الاستخدام" : "Usage Limits"}
          </DialogTitle>
          <DialogDescription>
            {company?.name} — {isRTL ? "تحكم في الحدود الشهرية" : "Control monthly limits"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Custom Override Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div>
                <p className="font-medium text-sm">{isRTL ? "تجاوز مخصص" : "Custom Override"}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? "قيم مخصصة بدلاً من الباقة" : "Custom values instead of plan"}
                </p>
              </div>
              <Switch
                checked={data.custom_override}
                onCheckedChange={(v) => setData((d) => ({ ...d, custom_override: v }))}
              />
            </div>

            {data.custom_override && (
              <>
                {planFeatures?.plan_name && (
                  <Badge variant="outline" className="gap-1 w-fit">
                    <Settings2 className="h-3 w-3" />
                    {isRTL ? "الباقة:" : "Plan:"} {planFeatures.plan_name}
                  </Badge>
                )}

                <div className="space-y-3">
                  {limitItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm">{isRTL ? item.labelAr : item.labelEn}</span>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? "افتراضي:" : "Default:"} {getEffectiveValue(item.key)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        className="w-24 text-center"
                        placeholder={isRTL ? "∞" : "∞"}
                        value={(data as any)[item.key] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : parseInt(e.target.value);
                          setData((d) => ({ ...d, [item.key]: val }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
            {isRTL ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageAccessDialog;
