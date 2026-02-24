import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, ShieldCheck, Settings2, ChevronDown, ChevronRight,
  Calculator, FileText, Package, ShoppingCart, UserCheck, BarChart3,
  Car, Settings, Monitor, ArrowLeft, ArrowRight, Building2, Save,
} from "lucide-react";

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
  accounting: { icon: Calculator, ar: "المحاسبة المالية", en: "Financial Accounting" },
  sales: { icon: ShoppingCart, ar: "المبيعات", en: "Sales", overrideKey: "module_sales" },
  purchases: { icon: Package, ar: "المشتريات", en: "Purchases", overrideKey: "module_purchases" },
  hr: { icon: UserCheck, ar: "الموارد البشرية", en: "Human Resources", overrideKey: "module_hr" },
  inventory: { icon: Package, ar: "المخزون", en: "Inventory", overrideKey: "module_inventory" },
  reports: { icon: BarChart3, ar: "التقارير", en: "Reports", overrideKey: "module_reports" },
  auto_parts: { icon: Car, ar: "قطع الغيار", en: "Auto Parts", overrideKey: "module_auto_parts" },
  settings: { icon: Settings, ar: "الإعدادات", en: "Settings" },
};

const moduleOrder = ["accounting", "sales", "purchases", "hr", "inventory", "reports", "auto_parts", "settings"];

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
  const [screens, setScreens] = useState<SystemScreen[]>([]);
  const [enabledScreens, setEnabledScreens] = useState<Set<string>>(new Set());
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"modules" | "limits">("modules");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        // Load company
        const { data: companyData } = await supabase
          .from("companies")
          .select("id, name, name_en, email")
          .eq("id", id)
          .single();
        setCompany(companyData);

        // Load overrides
        const { data: override } = await supabase
          .from("company_feature_overrides" as any)
          .select("*")
          .eq("company_id", id)
          .maybeSingle();
        setData(override ? (override as any) : { ...defaultOverride });

        // Load plan features
        const { data: features } = await supabase.rpc("get_company_features" as any, {
          p_company_id: id,
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
          .eq("company_id", id);

        const enabledSet = new Set<string>();
        ((compScreens as any[]) || []).forEach((cs: any) => {
          if (cs.is_enabled) enabledSet.add(cs.screen_id);
        });
        setEnabledScreens(enabledSet);
      } catch (e) {
        console.error("Failed to load:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const groupedScreens = useMemo(() => {
    const groups: Record<string, SystemScreen[]> = {};
    screens.forEach((s) => {
      if (!groups[s.module]) groups[s.module] = [];
      groups[s.module].push(s);
    });
    return groups;
  }, [screens]);

  const orderedModules = moduleOrder.filter((m) => groupedScreens[m]?.length > 0);

  const toggleModule = (mod: string) => {
    setOpenModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  // Settings screens are mandatory - find their IDs
  const settingsScreenIds = useMemo(() => {
    return new Set((groupedScreens["settings"] || []).map((s) => s.id));
  }, [groupedScreens]);

  // Ensure settings screens are always enabled
  useEffect(() => {
    if (settingsScreenIds.size > 0) {
      setEnabledScreens((prev) => {
        const next = new Set(prev);
        settingsScreenIds.forEach((sid) => next.add(sid));
        return next;
      });
    }
  }, [settingsScreenIds]);

  const toggleScreen = (screenId: string) => {
    if (settingsScreenIds.has(screenId)) return; // Cannot toggle settings
    setEnabledScreens((prev) => {
      const next = new Set(prev);
      if (next.has(screenId)) next.delete(screenId);
      else next.add(screenId);
      return next;
    });
  };

  const toggleAllScreensInModule = (module: string) => {
    if (module === "settings") return; // Cannot toggle settings
    const moduleScreenIds = groupedScreens[module]?.map((s) => s.id) || [];
    const allEnabled = moduleScreenIds.every((id) => enabledScreens.has(id));
    setEnabledScreens((prev) => {
      const next = new Set(prev);
      moduleScreenIds.forEach((sid) => {
        if (allEnabled) next.delete(sid);
        else next.add(sid);
      });
      return next;
    });
  };

  const getModuleScreenCount = (module: string) => {
    const moduleScreenIds = groupedScreens[module]?.map((s) => s.id) || [];
    return moduleScreenIds.filter((sid) => enabledScreens.has(sid)).length;
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error: overrideError } = await supabase
        .from("company_feature_overrides" as any)
        .upsert({
          company_id: id,
          ...data,
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id" } as any);
      if (overrideError) throw overrideError;

      await supabase
        .from("client_screens")
        .delete()
        .eq("company_id", id);

      if (enabledScreens.size > 0) {
        const rows = Array.from(enabledScreens).map((screenId) => ({
          company_id: id,
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/owner/subscribers")}
        >
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {isRTL ? "إدارة الوصول" : "Manage Access"}
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
                {isRTL ? "استخدم قيم مخصصة بدلاً من إعدادات الخطة" : "Use custom values instead of plan defaults"}
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

            <TabsContent value="modules" className="mt-4">
              <div className="space-y-2">
                {orderedModules.map((module) => {
                  const config = moduleConfig[module];
                  if (!config) return null;
                  const Icon = config.icon;
                  const isOpen = openModules.includes(module);
                  const moduleScreens = groupedScreens[module] || [];
                  const enabledCount = getModuleScreenCount(module);
                  const allEnabled = moduleScreens.every((s) => enabledScreens.has(s.id));
                  const someEnabled = enabledCount > 0 && !allEnabled;
                  const isMandatory = module === "settings";

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
                      <Card>
                        {/* Module Header */}
                        <div className="flex items-center gap-3 p-3">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>

                          <Icon className="h-5 w-5 text-primary shrink-0" />

                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="font-semibold">
                              {isRTL ? config.ar : config.en}
                            </span>
                            {isMandatory && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {isRTL ? "إجباري" : "Required"}
                              </Badge>
                            )}
                          </div>

                          <Badge
                            variant={enabledCount === moduleScreens.length ? "default" : enabledCount > 0 ? "secondary" : "outline"}
                            className="text-xs shrink-0"
                          >
                            {enabledCount}/{moduleScreens.length}
                          </Badge>

                          {overrideKey && !isMandatory && (
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
                            {!isMandatory && (
                              <div
                                className="flex items-center gap-3 px-5 py-2.5 bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => toggleAllScreensInModule(module)}
                              >
                                <Checkbox
                                  checked={allEnabled}
                                  onCheckedChange={() => toggleAllScreensInModule(module)}
                                />
                                <span className="text-xs font-medium text-muted-foreground">
                                  {isRTL ? "تحديد الكل" : "Select All"}
                                </span>
                              </div>
                            )}

                            {moduleScreens.map((screen) => (
                              <div
                                key={screen.id}
                                className={`flex items-center gap-3 px-5 py-3 transition-colors border-b last:border-b-0 ${isMandatory ? "opacity-70" : "hover:bg-muted/30 cursor-pointer"}`}
                                onClick={() => !isMandatory && toggleScreen(screen.id)}
                              >
                                <Checkbox
                                  checked={enabledScreens.has(screen.id)}
                                  onCheckedChange={() => !isMandatory && toggleScreen(screen.id)}
                                  disabled={isMandatory}
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
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="limits" className="mt-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  {limitItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{isRTL ? item.labelAr : item.labelEn}</span>
                        <p className="text-xs text-muted-foreground">
                          ({isRTL ? "الخطة:" : "Plan:"} {getEffectiveValue(item.key)})
                        </p>
                      </div>
                      <Input
                        type="number"
                        className="w-28 text-center"
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ManageCompanyAccess;
