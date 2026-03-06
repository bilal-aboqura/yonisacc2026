import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, ShieldCheck, Settings2, ArrowLeft, ArrowRight, Building2, Save,
  Package, Monitor, Shield, ChevronDown, ChevronRight, Gauge,
  FileText, Users, BarChart3, Car, Calculator,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────
interface OverrideData {
  custom_override: boolean;
  max_journal_entries: number | null;
  max_sales_invoices: number | null;
  max_purchase_invoices: number | null;
  max_users: number | null;
  module_sales: boolean;
  module_purchases: boolean;
  module_reports: boolean;
  module_inventory: boolean;
  module_hr: boolean;
  module_auto_parts: boolean;
}

interface SystemScreen {
  id: string; key: string; name_ar: string; name_en: string;
  description_ar: string | null; description_en: string | null;
  module: string; sort_order: number;
}

interface Permission {
  id: string; code: string; module: string;
  description: string; description_ar: string | null;
}

const defaultOverride: OverrideData = {
  custom_override: false,
  max_journal_entries: null, max_sales_invoices: null,
  max_purchase_invoices: null, max_users: null,
  module_sales: true, module_purchases: true, module_reports: true,
  module_inventory: true, module_hr: false, module_auto_parts: false,
};

const limitItems = [
  { key: "max_journal_entries", labelAr: "قيود اليومية / شهر", labelEn: "Journal Entries / Month" },
  { key: "max_sales_invoices", labelAr: "فواتير مبيعات / شهر", labelEn: "Sales Invoices / Month" },
  { key: "max_purchase_invoices", labelAr: "فواتير مشتريات / شهر", labelEn: "Purchase Invoices / Month" },
  { key: "max_users", labelAr: "عدد المستخدمين", labelEn: "Max Users" },
];

const moduleItems = [
  { key: "module_sales", labelAr: "المبيعات", labelEn: "Sales", icon: FileText },
  { key: "module_purchases", labelAr: "المشتريات", labelEn: "Purchases", icon: Package },
  { key: "module_reports", labelAr: "التقارير", labelEn: "Reports", icon: BarChart3 },
  { key: "module_inventory", labelAr: "المخزون", labelEn: "Inventory", icon: Package },
  { key: "module_hr", labelAr: "الموارد البشرية", labelEn: "HR", icon: Users },
  { key: "module_auto_parts", labelAr: "قطع الغيار", labelEn: "Auto Parts", icon: Car },
];

const moduleLabels: Record<string, { ar: string; en: string }> = {
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  accounting: { ar: "المحاسبة", en: "Accounting" },
  sales: { ar: "المبيعات", en: "Sales" },
  purchases: { ar: "المشتريات", en: "Purchases" },
  inventory: { ar: "المخزون", en: "Inventory" },
  reports: { ar: "التقارير", en: "Reports" },
  hr: { ar: "الموارد البشرية", en: "Human Resources" },
  treasury: { ar: "الخزينة", en: "Treasury" },
  contacts: { ar: "جهات الاتصال", en: "Contacts" },
  settings: { ar: "الإعدادات", en: "Settings" },
  print: { ar: "الطباعة", en: "Print" },
  auto_parts: { ar: "قطع الغيار", en: "Auto Parts" },
  gold: { ar: "الذهب والمجوهرات", en: "Gold & Jewelry" },
};

const screenModuleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  settings: Settings2, sales: FileText, inventory: Package,
  accounting: Calculator, hr: Users, reports: BarChart3, auto_parts: Car, gold: Package,
};

