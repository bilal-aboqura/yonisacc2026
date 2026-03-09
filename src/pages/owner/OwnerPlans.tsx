import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Pencil, Trash2, Loader2, CreditCard, Plus, X, Shield, BarChart3, FileText, Users, Building2, FileBarChart, BookOpen,
  Calculator, ShoppingCart, Warehouse, Landmark, Monitor, Gem, Car, Heart, Building, Truck, HardDrive, Blocks, Check,
} from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";

// ─── Module definitions (same as ManageCompanyAccess) ─────────────────────
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
];

interface Plan {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  duration_months: number;
  max_invoices: number | null;
  max_entries: number | null;
  max_users: number | null;
  max_branches: number | null;
  max_sales_invoices: number | null;
  max_purchase_invoices: number | null;
  max_journal_entries: number | null;
  features_ar: string[] | null;
  features_en: string[] | null;
  not_included_ar: string[] | null;
  not_included_en: string[] | null;
  allowed_modules: string[] | null;
  is_active: boolean;
  sort_order: number | null;
}

interface FormData {
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  price: number;
  duration_months: number;
  max_invoices: string;
  max_entries: string;
  max_users: string;
  max_branches: string;
  max_sales_invoices: string;
  max_purchase_invoices: string;
  max_journal_entries: string;
  features_ar: string[];
  features_en: string[];
  not_included_ar: string[];
  not_included_en: string[];
  allowed_modules: string[];
  is_active: boolean;
  sort_order: number;
}

const defaultForm: FormData = {
  name_ar: "", name_en: "", description_ar: "", description_en: "",
  price: 0, duration_months: 1,
  max_invoices: "", max_entries: "", max_users: "", max_branches: "",
  max_sales_invoices: "", max_purchase_invoices: "", max_journal_entries: "",
  features_ar: [], features_en: [], not_included_ar: [], not_included_en: [],
  allowed_modules: ALL_MODULES.map(m => m.key),
  is_active: true, sort_order: 0,
};

