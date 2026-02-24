import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Loader2, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ManagePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: any;
  onSaved: () => void;
}

interface FeatureFlag {
  id: string;
  feature_key: string;
  module: string;
  description: string;
  description_ar: string | null;
}

interface PermissionState {
  [featureKey: string]: boolean | null; // null = use plan default
}

const moduleLabels: Record<string, { ar: string; en: string }> = {
  sales: { ar: "المبيعات", en: "Sales" },
  purchases: { ar: "المشتريات", en: "Purchases" },
  accounting: { ar: "المحاسبة", en: "Accounting" },
  inventory: { ar: "المخزون", en: "Inventory" },
  reports: { ar: "التقارير", en: "Reports" },
  hr: { ar: "الموارد البشرية", en: "Human Resources" },
  settings: { ar: "الإعدادات", en: "Settings" },
};

const ManagePermissionsDialog = ({ open, onOpenChange, company, onSaved }: ManagePermissionsDialogProps) => {
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [planPermissions, setPlanPermissions] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<PermissionState>({});
  const [openModules, setOpenModules] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !company) return;
    const load = async () => {
      setLoading(true);
      try {
        // Load all feature flags
        const { data: flagsData } = await supabase
          .from("feature_flags" as any)
          .select("*")
          .order("module, feature_key");
        setFlags((flagsData as any) || []);

        // Load plan permissions for this company's plan
        const { data: planPerms } = await supabase.rpc("get_plan_permissions_for_company" as any, {
          p_company_id: company.id,
        });
        setPlanPermissions((planPerms as any) || {});

        // Load existing company overrides
        const { data: compOverrides } = await supabase
          .from("company_permission_overrides" as any)
          .select("feature_key, allowed")
          .eq("company_id", company.id);

        const overrideMap: PermissionState = {};
        ((compOverrides as any) || []).forEach((o: any) => {
          overrideMap[o.feature_key] = o.allowed;
        });
        setOverrides(overrideMap);
      } catch (e) {
        console.error("Failed to load permissions:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, company]);

  const groupedFlags = useMemo(() => {
    const groups: Record<string, FeatureFlag[]> = {};
    flags.forEach((f) => {
      if (!groups[f.module]) groups[f.module] = [];
      groups[f.module].push(f);
    });
    return groups;
  }, [flags]);

  const getEffectiveValue = (featureKey: string): boolean => {
    if (overrides[featureKey] !== undefined && overrides[featureKey] !== null) {
      return overrides[featureKey] as boolean;
    }
    return planPermissions[featureKey] !== false;
  };

  const isOverridden = (featureKey: string): boolean => {
    return overrides[featureKey] !== undefined && overrides[featureKey] !== null;
  };

  const togglePermission = (featureKey: string) => {
    const currentEffective = getEffectiveValue(featureKey);
    setOverrides((prev) => ({
      ...prev,
      [featureKey]: !currentEffective,
    }));
  };

  const resetToDefault = (featureKey: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[featureKey];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete all existing overrides for this company
      await supabase
        .from("company_permission_overrides" as any)
        .delete()
        .eq("company_id", company.id);

      // Insert only overrides that differ from plan defaults
      const inserts = Object.entries(overrides)
        .filter(([, val]) => val !== null && val !== undefined)
        .map(([key, val]) => ({
          company_id: company.id,
          feature_key: key,
          allowed: val as boolean,
        }));

      if (inserts.length > 0) {
        const { error } = await supabase
          .from("company_permission_overrides" as any)
          .insert(inserts);
        if (error) throw error;
      }

      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم تحديث الصلاحيات بنجاح" : "Permissions updated successfully",
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

  const toggleModule = (mod: string) => {
    setOpenModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const getActionLabel = (featureKey: string): { ar: string; en: string } => {
    const parts = featureKey.split(".");
    const action = parts.slice(1).join(".");
    const actionLabels: Record<string, { ar: string; en: string }> = {
      create_invoice: { ar: "إنشاء فاتورة", en: "Create Invoice" },
      edit_invoice: { ar: "تعديل فاتورة", en: "Edit Invoice" },
      delete_invoice: { ar: "حذف فاتورة", en: "Delete Invoice" },
      apply_discount: { ar: "تطبيق خصم", en: "Apply Discount" },
      print_invoice: { ar: "طباعة فاتورة", en: "Print Invoice" },
      export_excel: { ar: "تصدير Excel", en: "Export Excel" },
      export_pdf: { ar: "تصدير PDF", en: "Export PDF" },
      create_journal: { ar: "إنشاء قيد", en: "Create Journal" },
      edit_journal: { ar: "تعديل قيد", en: "Edit Journal" },
      delete_journal: { ar: "حذف قيد", en: "Delete Journal" },
      post_journal: { ar: "ترحيل قيد", en: "Post Journal" },
      view_reports: { ar: "عرض التقارير", en: "View Reports" },
      export_reports: { ar: "تصدير التقارير", en: "Export Reports" },
      financial_statements: { ar: "القوائم المالية", en: "Financial Statements" },
      adjust_stock: { ar: "تعديل المخزون", en: "Adjust Stock" },
      change_cost: { ar: "تغيير التكلفة", en: "Change Cost" },
      view_valuation: { ar: "تقييم المخزون", en: "View Valuation" },
      create_order: { ar: "إنشاء أمر", en: "Create Order" },
      edit_order: { ar: "تعديل أمر", en: "Edit Order" },
      delete_order: { ar: "حذف أمر", en: "Delete Order" },
      create_quote: { ar: "إنشاء عرض سعر", en: "Create Quote" },
      edit_quote: { ar: "تعديل عرض سعر", en: "Edit Quote" },
      delete_quote: { ar: "حذف عرض سعر", en: "Delete Quote" },
    };
    return actionLabels[action] || { ar: action, en: action };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isRTL ? "إدارة الصلاحيات التفصيلية" : "Manage Feature Permissions"}
          </DialogTitle>
          <DialogDescription>
            {company?.name} — {isRTL ? "تحكم في الإجراءات المسموحة داخل كل وحدة" : "Control allowed actions within each module"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2 pb-4">
              {Object.entries(groupedFlags).map(([module, moduleFlags]) => {
                const label = moduleLabels[module] || { ar: module, en: module };
                const isOpen = openModules.includes(module);
                const overriddenCount = moduleFlags.filter((f) => isOverridden(f.feature_key)).length;

                return (
                  <Collapsible key={module} open={isOpen} onOpenChange={() => toggleModule(module)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between h-11 px-3 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">
                            {isRTL ? label.ar : label.en}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {moduleFlags.length}
                          </Badge>
                        </div>
                        {overriddenCount > 0 && (
                          <Badge variant="outline" className="text-xs text-primary border-primary">
                            {overriddenCount} {isRTL ? "مخصص" : "custom"}
                          </Badge>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-1 ps-6 pe-2 pb-2">
                        {moduleFlags.map((flag) => {
                          const actionLabel = getActionLabel(flag.feature_key);
                          const effective = getEffectiveValue(flag.feature_key);
                          const overridden = isOverridden(flag.feature_key);
                          const planDefault = planPermissions[flag.feature_key] !== false;

                          return (
                            <div
                              key={flag.feature_key}
                              className={`flex items-center justify-between py-2 px-3 rounded-md transition-colors ${
                                overridden ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                  {isRTL ? actionLabel.ar : actionLabel.en}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {flag.feature_key}
                                  </span>
                                  {overridden && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-xs text-primary"
                                      onClick={() => resetToDefault(flag.feature_key)}
                                    >
                                      {isRTL ? "إعادة للافتراضي" : "Reset"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-xs ${planDefault ? "text-green-600" : "text-red-500"}`}>
                                  ({isRTL ? "الخطة:" : "Plan:"} {planDefault ? "✓" : "✗"})
                                </span>
                                <Switch
                                  checked={effective}
                                  onCheckedChange={() => togglePermission(flag.feature_key)}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {Object.keys(groupedFlags).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {isRTL ? "لا توجد صلاحيات مسجلة بعد" : "No feature flags configured yet"}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <Separator />

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {isRTL ? "حفظ الصلاحيات" : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManagePermissionsDialog;