// ─── Component ────────────────────────────────────────────────────────────
const ManageCompanyAccess = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [planFeatures, setPlanFeatures] = useState<any>(null);

  // Tab 1: Override data (modules + limits)
  const [data, setData] = useState<OverrideData>(defaultOverride);
  const [savingOverride, setSavingOverride] = useState(false);

  // Tab 2: Screen access
  const [screens, setScreens] = useState<SystemScreen[]>([]);
  const [selectedScreens, setSelectedScreens] = useState<Set<string>>(new Set());
  const [savingScreens, setSavingScreens] = useState(false);

  // Tab 3: Permission bounds
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [planId, setPlanId] = useState<string | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);
  const [openModules, setOpenModules] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        // Company info
        const { data: companyData } = await supabase
          .from("companies")
          .select("id, name, name_en, email, activity_type")
          .eq("id", id)
          .single();
        setCompany(companyData);

        // Override data
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
            module_sales: (override as any).module_sales ?? true,
            module_purchases: (override as any).module_purchases ?? true,
            module_reports: (override as any).module_reports ?? true,
            module_inventory: (override as any).module_inventory ?? true,
            module_hr: (override as any).module_hr ?? false,
            module_auto_parts: (override as any).module_auto_parts ?? false,
          });
        }

        // Plan features
        const { data: features } = await supabase.rpc("get_company_features" as any, { p_company_id: id });
        setPlanFeatures(features);

        // Screens
        const { data: screensData } = await supabase.from("system_screens").select("*").order("sort_order");
        setScreens((screensData as SystemScreen[]) || []);

        const { data: compScreens } = await supabase.from("client_screens").select("screen_id, is_enabled").eq("company_id", id);
        const enabledSet = new Set<string>();
        ((compScreens as any[]) || []).forEach((cs: any) => { if (cs.is_enabled) enabledSet.add(cs.screen_id); });
        setSelectedScreens(enabledSet);

        // RBAC Permissions
        const { data: permsData } = await supabase.from("rbac_permissions" as any).select("*").order("module, code");
        setPermissions((permsData as any) || []);

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan_id")
          .eq("company_id", id)
          .in("status", ["active", "trialing"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const pId = sub?.plan_id || null;
        setPlanId(pId);

        if (pId) {
          const { data: bounds } = await supabase
            .from("plan_permission_bounds" as any)
            .select("permission_id, allowed")
            .eq("plan_id", pId)
            .eq("allowed", false);
          const blocked = new Set<string>();
          ((bounds as any) || []).forEach((b: any) => blocked.add(b.permission_id));
          setBlockedIds(blocked);
        }
      } catch (e) {
        console.error("Failed to load:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ─── Save: Modules & Limits ──────────────────────────────────────────
  const handleSaveOverride = async () => {
    if (!id) return;
    setSavingOverride(true);
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
          module_sales: data.module_sales,
          module_purchases: data.module_purchases,
          module_reports: data.module_reports,
          module_inventory: data.module_inventory,
          module_hr: data.module_hr,
          module_auto_parts: data.module_auto_parts,
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id" } as any);
      if (error) throw error;
      toast({ title: isRTL ? "تم الحفظ" : "Saved", description: isRTL ? "تم تحديث الوحدات والحدود" : "Modules & limits updated" });
    } catch (e: any) {
      toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingOverride(false);
    }
  };

  // ─── Save: Screens ────────────────────────────────────────────────────
  const handleSaveScreens = async () => {
    if (!id) return;
    setSavingScreens(true);
    try {
      await supabase.from("client_screens").delete().eq("company_id", id);
      if (selectedScreens.size > 0) {
        const rows = Array.from(selectedScreens).map((screenId) => ({ company_id: id, screen_id: screenId, is_enabled: true }));
        const { error } = await supabase.from("client_screens").insert(rows);
        if (error) throw error;
      }
      toast({ title: isRTL ? "تم الحفظ" : "Saved", description: isRTL ? "تم تحديث الشاشات" : "Screens updated" });
    } catch (e: any) {
      toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingScreens(false);
    }
  };

  // ─── Save: Permissions ────────────────────────────────────────────────
  const handleSavePermissions = async () => {
    if (!planId) {
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "لا توجد باقة نشطة" : "No active plan found", variant: "destructive" });
      return;
    }
    setSavingPerms(true);
    try {
      await supabase.from("plan_permission_bounds" as any).delete().eq("plan_id", planId);
      if (blockedIds.size > 0) {
        const inserts = Array.from(blockedIds).map(pid => ({ plan_id: planId, permission_id: pid, allowed: false }));
        const { error } = await supabase.from("plan_permission_bounds" as any).insert(inserts);
        if (error) throw error;
      }
      toast({ title: isRTL ? "تم الحفظ" : "Saved", description: isRTL ? "تم تحديث حدود الصلاحيات" : "Permission bounds updated" });
    } catch (e: any) {
      toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingPerms(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────
  const getEffectiveValue = (key: string) => {
    if (!planFeatures) return "—";
    return (planFeatures as any)[key] ?? (isRTL ? "غير محدود" : "Unlimited");
  };

  const groupedScreens = useMemo(() => {
    const groups: Record<string, SystemScreen[]> = {};
    screens.forEach((s) => {
      if (!groups[s.module]) groups[s.module] = [];
      groups[s.module].push(s);
    });
    return groups;
  }, [screens]);

  const toggleScreen = (screenId: string) => {
    setSelectedScreens((prev) => {
      const next = new Set(prev);
      if (next.has(screenId)) next.delete(screenId); else next.add(screenId);
      return next;
    });
  };

  const toggleScreenModule = (module: string) => {
    const ids = groupedScreens[module]?.map((s) => s.id) || [];
    const allSelected = ids.every((id) => selectedScreens.has(id));
    setSelectedScreens((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => { if (allSelected) next.delete(id); else next.add(id); });
      return next;
    });
  };

  const groupedPerms = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach(p => {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    });
    return groups;
  }, [permissions]);

  const togglePermission = (permId: string) => {
    setBlockedIds(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId); else next.add(permId);
      return next;
    });
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/owner/subscribers")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {isRTL ? "إدارة الوصول والصلاحيات" : "Access & Permissions"}
            </h1>
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {company.name}
              {company.name_en && ` — ${company.name_en}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="modules" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="modules" className="gap-1.5 text-xs sm:text-sm">
            <Package className="h-3.5 w-3.5 hidden sm:block" />
            {isRTL ? "الوحدات والحدود" : "Modules & Limits"}
          </TabsTrigger>
          <TabsTrigger value="screens" className="gap-1.5 text-xs sm:text-sm">
            <Monitor className="h-3.5 w-3.5 hidden sm:block" />
            {isRTL ? "الشاشات" : "Screens"}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5 text-xs sm:text-sm">
            <Shield className="h-3.5 w-3.5 hidden sm:block" />
            {isRTL ? "الصلاحيات" : "Permissions"}
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Modules & Limits ─────────────────────────────────── */}
        <TabsContent value="modules" className="space-y-4">
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
                <Switch checked={data.custom_override} onCheckedChange={(v) => setData((d) => ({ ...d, custom_override: v }))} />
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

              {/* Modules */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5" />
                    {isRTL ? "الوحدات المتاحة" : "Available Modules"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {moduleItems.map((mod) => (
                    <div key={mod.key} className="flex items-center justify-between rounded-lg border p-3 bg-card">
                      <div className="flex items-center gap-2">
                        <mod.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{isRTL ? mod.labelAr : mod.labelEn}</span>
                      </div>
                      <Switch
                        checked={(data as any)[mod.key]}
                        onCheckedChange={(v) => setData((d) => ({ ...d, [mod.key]: v }))}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="h-5 w-5" />
                    {isRTL ? "الحدود الشهرية" : "Monthly Limits"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {limitItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm">{isRTL ? item.labelAr : item.labelEn}</span>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? "الافتراضي:" : "Default:"} {getEffectiveValue(item.key)}
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
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "اتركه فارغاً لاستخدام القيمة الافتراضية" : "Leave empty for plan default"}
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSaveOverride} disabled={savingOverride} className="gap-2">
              {savingOverride ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isRTL ? "حفظ الوحدات والحدود" : "Save Modules & Limits"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── Tab: Screens ──────────────────────────────────────────── */}
        <TabsContent value="screens" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isRTL ? "تحكم في الصفحات المتاحة لهذه الشركة" : "Control which pages are available for this company"}
          </p>

          {Object.entries(groupedScreens).map(([module, moduleScreens]) => {
            const Icon = screenModuleIcons[module] || Monitor;
            const allSelected = moduleScreens.every((s) => selectedScreens.has(s.id));
            const selectedCount = moduleScreens.filter((s) => selectedScreens.has(s.id)).length;
            const label = moduleLabels[module] || { ar: module, en: module };

            return (
              <Card key={module}>
                <CardContent className="p-0">
                  {/* Module header */}
                  <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={allSelected} onCheckedChange={() => toggleScreenModule(module)} />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{isRTL ? label.ar : label.en}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{selectedCount}/{moduleScreens.length}</Badge>
                  </div>
                  {/* Screen items */}
                  <div className="divide-y">
                    {moduleScreens.map((screen) => (
                      <div
                        key={screen.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleScreen(screen.id)}
                      >
                        <Checkbox checked={selectedScreens.has(screen.id)} onCheckedChange={() => toggleScreen(screen.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{isRTL ? screen.name_ar : screen.name_en}</p>
                          {(screen.description_ar || screen.description_en) && (
                            <p className="text-xs text-muted-foreground truncate">{isRTL ? screen.description_ar : screen.description_en}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0 font-mono">{screen.key}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex justify-end">
            <Button onClick={handleSaveScreens} disabled={savingScreens} className="gap-2">
              {savingScreens ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isRTL ? "حفظ الشاشات" : "Save Screens"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── Tab: Permissions (Table) ──────────────────────────────── */}
        <TabsContent value="permissions" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isRTL ? "حدد السقف الأعلى للصلاحيات المتاحة لهذه الباقة (الصلاحيات المحظورة لن تكون متاحة حتى لو أضافها مدير الشركة)" : "Set the maximum permissions available (blocked permissions won't be available even if assigned by company admin)"}
          </p>

          {!planId && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                {isRTL ? "لا توجد باقة نشطة لهذه الشركة" : "No active plan found for this company"}
              </CardContent>
            </Card>
          )}

          {planId && (
            <Card>
              <CardContent className="p-0">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b [&_tr]:bg-muted/60 dark:[&_tr]:bg-muted/30">
                      <tr className="border-b">
                        <th className="h-12 px-4 text-start align-middle font-semibold text-muted-foreground whitespace-nowrap">
                          {isRTL ? "الوحدة" : "Module"}
                        </th>
                        <th className="h-12 px-4 text-start align-middle font-semibold text-muted-foreground whitespace-nowrap">
                          {isRTL ? "الصلاحية" : "Permission"}
                        </th>
                        <th className="h-12 px-4 text-start align-middle font-semibold text-muted-foreground whitespace-nowrap">
                          {isRTL ? "الكود" : "Code"}
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-semibold text-muted-foreground whitespace-nowrap">
                          {isRTL ? "مسموح" : "Allowed"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {Object.entries(groupedPerms).map(([module, perms]) => {
                        const label = moduleLabels[module] || { ar: module, en: module };
                        return perms.map((perm, idx) => {
                          const isAllowed = !blockedIds.has(perm.id);
                          return (
                            <tr
                              key={perm.id}
                              className={`border-b transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${
                                !isAllowed ? "bg-destructive/5" : ""
                              }`}
                            >
                              {idx === 0 && (
                                <td
                                  rowSpan={perms.length}
                                  className="px-4 py-3.5 align-middle font-medium border-e"
                                >
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const Icon = screenModuleIcons[module] || Shield;
                                      return <Icon className="h-4 w-4 text-muted-foreground" />;
                                    })()}
                                    <span>{isRTL ? label.ar : label.en}</span>
                                  </div>
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    {perms.filter(p => !blockedIds.has(p.id)).length}/{perms.length}
                                  </Badge>
                                </td>
                              )}
                              <td className="px-4 py-3.5 align-middle">
                                <span className="text-sm">
                                  {isRTL ? (perm.description_ar || perm.description) : perm.description}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 align-middle">
                                <code className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                  {perm.code}
                                </code>
                              </td>
                              <td className="px-4 py-3.5 align-middle text-center">
                                <Switch
                                  checked={isAllowed}
                                  onCheckedChange={() => togglePermission(perm.id)}
                                />
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {planId && (
            <div className="flex justify-end">
              <Button onClick={handleSavePermissions} disabled={savingPerms} className="gap-2">
                {savingPerms ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isRTL ? "حفظ الصلاحيات" : "Save Permissions"}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageCompanyAccess;
