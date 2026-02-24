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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2, CreditCard } from "lucide-react";
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
  is_active: boolean;
  sort_order: number | null;
}

const OwnerPlans = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name_ar: "", name_en: "", description_ar: "", description_en: "",
    price: 0, duration_months: 1, max_invoices: "", max_entries: "",
    max_users: "", max_branches: "", is_active: true, sort_order: 0,
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["owner-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_plans").select("*").order("sort_order");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const planData = {
        name_ar: data.name_ar, name_en: data.name_en,
        description_ar: data.description_ar || null, description_en: data.description_en || null,
        price: data.price, duration_months: data.duration_months,
        max_invoices: data.max_invoices ? parseInt(data.max_invoices) : null,
        max_entries: data.max_entries ? parseInt(data.max_entries) : null,
        max_users: data.max_users ? parseInt(data.max_users) : null,
        max_branches: data.max_branches ? parseInt(data.max_branches) : null,
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
    setFormData({ name_ar: "", name_en: "", description_ar: "", description_en: "", price: 0, duration_months: 1, max_invoices: "", max_entries: "", max_users: "", max_branches: "", is_active: true, sort_order: 0 });
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
      is_active: plan.is_active, sort_order: plan.sort_order || 0,
    });
    setIsDialogOpen(true);
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
          { key: "price", header: isRTL ? "السعر" : "Price", numeric: true, render: (p: Plan) => <><span className="font-semibold">{p.price}</span> <span className="text-muted-foreground text-sm">SAR</span></> },
          { key: "max_invoices", header: isRTL ? "الفواتير" : "Invoices", render: (p: Plan) => p.max_invoices || "∞", hideOnMobile: true },
          { key: "max_entries", header: isRTL ? "القيود" : "Entries", render: (p: Plan) => p.max_entries || "∞", hideOnMobile: true },
          { key: "max_users", header: isRTL ? "المستخدمين" : "Users", render: (p: Plan) => p.max_users || "∞", hideOnMobile: true },
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? (isRTL ? "تعديل الباقة" : "Edit Plan") : (isRTL ? "إضافة باقة جديدة" : "Add New Plan")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم بالعربية" : "Arabic Name"}</Label>
                <Input value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم بالإنجليزية" : "English Name"}</Label>
                <Input value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الوصف بالعربية" : "Arabic Description"}</Label>
                <Textarea value={formData.description_ar} onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الوصف بالإنجليزية" : "English Description"}</Label>
                <Textarea value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "السعر (ريال)" : "Price (SAR)"}</Label>
                <Input type="number" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "المدة (أشهر)" : "Duration (months)"}</Label>
                <Input type="number" min="1" value={formData.duration_months} onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 1 })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الحد الأقصى للفواتير" : "Max Invoices"}</Label>
                <Input type="number" min="0" placeholder={isRTL ? "غير محدود" : "Unlimited"} value={formData.max_invoices} onChange={(e) => setFormData({ ...formData, max_invoices: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الحد الأقصى للقيود" : "Max Entries"}</Label>
                <Input type="number" min="0" placeholder={isRTL ? "غير محدود" : "Unlimited"} value={formData.max_entries} onChange={(e) => setFormData({ ...formData, max_entries: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الحد الأقصى للمستخدمين" : "Max Users"}</Label>
                <Input type="number" min="0" placeholder={isRTL ? "غير محدود" : "Unlimited"} value={formData.max_users} onChange={(e) => setFormData({ ...formData, max_users: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الحد الأقصى للفروع" : "Max Branches"}</Label>
                <Input type="number" min="0" placeholder={isRTL ? "غير محدود" : "Unlimited"} value={formData.max_branches} onChange={(e) => setFormData({ ...formData, max_branches: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
              <Label>{isRTL ? "الباقة نشطة" : "Plan is active"}</Label>
            </div>
            <DialogFooter>
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

export default OwnerPlans;