import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import type { DataTableColumn, DataTableAction } from "@/components/ui/data-table";
import { Plus, Pencil, Trash2, Building2, Loader2, MapPin, Phone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface BranchForm {
  name: string;
  name_en: string;
  phone: string;
  address: string;
  is_main: boolean;
  is_active: boolean;
}

const emptyForm: BranchForm = {
  name: "",
  name_en: "",
  phone: "",
  address: "",
  is_main: false,
  is_active: false,
};

const BranchManagement = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);

  // Fetch company
  const { data: company } = useQuery({
    queryKey: ["branch-mgmt-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch branches
  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await supabase
        .from("branches")
        .select("*")
        .eq("company_id", company.id)
        .order("is_main", { ascending: false })
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!company?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("No company");
      if (!form.name.trim()) throw new Error(isRTL ? "اسم الفرع مطلوب" : "Branch name is required");

      // If trying to activate, check if branch has account settings linked
      if (form.is_active && editingId) {
        const { data: settings } = await supabase
          .from("branch_account_settings")
          .select("module_type")
          .eq("branch_id", editingId)
          .eq("company_id", company.id);
        
        const modules = new Set((settings || []).map((s: any) => s.module_type));
        if (!modules.has("sales") || !modules.has("purchases")) {
          throw new Error(isRTL ? "الفرع غير جاهز: الرجاء ربط الحسابات أولاً من إعدادات حسابات الفروع" : "Branch not ready: Please link accounts first in Branch Account Settings");
        }
      }

      // If setting as main, unset other main branches
      if (form.is_main) {
        await supabase
          .from("branches")
          .update({ is_main: false })
          .eq("company_id", company.id);
      }

      if (editingId) {
        const { error } = await supabase
          .from("branches")
          .update({
            name: form.name,
            name_en: form.name_en || null,
            phone: form.phone || null,
            address: form.address || null,
            is_main: form.is_main,
            is_active: form.is_active,
          })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        // New branches are always inactive
        const { error } = await supabase
          .from("branches")
          .insert({
            company_id: company.id,
            name: form.name,
            name_en: form.name_en || null,
            phone: form.phone || null,
            address: form.address || null,
            is_main: form.is_main,
            is_active: false,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success(isRTL ? (editingId ? "تم تحديث الفرع" : "تم إضافة الفرع") : (editingId ? "Branch updated" : "Branch added"));
      closeDialog();
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل في الحفظ" : "Failed to save"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success(isRTL ? "تم حذف الفرع" : "Branch deleted");
    },
    onError: () => {
      toast.error(isRTL ? "فشل في حذف الفرع" : "Failed to delete branch");
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (branch: any) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name || "",
      name_en: branch.name_en || "",
      phone: branch.phone || "",
      address: branch.address || "",
      is_main: branch.is_main || false,
      is_active: branch.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <DataTable<any>
        title={isRTL ? "إدارة الفروع" : "Branch Management"}
        icon={<Building2 className="h-5 w-5 text-primary" />}
        columns={[
          {
            key: "name",
            header: isRTL ? "اسم الفرع" : "Branch Name",
            render: (row) => (
              <div className="flex items-center gap-2 font-semibold">
                {row.name}
                {row.is_main && (
                  <Badge variant="secondary" className="text-xs">
                    {isRTL ? "رئيسي" : "Main"}
                  </Badge>
                )}
              </div>
            ),
          },
          {
            key: "name_en",
            header: isRTL ? "الاسم بالإنجليزية" : "Name (EN)",
            render: (row) => <span className="text-muted-foreground">{row.name_en || "—"}</span>,
          },
          {
            key: "phone",
            header: isRTL ? "الهاتف" : "Phone",
            render: (row) => <span className="text-muted-foreground dir-ltr inline-block">{row.phone || "—"}</span>,
          },
          {
            key: "address",
            header: isRTL ? "العنوان" : "Address",
            render: (row) => (
              <span className="text-muted-foreground max-w-[200px] truncate block">{row.address || "—"}</span>
            ),
          },
          {
            key: "is_active",
            header: isRTL ? "الحالة" : "Status",
            render: (row) => (
              <StatusBadge
                config={{
                  label: row.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive"),
                  variant: row.is_active ? "success" : "secondary",
                }}
              />
            ),
          },
          {
            key: "actions",
            header: isRTL ? "الإجراءات" : "Actions",
            align: "center",
            width: 100,
            render: (row) => (
              <div className="flex items-center justify-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {!row.is_main && (
                  <AlertDialog>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>{isRTL ? "حذف" : "Delete"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{isRTL ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {isRTL
                            ? `هل أنت متأكد من حذف الفرع "${row.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                            : `Are you sure you want to delete "${row.name}"? This action cannot be undone.`}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate(row.id)}
                        >
                          {isRTL ? "حذف" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ),
          },
        ]}
        data={branches || []}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        createButton={{
          label: isRTL ? "إضافة فرع" : "Add Branch",
          onClick: openCreate,
        }}
        onSearch={(row, term) =>
          (row.name || "").toLowerCase().includes(term) ||
          (row.name_en || "").toLowerCase().includes(term) ||
          (row.phone || "").toLowerCase().includes(term) ||
          (row.address || "").toLowerCase().includes(term)
        }
        searchPlaceholder={isRTL ? "بحث في الفروع..." : "Search branches..."}
        emptyState={{
          icon: <Building2 className="h-10 w-10 text-muted-foreground/60" />,
          title: isRTL ? "لا توجد فروع بعد" : "No branches yet",
          description: isRTL ? "ابدأ بإضافة أول فرع لشركتك" : "Start by adding your first branch",
          actionLabel: isRTL ? "إضافة فرع" : "Add Branch",
          onAction: openCreate,
        }}
        pageSizes={[10, 25, 50]}
      />
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? (isRTL ? "تعديل الفرع" : "Edit Branch")
                : (isRTL ? "إضافة فرع جديد" : "Add New Branch")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الفرع (عربي) *" : "Branch Name (Arabic) *"}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={isRTL ? "مثال: الفرع الرئيسي" : "e.g. Main Branch"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الفرع (إنجليزي)" : "Branch Name (English)"}</Label>
              <Input
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                placeholder="e.g. Main Branch"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {isRTL ? "رقم الهاتف" : "Phone"}
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+966"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {isRTL ? "العنوان" : "Address"}
              </Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={isRTL ? "عنوان الفرع" : "Branch address"}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{isRTL ? "فرع رئيسي" : "Main Branch"}</Label>
              <Switch checked={form.is_main} onCheckedChange={(v) => setForm({ ...form, is_main: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>{isRTL ? "نشط" : "Active"}</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {editingId ? (isRTL ? "تحديث" : "Update") : (isRTL ? "إضافة" : "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchManagement;
