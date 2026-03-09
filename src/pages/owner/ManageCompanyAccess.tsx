import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, ShieldCheck, Settings2, ArrowLeft, ArrowRight, Building2, Save,
  Package, Shield, Gauge, Blocks, Check, X,
  FileText, Users, BarChart3, Car, Calculator, Landmark, CreditCard,
  ShoppingCart, Warehouse, Heart, Building, Truck, Gem, Monitor, HardDrive,
} from "lucide-react";

// ─── Module definitions ───────────────────────────────────────────────────
const ALL_MODULES = [
  { key: "accounting", labelAr: "المحاسبة", labelEn: "Accounting", icon: Calculator, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { key: "sales", labelAr: "المبيعات", labelEn: "Sales", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { key: "purchases", labelAr: "المشتريات", labelEn: "Purchases", icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { key: "inventory", labelAr: "المخزون", labelEn: "Inventory", icon: Warehouse, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  { key: "hr", labelAr: "الموارد البشرية", labelEn: "HR", icon: Users, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
  { key: "treasury", labelAr: "الخزينة", labelEn: "Treasury", icon: Landmark, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { key: "reports", labelAr: "التقارير", labelEn: "Reports", icon: BarChart3, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  { key: "pos", labelAr: "نقاط البيع", labelEn: "POS", icon: Monitor, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
  { key: "gold", labelAr: "الذهب والمجوهرات", labelEn: "Gold & Jewelry", icon: Gem, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  { key: "autoparts", labelAr: "قطع السيارات", labelEn: "Auto Parts", icon: Car, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  { key: "clinic", labelAr: "العيادة", labelEn: "Clinic", icon: Heart, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
  { key: "realestate", labelAr: "العقارات", labelEn: "Real Estate", icon: Building, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30" },
  { key: "delivery", labelAr: "التوصيل", labelEn: "Delivery", icon: Truck, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/30" },
  { key: "assets", labelAr: "الأصول الثابتة", labelEn: "Fixed Assets", icon: HardDrive, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-950/30" },
  { key: "fuelstation", labelAr: "محطات الوقود", labelEn: "Fuel Station", icon: Landmark, color: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-950/30" },
];

// ─── Types ────────────────────────────────────────────────────────────────
interface OverrideData {
  custom_override: boolean;
  max_journal_entries: number | null;
  max_sales_invoices: number | null;
  max_purchase_invoices: number | null;
  max_users: number | null;
}

interface Permission {
  id: string; code: string; module: string;
  description: string; description_ar: string | null;
}

const defaultOverride: OverrideData = {
  custom_override: false,
  max_journal_entries: null, max_sales_invoices: null,
  max_purchase_invoices: null, max_users: null,
};

const limitItems = [
  { key: "max_journal_entries", labelAr: "قيود اليومية / شهر", labelEn: "Journal Entries / Month" },
  { key: "max_sales_invoices", labelAr: "فواتير مبيعات / شهر", labelEn: "Sales Invoices / Month" },
  { key: "max_purchase_invoices", labelAr: "فواتير مشتريات / شهر", labelEn: "Purchase Invoices / Month" },
  { key: "max_users", labelAr: "عدد المستخدمين", labelEn: "Max Users" },
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
  pos: { ar: "نقاط البيع", en: "POS" },
  clinic: { ar: "العيادة", en: "Clinic" },
  realestate: { ar: "العقارات", en: "Real Estate" },
  delivery: { ar: "التوصيل", en: "Delivery" },
  assets: { ar: "الأصول الثابتة", en: "Fixed Assets" },
};

// ─── Component ────────────────────────────────────────────────────────────
const ManageCompanyAccess = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [planFeatures, setPlanFeatures] = useState<any>(null);

  // Tab 1: Modules
  const [selectedModules, setSelectedModules] = useState<string[]>(ALL_MODULES.map(m => m.key));
  const [savingModules, setSavingModules] = useState(false);

  // Tab 2: Limits
  const [data, setData] = useState<OverrideData>(defaultOverride);
  const [savingOverride, setSavingOverride] = useState(false);

  // Tab 3: Permissions
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [planId, setPlanId] = useState<string | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        // Company info
        const { data: companyData } = await supabase
          .from("companies")
          .select("id, name, name_en, email, activity_type, owner_id")
          .eq("id", id)
          .single();
        setCompany(companyData);

        // Load allowed_modules from any company_members record
        const { data: memberData } = await supabase
          .from("company_members")
          .select("allowed_modules")
          .eq("company_id", id)
          .limit(1)
          .maybeSingle();
        if (memberData?.allowed_modules && Array.isArray(memberData.allowed_modules)) {
          setSelectedModules(memberData.allowed_modules);
        }

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
          });
        }

        // Plan features
        const { data: features } = await supabase.rpc("get_company_features" as any, { p_company_id: id });
        setPlanFeatures(features);

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

  // ─── Save: Modules ────────────────────────────────────────────────
  const handleSaveModules = async () => {
    if (!id || !company?.owner_id) return;
    setSavingModules(true);
    try {
      // Update ALL company_members for this company
      const { data: updated, error } = await supabase
        .from("company_members")
        .update({ allowed_modules: selectedModules })
        .eq("company_id", id)
        .select("id");
      if (error) throw error;
      const count = updated?.length ?? 0;
      if (error) throw error;

      // If no records existed, create one for the owner
      if (!count || count === 0) {
        const { error: insertError } = await supabase
          .from("company_members")
          .insert({
            company_id: id,
            user_id: company.owner_id,
            role: "owner" as any,
            allowed_modules: selectedModules,
            is_active: true,
          });
        if (insertError) throw insertError;
      }

      toast({ title: isRTL ? "تم الحفظ" : "Saved", description: isRTL ? "تم تحديث الوحدات المتاحة" : "Available modules updated" });
    } catch (e: any) {
      toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingModules(false);
    }
  };

  // ─── Save: Limits ──────────────────────────────────────────────────
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
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id" } as any);
      if (error) throw error;
      toast({ title: isRTL ? "تم الحفظ" : "Saved", description: isRTL ? "تم تحديث الحدود" : "Limits updated" });
    } catch (e: any) {
      toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingOverride(false);
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

  const groupedPerms = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach(p => {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    });
    return groups;
  }, [permissions]);

  const toggleModule = (key: string) => {
    setSelectedModules(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]);
  };

  const togglePermission = (permId: string) => {
    setBlockedIds(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId); else next.add(permId);
      return next;
    });
  };

  const toggleModulePerms = (module: string) => {
    const perms = groupedPerms[module] || [];
    const allBlocked = perms.every(p => blockedIds.has(p.id));
    setBlockedIds(prev => {
      const next = new Set(prev);
      perms.forEach(p => { allBlocked ? next.delete(p.id) : next.add(p.id); });
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

  const activeCount = selectedModules.length;
  const totalCount = ALL_MODULES.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
            <Blocks className="h-3.5 w-3.5 hidden sm:block" />
            {isRTL ? "الوحدات" : "Modules"}
          </TabsTrigger>
          <TabsTrigger value="limits" className="gap-1.5 text-xs sm:text-sm">
            <Gauge className="h-3.5 w-3.5 hidden sm:block" />
            {isRTL ? "الحدود" : "Limits"}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5 text-xs sm:text-sm">
            <Shield className="h-3.5 w-3.5 hidden sm:block" />
            {isRTL ? "الصلاحيات" : "Permissions"}
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Modules ──────────────────────────────────────── */}
        <TabsContent value="modules" className="space-y-4">
          {/* Summary bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
                      {activeCount}/{totalCount}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {isRTL ? "وحدة مفعّلة" : "modules active"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedModules(ALL_MODULES.map(m => m.key))}
                    disabled={activeCount === totalCount}
                    className="gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isRTL ? "تحديد الكل" : "Select All"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedModules([])}
                    disabled={activeCount === 0}
                    className="gap-1.5"
                  >
                    <X className="h-3.5 w-3.5" />
                    {isRTL ? "إلغاء الكل" : "Deselect All"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Module grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ALL_MODULES.map((mod) => {
              const Icon = mod.icon;
              const isActive = selectedModules.includes(mod.key);
              return (
                <Card
                  key={mod.key}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isActive
                      ? "border-primary/40 shadow-sm"
                      : "opacity-50 border-muted"
                  }`}
                  onClick={() => toggleModule(mod.key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${mod.bg} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${mod.color}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {isRTL ? mod.labelAr : mod.labelEn}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isRTL ? mod.labelEn : mod.labelAr}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => toggleModule(mod.key)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveModules} disabled={savingModules} className="gap-2">
              {savingModules ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isRTL ? "حفظ الوحدات" : "Save Modules"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── Tab: Limits ─────────────────────────────────────────── */}
        <TabsContent value="limits" className="space-y-4">
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
              {isRTL ? "حفظ الحدود" : "Save Limits"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── Tab: Permissions ──────────────────────────────────── */}
        <TabsContent value="permissions" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? "حدد السقف الأعلى للصلاحيات المتاحة لهذه الباقة (الصلاحيات المحظورة لن تكون متاحة حتى لو أضافها مدير الشركة)"
              : "Set the maximum permissions available (blocked permissions won't be available even if assigned by company admin)"}
          </p>

          {!planId && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                {isRTL ? "لا توجد باقة نشطة لهذه الشركة" : "No active plan found for this company"}
              </CardContent>
            </Card>
          )}

          {planId && (
            <div className="space-y-3">
              {Object.entries(groupedPerms).map(([module, perms]) => {
                const label = moduleLabels[module] || { ar: module, en: module };
                const allowedCount = perms.filter(p => !blockedIds.has(p.id)).length;
                const allAllowed = allowedCount === perms.length;
                const noneAllowed = allowedCount === 0;

                return (
                  <Card key={module}>
                    <CardHeader className="p-4 pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-semibold">
                            {isRTL ? label.ar : label.en}
                          </CardTitle>
                          <Badge variant={noneAllowed ? "destructive" : allAllowed ? "default" : "secondary"} className="text-xs">
                            {allowedCount}/{perms.length}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => toggleModulePerms(module)}
                        >
                          {allAllowed
                            ? (isRTL ? "حظر الكل" : "Block All")
                            : (isRTL ? "سماح الكل" : "Allow All")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map(perm => {
                          const isAllowed = !blockedIds.has(perm.id);
                          return (
                            <div
                              key={perm.id}
                              className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                                isAllowed
                                  ? "border-border hover:border-primary/30"
                                  : "border-destructive/20 bg-destructive/5"
                              }`}
                            >
                              <div className="flex-1 min-w-0 me-3">
                                <p className="text-xs font-medium truncate">
                                  {isRTL ? (perm.description_ar || perm.description) : perm.description}
                                </p>
                                <code className="text-[10px] text-muted-foreground font-mono">
                                  {perm.code}
                                </code>
                              </div>
                              <Switch
                                checked={isAllowed}
                                onCheckedChange={() => togglePermission(perm.id)}
                                className="shrink-0"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
