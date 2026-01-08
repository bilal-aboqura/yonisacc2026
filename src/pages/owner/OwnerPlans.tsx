import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    description_ar: "",
    description_en: "",
    price: 0,
    duration_months: 1,
    max_invoices: "",
    max_entries: "",
    max_users: "",
    max_branches: "",
    is_active: true,
    sort_order: 0,
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["owner-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const planData = {
        name_ar: data.name_ar,
        name_en: data.name_en,
        description_ar: data.description_ar || null,
        description_en: data.description_en || null,
        price: data.price,
        duration_months: data.duration_months,
        max_invoices: data.max_invoices ? parseInt(data.max_invoices) : null,
        max_entries: data.max_entries ? parseInt(data.max_entries) : null,
        max_users: data.max_users ? parseInt(data.max_users) : null,
        max_branches: data.max_branches ? parseInt(data.max_branches) : null,
        is_active: data.is_active,
        sort_order: data.sort_order,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from("subscription_plans")
          .update(planData)
          .eq("id", editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscription_plans")
          .insert([planData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-plans"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم حفظ الباقة بنجاح" : "Plan saved successfully",
      });
    },
    onError: () => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ أثناء الحفظ" : "Error saving plan",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-plans"] });
      toast({
        title: isRTL ? "تم الحذف" : "Deleted",
        description: isRTL ? "تم حذف الباقة بنجاح" : "Plan deleted successfully",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name_ar: "",
      name_en: "",
      description_ar: "",
      description_en: "",
      price: 0,
      duration_months: 1,
      max_invoices: "",
      max_entries: "",
      max_users: "",
      max_branches: "",
      is_active: true,
      sort_order: 0,
    });
    setEditingPlan(null);
  };

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name_ar: plan.name_ar,
      name_en: plan.name_en,
      description_ar: plan.description_ar || "",
      description_en: plan.description_en || "",
      price: plan.price,
      duration_months: plan.duration_months,
      max_invoices: plan.max_invoices?.toString() || "",
      max_entries: plan.max_entries?.toString() || "",
      max_users: plan.max_users?.toString() || "",
      max_branches: plan.max_branches?.toString() || "",
      is_active: plan.is_active,
      sort_order: plan.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const filteredPlans = plans?.filter(
    (plan) =>
      plan.name_ar.toLowerCase().includes(search.toLowerCase()) ||
      plan.name_en.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {isRTL ? "إدارة الباقات" : "Plans Management"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إنشاء وتعديل باقات الاشتراك" : "Create and manage subscription plans"}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
          className="gradient-primary text-white"
        >
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إضافة باقة" : "Add Plan"}
        </Button>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث عن باقة..." : "Search plans..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Plans Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                <TableHead>{isRTL ? "السعر" : "Price"}</TableHead>
                <TableHead>{isRTL ? "الفواتير" : "Invoices"}</TableHead>
                <TableHead>{isRTL ? "القيود" : "Entries"}</TableHead>
                <TableHead>{isRTL ? "المستخدمين" : "Users"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isRTL ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : filteredPlans?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isRTL ? "لا توجد باقات" : "No plans found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans?.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{isRTL ? plan.name_ar : plan.name_en}</p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? plan.name_en : plan.name_ar}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm"> SAR</span>
                    </TableCell>
                    <TableCell>
                      {plan.max_invoices || (isRTL ? "∞" : "∞")}
                    </TableCell>
                    <TableCell>
                      {plan.max_entries || (isRTL ? "∞" : "∞")}
                    </TableCell>
                    <TableCell>
                      {plan.max_users || (isRTL ? "∞" : "∞")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? "default" : "secondary"}>
                        {plan.is_active
                          ? isRTL ? "نشط" : "Active"
                          : isRTL ? "معطل" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(plan)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan
                ? isRTL ? "تعديل الباقة" : "Edit Plan"
                : isRTL ? "إضافة باقة جديدة" : "Add New Plan"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(formData);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم بالعربية" : "Arabic Name"}</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم بالإنجليزية" : "English Name"}</Label>
                <Input
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الوصف بالعربية" : "Arabic Description"}</Label>
                <Textarea
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الوصف بالإنجليزية" : "English Description"}</Label>
                <Textarea
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "السعر (ريال)" : "Price (SAR)"}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "المدة (أشهر)" : "Duration (months)"}</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الحد الأقصى للفواتير" : "Max Invoices"}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder={isRTL ? "اتركه فارغاً لغير محدود" : "Leave empty for unlimited"}
                  value={formData.max_invoices}
                  onChange={(e) => setFormData({ ...formData, max_invoices: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الحد الأقصى للقيود" : "Max Entries"}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder={isRTL ? "اتركه فارغاً لغير محدود" : "Leave empty for unlimited"}
                  value={formData.max_entries}
                  onChange={(e) => setFormData({ ...formData, max_entries: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الحد الأقصى للمستخدمين" : "Max Users"}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder={isRTL ? "اتركه فارغاً لغير محدود" : "Leave empty for unlimited"}
                  value={formData.max_users}
                  onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الحد الأقصى للفروع" : "Max Branches"}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder={isRTL ? "اتركه فارغاً لغير محدود" : "Leave empty for unlimited"}
                  value={formData.max_branches}
                  onChange={(e) => setFormData({ ...formData, max_branches: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>{isRTL ? "الباقة نشطة" : "Plan is active"}</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {isRTL ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="gradient-primary text-white">
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