const OwnerPlans = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<FormData>({ ...defaultForm });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["owner-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_plans").select("*").order("sort_order");
      if (error) throw error;
      return data as Plan[];
    },
  });

  // Sync allowed_modules to all company_members under this plan's subscribers
  const syncModulesToSubscribers = async (planId: string, allowedModules: string[]) => {
    // Get all active subscriptions for this plan
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("company_id")
      .eq("plan_id", planId)
      .in("status", ["active", "trialing"]);

    if (!subs || subs.length === 0) return 0;

    const companyIds = subs.map(s => s.company_id);

    // Update all company_members for these companies
    const { error } = await supabase
      .from("company_members")
      .update({ allowed_modules: allowedModules })
      .in("company_id", companyIds);

    if (error) throw error;
    return companyIds.length;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const planData: any = {
        name_ar: data.name_ar, name_en: data.name_en,
        description_ar: data.description_ar || null, description_en: data.description_en || null,
        price: data.price, duration_months: data.duration_months,
        max_invoices: data.max_invoices ? parseInt(data.max_invoices) : null,
        max_entries: data.max_entries ? parseInt(data.max_entries) : null,
        max_users: data.max_users ? parseInt(data.max_users) : null,
        max_branches: data.max_branches ? parseInt(data.max_branches) : null,
        max_sales_invoices: data.max_sales_invoices ? parseInt(data.max_sales_invoices) : null,
        max_purchase_invoices: data.max_purchase_invoices ? parseInt(data.max_purchase_invoices) : null,
        max_journal_entries: data.max_journal_entries ? parseInt(data.max_journal_entries) : null,
        features_ar: data.features_ar.length ? data.features_ar : [],
        features_en: data.features_en.length ? data.features_en : [],
        not_included_ar: data.not_included_ar.length ? data.not_included_ar : [],
        not_included_en: data.not_included_en.length ? data.not_included_en : [],
        allowed_modules: data.allowed_modules,
        is_active: data.is_active, sort_order: data.sort_order,
      };

      let planId = editingPlan?.id;

      if (editingPlan) {
        const { error } = await supabase.from("subscription_plans").update(planData).eq("id", editingPlan.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("subscription_plans").insert([planData]).select("id").single();
        if (error) throw error;
        planId = inserted.id;
      }

      // Sync modules to subscribers
      if (planId) {
        const count = await syncModulesToSubscribers(planId, data.allowed_modules);
        return count;
      }
      return 0;
    },
    onSuccess: (syncedCount) => {
      queryClient.invalidateQueries({ queryKey: ["owner-plans"] });
      setIsDialogOpen(false);
      resetForm();
      const desc = syncedCount > 0
        ? (isRTL ? `تم حفظ الباقة وتحديث ${syncedCount} شركة` : `Plan saved and ${syncedCount} companies updated`)
        : (isRTL ? "تم حفظ الباقة بنجاح" : "Plan saved successfully");
      toast({ title: isRTL ? "تم الحفظ" : "Saved", description: desc });
    },
    onError: () => {
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "حدث خطأ أثناء الحفظ" : "Error saving plan", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-plans"] });
      toast({ title: isRTL ? "تم الحذف" : "Deleted", description: isRTL ? "تم حذف الباقة بنجاح" : "Plan deleted successfully" });
    },
  });

  const resetForm = () => {
    setFormData({ ...defaultForm });
    setEditingPlan(null);
  };

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name_ar: plan.name_ar, name_en: plan.name_en,
      description_ar: plan.description_ar || "", description_en: plan.description_en || "",
      price: plan.price, duration_months: plan.duration_months,
      max_invoices: plan.max_invoices?.toString() || "", max_entries: plan.max_entries?.toString() || "",
      max_users: plan.max_users?.toString() || "", max_branches: plan.max_branches?.toString() || "",
      max_sales_invoices: plan.max_sales_invoices?.toString() || "",
      max_purchase_invoices: plan.max_purchase_invoices?.toString() || "",
      max_journal_entries: plan.max_journal_entries?.toString() || "",
      features_ar: plan.features_ar || [], features_en: plan.features_en || [],
      not_included_ar: plan.not_included_ar || [], not_included_en: plan.not_included_en || [],
      allowed_modules: plan.allowed_modules || ALL_MODULES.map(m => m.key),
      is_active: plan.is_active, sort_order: plan.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const toggleModule = (key: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_modules: prev.allowed_modules.includes(key)
        ? prev.allowed_modules.filter(k => k !== key)
        : [...prev.allowed_modules, key],
    }));
  };

  const limitsConfig = [
    { key: "max_users" as const, ar: "المستخدمين", en: "Users", icon: Users },
    { key: "max_branches" as const, ar: "الفروع", en: "Branches", icon: Building2 },
    { key: "max_sales_invoices" as const, ar: "فواتير المبيعات/شهر", en: "Sales Invoices/mo", icon: FileBarChart },
    { key: "max_purchase_invoices" as const, ar: "فواتير المشتريات/شهر", en: "Purchase Invoices/mo", icon: FileBarChart },
    { key: "max_journal_entries" as const, ar: "القيود المحاسبية/شهر", en: "Journal Entries/mo", icon: BookOpen },
    { key: "max_invoices" as const, ar: "إجمالي الفواتير", en: "Total Invoices", icon: FileBarChart },
    { key: "max_entries" as const, ar: "إجمالي القيود", en: "Total Entries", icon: BookOpen },
  ];

  const activeModuleCount = formData.allowed_modules.length;
  const totalModuleCount = ALL_MODULES.length;

  return (
    <div className="space-y-6">
      <DataTable
        title={isRTL ? "إدارة الباقات" : "Plans Management"}
        icon={<CreditCard className="h-5 w-5" />}
        columns={[
          { key: "name", header: isRTL ? "الاسم" : "Name", render: (p: Plan) => (
            <div>
              <p className="font-medium">{isRTL ? p.name_ar : p.name_en}</p>
              <p className="text-sm text-muted-foreground">{isRTL ? p.name_en : p.name_ar}</p>
            </div>
          )},
          { key: "price", header: isRTL ? "السعر" : "Price", numeric: true, render: (p: Plan) => (
            <div>
              <span className="font-semibold">{p.price}</span>
              <span className="text-muted-foreground text-sm ms-1">SAR</span>
              <p className="text-xs text-muted-foreground">
                {p.duration_months} {isRTL ? "شهر" : (p.duration_months === 1 ? "month" : "months")}
              </p>
            </div>
          )},
          { key: "modules", header: isRTL ? "الوحدات" : "Modules", render: (p: Plan) => {
            const mods = p.allowed_modules || [];
            return (
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {mods.length}/{totalModuleCount}
                </Badge>
              </div>
            );
          }},
          { key: "limits", header: isRTL ? "الحدود" : "Limits", render: (p: Plan) => (
            <div className="text-xs space-y-0.5">
              <p><Users className="inline h-3 w-3 me-1 text-muted-foreground" />{isRTL ? "مستخدمين" : "Users"}: <span className="font-medium">{p.max_users || "∞"}</span></p>
              <p><Building2 className="inline h-3 w-3 me-1 text-muted-foreground" />{isRTL ? "فروع" : "Branches"}: <span className="font-medium">{p.max_branches || "∞"}</span></p>
              <p><FileBarChart className="inline h-3 w-3 me-1 text-muted-foreground" />{isRTL ? "فواتير/شهر" : "Invoices/mo"}: <span className="font-medium">{p.max_sales_invoices || "∞"}</span></p>
            </div>
          ), hideOnMobile: true },
          { key: "status", header: isRTL ? "الحالة" : "Status", render: (p: Plan) => (
            <StatusBadge config={{ label: p.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive"), variant: p.is_active ? "success" : "secondary" }} />
          )},
        ]}
        data={plans || []}
        isLoading={isLoading}
        rowKey={(p: Plan) => p.id}
        actions={[
          { label: isRTL ? "تعديل" : "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (p: Plan) => openEditDialog(p) },
          { label: isRTL ? "حذف" : "Delete", icon: <Trash2 className="h-4 w-4" />, onClick: (p: Plan) => deleteMutation.mutate(p.id), variant: "destructive" as const, separator: true },
        ]}
        searchPlaceholder={isRTL ? "بحث عن باقة..." : "Search plans..."}
        onSearch={(p: Plan, term: string) => p.name_ar.toLowerCase().includes(term) || p.name_en.toLowerCase().includes(term)}
        createButton={{ label: isRTL ? "إضافة باقة" : "Add Plan", onClick: () => { resetForm(); setIsDialogOpen(true); } }}
        emptyState={{ icon: <CreditCard className="h-10 w-10 text-muted-foreground/60" />, title: isRTL ? "لا توجد باقات" : "No plans yet", actionLabel: isRTL ? "إضافة باقة" : "Add Plan", onAction: () => { resetForm(); setIsDialogOpen(true); } }}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? (isRTL ? "تعديل الباقة" : "Edit Plan") : (isRTL ? "إضافة باقة جديدة" : "Add New Plan")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="w-full grid grid-cols-4 mb-4">
                <TabsTrigger value="basic" className="gap-1.5 text-xs sm:text-sm">
                  <FileText className="h-3.5 w-3.5 hidden sm:block" />
                  {isRTL ? "أساسي" : "Basic"}
                </TabsTrigger>
                <TabsTrigger value="limits" className="gap-1.5 text-xs sm:text-sm">
                  <Shield className="h-3.5 w-3.5 hidden sm:block" />
                  {isRTL ? "الحدود" : "Limits"}
                </TabsTrigger>
                <TabsTrigger value="modules" className="gap-1.5 text-xs sm:text-sm">
                  <Blocks className="h-3.5 w-3.5 hidden sm:block" />
                  {isRTL ? "الوحدات" : "Modules"}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ms-1">
                    {activeModuleCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="features" className="gap-1.5 text-xs sm:text-sm">
                  <BarChart3 className="h-3.5 w-3.5 hidden sm:block" />
                  {isRTL ? "المميزات" : "Features"}
                </TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? "الاسم بالعربية" : "Arabic Name"} *</Label>
                    <Input value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "الاسم بالإنجليزية" : "English Name"} *</Label>
                    <Input value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? "الوصف بالعربية" : "Arabic Description"}</Label>
                    <Textarea value={formData.description_ar} onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "الوصف بالإنجليزية" : "English Description"}</Label>
                    <Textarea value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} rows={3} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? "السعر (ريال)" : "Price (SAR)"} *</Label>
                    <Input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "المدة (أشهر)" : "Duration (months)"} *</Label>
                    <Input type="number" min="1" value={formData.duration_months} onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 1 })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "ترتيب العرض" : "Sort Order"}</Label>
                    <Input type="number" min="0" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label>{isRTL ? "الباقة نشطة" : "Plan is active"}</Label>
                </div>
              </TabsContent>

              {/* Limits Tab */}
              <TabsContent value="limits" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "اترك الحقل فارغاً للسماح بعدد غير محدود:" : "Leave empty for unlimited:"}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {limitsConfig.map((limit) => (
                    <div key={limit.key} className="space-y-2 rounded-lg border p-3 bg-card">
                      <Label className="flex items-center gap-2">
                        <limit.icon className="h-4 w-4 text-muted-foreground" />
                        {isRTL ? limit.ar : limit.en}
                      </Label>
                      <Input
                        type="number" min="0"
                        placeholder={isRTL ? "غير محدود" : "Unlimited"}
                        value={formData[limit.key]}
                        onChange={(e) => setFormData({ ...formData, [limit.key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Modules Tab */}
              <TabsContent value="modules" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {isRTL
                      ? `${activeModuleCount} من ${totalModuleCount} وحدة مفعّلة`
                      : `${activeModuleCount} of ${totalModuleCount} modules enabled`}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, allowed_modules: ALL_MODULES.map(m => m.key) }))}
                      disabled={activeModuleCount === totalModuleCount}
                      className="gap-1.5 text-xs"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isRTL ? "تحديد الكل" : "Select All"}
                    </Button>
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, allowed_modules: [] }))}
                      disabled={activeModuleCount === 0}
                      className="gap-1.5 text-xs"
                    >
                      <X className="h-3.5 w-3.5" />
                      {isRTL ? "إلغاء الكل" : "Deselect All"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ALL_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    const isActive = formData.allowed_modules.includes(mod.key);
                    return (
                      <button
                        key={mod.key}
                        type="button"
                        onClick={() => toggleModule(mod.key)}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-all text-start ${
                          isActive
                            ? `${mod.bg} border-primary/30 ring-1 ring-primary/20`
                            : "bg-muted/30 border-border opacity-60 hover:opacity-80"
                        }`}
                      >
                        <div className={`rounded-md p-2 ${isActive ? mod.bg : "bg-muted"}`}>
                          <Icon className={`h-4 w-4 ${isActive ? mod.color : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isActive ? "" : "text-muted-foreground"}`}>
                            {isRTL ? mod.labelAr : mod.labelEn}
                          </p>
                        </div>
                        {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {editingPlan && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                    {isRTL
                      ? "⚡ عند الحفظ سيتم تحديث الوحدات المتاحة تلقائياً لجميع الشركات المشتركة بهذه الباقة"
                      : "⚡ On save, allowed modules will be automatically synced to all companies subscribed to this plan"}
                  </p>
                )}
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features" className="space-y-6">
                <FeaturesListEditor
                  label={isRTL ? "المميزات المتاحة (عربي)" : "Included Features (Arabic)"}
                  items={formData.features_ar}
                  onChange={(items) => setFormData({ ...formData, features_ar: items })}
                  placeholder={isRTL ? "أضف ميزة..." : "Add feature..."}
                  variant="included"
                />
                <FeaturesListEditor
                  label={isRTL ? "المميزات المتاحة (إنجليزي)" : "Included Features (English)"}
                  items={formData.features_en}
                  onChange={(items) => setFormData({ ...formData, features_en: items })}
                  placeholder={isRTL ? "أضف ميزة..." : "Add feature..."}
                  variant="included"
                />
                <FeaturesListEditor
                  label={isRTL ? "غير متاح (عربي)" : "Not Included (Arabic)"}
                  items={formData.not_included_ar}
                  onChange={(items) => setFormData({ ...formData, not_included_ar: items })}
                  placeholder={isRTL ? "أضف عنصراً..." : "Add item..."}
                  variant="excluded"
                />
                <FeaturesListEditor
                  label={isRTL ? "غير متاح (إنجليزي)" : "Not Included (English)"}
                  items={formData.not_included_en}
                  onChange={(items) => setFormData({ ...formData, not_included_en: items })}
                  placeholder={isRTL ? "أضف عنصراً..." : "Add item..."}
                  variant="excluded"
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {isRTL ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function FeaturesListEditor({ label, items, onChange, placeholder, variant }: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  variant: "included" | "excluded";
}) {
  const [inputValue, setInputValue] = useState("");

  const addItem = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setInputValue("");
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="font-medium">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={addItem} disabled={!inputValue.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {items.map((item, idx) => (
            <Badge
              key={idx}
              variant={variant === "included" ? "default" : "secondary"}
              className="gap-1 pe-1"
            >
              {item}
              <button type="button" onClick={() => removeItem(idx)} className="ms-1 rounded-full p-0.5 hover:bg-background/20">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default OwnerPlans;
