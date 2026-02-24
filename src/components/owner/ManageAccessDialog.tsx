import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, ShieldCheck, Settings2, ChevronDown, ChevronRight,
  Calculator, FileText, Package, ShoppingCart, UserCheck, BarChart3,
  Car, Settings, Monitor,
} from "lucide-react";

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

interface SystemScreen {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  module: string;
  sort_order: number;
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

const moduleConfig: Record<string, { icon: any; ar: string; en: string; overrideKey?: string }> = {
  accounting: { icon: Calculator, ar: "المحاسبة المالية", en: "Financial Accounting", overrideKey: undefined },
  sales: { icon: ShoppingCart, ar: "المبيعات", en: "Sales", overrideKey: "module_sales" },
  purchases: { icon: Package, ar: "المشتريات", en: "Purchases", overrideKey: "module_purchases" },
  hr: { icon: UserCheck, ar: "الموارد البشرية", en: "Human Resources", overrideKey: "module_hr" },
  inventory: { icon: Package, ar: "المخزون", en: "Inventory", overrideKey: "module_inventory" },
  reports: { icon: BarChart3, ar: "التقارير", en: "Reports", overrideKey: "module_reports" },
  auto_parts: { icon: Car, ar: "قطع الغيار", en: "Auto Parts", overrideKey: "module_auto_parts" },
  settings: { icon: Settings, ar: "الإعدادات", en: "Settings", overrideKey: undefined },
};

const ManageAccessDialog = ({ open, onOpenChange, company, onSaved }: ManageAccessDialogProps) => {
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OverrideData>(defaultOverride);
  const [planFeatures, setPlanFeatures] = useState<any>(null);
  const [screens, setScreens] = useState<SystemScreen[]>([]);
  const [enabledScreens, setEnabledScreens] = useState<Set<string>>(new Set());
  const [initialScreens, setInitialScreens] = useState<Set<string>>(new Set());
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"modules" | "limits">("modules");

  useEffect(() => {
    if (!open || !company) return;
    const load = async () => {
      setLoading(true);
      try {
        // Load overrides
        const { data: override } = await supabase
          .from("company_feature_overrides" as any)
          .select("*")
          .eq("company_id", company.id)
          .maybeSingle();
        setData(override ? (override as any) : { ...defaultOverride });

        // Load plan features
        const { data: features } = await supabase.rpc("get_company_features" as any, {
          p_company_id: company.id,
        });
        setPlanFeatures(features);

        // Load system screens
        const { data: screensData } = await supabase
          .from("system_screens")
          .select("*")
          .order("sort_order");
        setScreens((screensData as SystemScreen[]) || []);

        // Load company enabled screens
        const { data: compScreens } = await supabase
          .from("client_screens")
          .select("screen_id, is_enabled")
          .eq("company_id", company.id);

        const enabledSet = new Set<string>();
        ((compScreens as any[]) || []).forEach((cs: any) => {
          if (cs.is_enabled) enabledSet.add(cs.screen_id);
        });
        setEnabledScreens(enabledSet);
        setInitialScreens(new Set(enabledSet));
      } catch (e) {
        console.error("Failed to load:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, company]);

  const groupedScreens = useMemo(() => {
    const groups: Record<string, SystemScreen[]> = {};
    screens.forEach((s) => {
      if (!groups[s.module]) groups[s.module] = [];
      groups[s.module].push(s);
    });
    return groups;
  }, [screens]);

  // Ordered modules
  const moduleOrder = ["accounting", "sales", "purchases", "hr", "inventory", "reports", "auto_parts", "settings"];
  const orderedModules = moduleOrder.filter((m) => groupedScreens[m]?.length > 0);

  const toggleModule = (mod: string) => {
    setOpenModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const toggleScreen = (screenId: string) => {
    setEnabledScreens((prev) => {
      const next = new Set(prev);
      if (next.has(screenId)) next.delete(screenId);
      else next.add(screenId);
      return next;
    });
  };

  const toggleAllScreensInModule = (module: string) => {
    const moduleScreenIds = groupedScreens[module]?.map((s) => s.id) || [];
    const allEnabled = moduleScreenIds.every((id) => enabledScreens.has(id));
    setEnabledScreens((prev) => {
      const next = new Set(prev);
      moduleScreenIds.forEach((id) => {
        if (allEnabled) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const getModuleScreenCount = (module: string) => {
    const moduleScreenIds = groupedScreens[module]?.map((s) => s.id) || [];
    return moduleScreenIds.filter((id) => enabledScreens.has(id)).length;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save feature overrides
      const { error: overrideError } = await supabase
        .from("company_feature_overrides" as any)
        .upsert({
          company_id: company.id,
          ...data,
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id" } as any);
      if (overrideError) throw overrideError;

      // Save screen access
      await supabase
        .from("client_screens")
        .delete()
        .eq("company_id", company.id);

      if (enabledScreens.size > 0) {
        const rows = Array.from(enabledScreens).map((screenId) => ({
          company_id: company.id,
          screen_id: screenId,
          is_enabled: true,
        }));
        const { error: screenError } = await supabase
          .from("client_screens")
          .insert(rows);
        if (screenError) throw screenError;
      }

      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم تحديث إعدادات الوصول بنجاح" : "Access settings updated successfully",
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isRTL ? "إدارة الوصول" : "Manage Access"}
          </DialogTitle>
          <DialogDescription>
            {company?.name} — {isRTL ? "تحكم في الوحدات والصفحات والحدود" : "Control modules, pages, and limits"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
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
                {planFeatures?.plan_name && (
                  <Badge variant="outline" className="gap-1 w-fit">
                    <Settings2 className="h-3 w-3" />
                    {isRTL ? "الخطة الحالية:" : "Current plan:"} {planFeatures.plan_name}
                  </Badge>
                )}

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="modules" className="gap-2">
                      <Monitor className="h-4 w-4" />
                      {isRTL ? "الوحدات والصفحات" : "Modules & Pages"}
                    </TabsTrigger>
                    <TabsTrigger value="limits" className="gap-2">
                      <Settings2 className="h-4 w-4" />
                      {isRTL ? "الحدود الشهرية" : "Monthly Limits"}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="modules" className="mt-3">
                    <ScrollArea className="max-h-[40vh]">
                      <div className="space-y-1.5 pe-3">
                        {orderedModules.map((module) => {
                          const config = moduleConfig[module];
                          if (!config) return null;
                          const Icon = config.icon;
                          const isOpen = openModules.includes(module);
                          const moduleScreens = groupedScreens[module] || [];
                          const enabledCount = getModuleScreenCount(module);
                          const allEnabled = moduleScreens.every((s) => enabledScreens.has(s.id));
                          const someEnabled = enabledCount > 0 && !allEnabled;

                          // Module-level override toggle
                          const overrideKey = config.overrideKey;
                          const moduleEnabled = overrideKey
                            ? ((data as any)[overrideKey] ?? (planFeatures as any)?.[overrideKey] ?? true)
                            : true;

                          return (
                            <Collapsible
                              key={module}
                              open={isOpen}
                              onOpenChange={() => toggleModule(module)}
                            >
                              <div className="rounded-lg border bg-card">
                                {/* Module Header */}
                                <div className="flex items-center gap-2 p-2.5">
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                      {isOpen ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>

                                  <Icon className="h-4 w-4 text-primary shrink-0" />

                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-sm">
                                      {isRTL ? config.ar : config.en}
                                    </span>
                                  </div>

                                  <Badge
                                    variant={enabledCount === moduleScreens.length ? "default" : enabledCount > 0 ? "secondary" : "outline"}
                                    className="text-xs shrink-0"
                                  >
                                    {enabledCount}/{moduleScreens.length}
                                  </Badge>

                                  {overrideKey && (
                                    <Switch
                                      checked={moduleEnabled}
                                      onCheckedChange={(v) => setData((d) => ({ ...d, [overrideKey]: v }))}
                                      className="shrink-0"
                                    />
                                  )}
                                </div>

                                {/* Screens List */}
                                <CollapsibleContent>
                                  <div className="border-t">
                                    {/* Select All */}
                                    <div
                                      className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                                      onClick={() => toggleAllScreensInModule(module)}
                                    >
                                      <Checkbox
                                        checked={allEnabled}
                                        // @ts-ignore
                                        indeterminate={someEnabled}
                                        onCheckedChange={() => toggleAllScreensInModule(module)}
                                      />
                                      <span className="text-xs font-medium text-muted-foreground">
                                        {isRTL ? "تحديد الكل" : "Select All"}
                                      </span>
                                    </div>

                                    {moduleScreens.map((screen) => (
                                      <div
                                        key={screen.id}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer border-b last:border-b-0"
                                        onClick={() => toggleScreen(screen.id)}
                                      >
                                        <Checkbox
                                          checked={enabledScreens.has(screen.id)}
                                          onCheckedChange={() => toggleScreen(screen.id)}
                                        />
                                        <span className="text-sm flex-1">
                                          {isRTL ? screen.name_ar : screen.name_en}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {screen.key}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="limits" className="mt-3">
                    <div className="space-y-3">
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
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}

        <Separator />

        <DialogFooter className="gap-2 pt-2">
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
