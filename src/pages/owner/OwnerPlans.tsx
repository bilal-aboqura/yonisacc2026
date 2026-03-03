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
import { Pencil, Trash2, Loader2, CreditCard, Plus, X, Package, Shield, BarChart3, FileText } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";

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
  module_sales: boolean;
  module_purchases: boolean;
  module_reports: boolean;
  module_inventory: boolean;
  module_hr: boolean;
  module_auto_parts: boolean;
  features_ar: string[] | null;
  features_en: string[] | null;
  not_included_ar: string[] | null;
  not_included_en: string[] | null;
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
  module_sales: boolean;
  module_purchases: boolean;
  module_reports: boolean;
  module_inventory: boolean;
  module_hr: boolean;
  module_auto_parts: boolean;
  features_ar: string[];
  features_en: string[];
  not_included_ar: string[];
  not_included_en: string[];
  is_active: boolean;
  sort_order: number;
}

const defaultForm: FormData = {
  name_ar: "", name_en: "", description_ar: "", description_en: "",
  price: 0, duration_months: 1,
  max_invoices: "", max_entries: "", max_users: "", max_branches: "",
  max_sales_invoices: "", max_purchase_invoices: "", max_journal_entries: "",
  module_sales: true, module_purchases: true, module_reports: true,
  module_inventory: true, module_hr: false, module_auto_parts: false,
  features_ar: [], features_en: [], not_included_ar: [], not_included_en: [],
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

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const planData = {
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
        module_sales: data.module_sales, module_purchases: data.module_purchases,
        module_reports: data.module_reports, module_inventory: data.module_inventory,
        module_hr: data.module_hr, module_auto_parts: data.module_auto_parts,
        features_ar: data.features_ar.length ? data.features_ar : [],
        features_en: data.features_en.length ? data.features_en : [],
        not_included_ar: data.not_included_ar.length ? data.not_included_ar : [],
        not_included_en: data.not_included_en.length ? data.not_included_en : [],
        is_active: data.is_active, sort_order: data.sort_order,
      };
      if (editingPlan) {
        const { error } = await supabase.from("subscription_plans").update(planData).eq("id", editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subscription_plans").insert([planData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-plans"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: isRTL ? "تم الحفظ" : "Saved", description: isRTL ? "تم حفظ الباقة بنجاح" : "Plan saved successfully" });
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
      module_sales: plan.module_sales, module_purchases: plan.module_purchases,
      module_reports: plan.module_reports, module_inventory: plan.module_inventory,
      module_hr: plan.module_hr, module_auto_parts: plan.module_auto_parts,
      features_ar: plan.features_ar || [], features_en: plan.features_en || [],
      not_included_ar: plan.not_included_ar || [], not_included_en: plan.not_included_en || [],
      is_active: plan.is_active, sort_order: plan.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const activeModulesCount = (p: Plan) => {
    return [p.module_sales, p.module_purchases, p.module_reports, p.module_inventory, p.module_hr, p.module_auto_parts].filter(Boolean).length;
  };

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
          { key: "modules", header: isRTL ? "الوحدات" : "Modules", render: (p: Plan) => (
            <Badge variant="secondary" className="font-mono">{activeModulesCount(p)}/6</Badge>
          ), hideOnMobile: true },
          { key: "limits", header: isRTL ? "الحدود" : "Limits", render: (p: Plan) => (
            <div className="text-xs space-y-0.5">
              <p>{isRTL ? "مستخدمين" : "Users"}: <span className="font-medium">{p.max_users || "∞"}</span></p>
              <p>{isRTL ? "فروع" : "Branches"}: <span className="font-medium">{p.max_branches || "∞"}</span></p>
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
                <TabsTrigger value="modules" className="gap-1.5 text-xs sm:text-sm">
                  <Package className="h-3.5 w-3.5 hidden sm:block" />
                  {isRTL ? "الوحدات" : "Modules"}
                </TabsTrigger>
                <TabsTrigger value="limits" className="gap-1.5 text-xs sm:text-sm">
                  <Shield className="h-3.5 w-3.5 hidden sm:block" />
                  {isRTL ? "الحدود" : "Limits"}
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

              {/* Modules Tab */}
              <TabsContent value="modules" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "اختر الوحدات المتاحة في هذه الباقة:" : "Select which modules are available in this plan:"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "module_sales" as const, ar: "المبيعات", en: "Sales" },
                    { key: "module_purchases" as const, ar: "المشتريات", en: "Purchases" },
                    { key: "module_reports" as const, ar: "التقارير", en: "Reports" },
                    { key: "module_inventory" as const, ar: "المخزون", en: "Inventory" },
                    { key: "module_hr" as const, ar: "الموارد البشرية", en: "HR" },
                    { key: "module_auto_parts" as const, ar: "قطع الغيار", en: "Auto Parts" },
                  ].map((mod) => (
                    <div key={mod.key} className="flex items-center justify-between rounded-lg border p-3 bg-card">
                      <Label className="font-medium">{isRTL ? mod.ar : mod.en}</Label>
                      <Switch
                        checked={formData[mod.key]}
                        onCheckedChange={(checked) => setFormData({ ...formData, [mod.key]: checked })}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Limits Tab */}
              <TabsContent value="limits" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "اترك الحقل فارغاً للسماح بعدد غير محدود:" : "Leave empty for unlimited:"}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "max_users" as const, ar: "الحد الأقصى للمستخدمين", en: "Max Users" },
                    { key: "max_branches" as const, ar: "الحد الأقصى للفروع", en: "Max Branches" },
                    { key: "max_invoices" as const, ar: "إجمالي الفواتير", en: "Total Invoices" },
                    { key: "max_entries" as const, ar: "إجمالي القيود", en: "Total Entries" },
                    { key: "max_sales_invoices" as const, ar: "فواتير المبيعات/شهر", en: "Sales Invoices/mo" },
                    { key: "max_purchase_invoices" as const, ar: "فواتير المشتريات/شهر", en: "Purchase Invoices/mo" },
                    { key: "max_journal_entries" as const, ar: "القيود المحاسبية/شهر", en: "Journal Entries/mo" },
                  ].map((limit) => (
                    <div key={limit.key} className="space-y-2">
                      <Label>{isRTL ? limit.ar : limit.en}</Label>
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

// Sub-component for managing feature lists
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
