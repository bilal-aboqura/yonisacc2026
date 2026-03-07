import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useRBAC } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FolderTree, ChevronRight, ChevronDown, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import ImageUpload from "@/components/client/ImageUpload";

interface CategoryForm {
  name: string;
  name_en: string;
  parent_id: string | null;
  is_active: boolean;
  image_url: string;
}

const emptyForm: CategoryForm = {
  name: "",
  name_en: "",
  parent_id: null,
  is_active: true,
  image_url: "",
};

const CategoriesManagement = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { can } = useRBAC();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["product_categories", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("company_id", companyId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: CategoryForm) => {
      const payload: any = {
        company_id: companyId,
        name: formData.name,
        name_en: formData.name_en || null,
        parent_id: formData.parent_id || null,
        is_active: formData.is_active,
        image_url: formData.image_url || null,
      };
      if (editingId) {
        const { error } = await supabase.from("product_categories").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
      toast.success(isRTL ? "تم الحفظ بنجاح" : "Saved successfully");
      closeDialog();
    },
    onError: () => {
      toast.error(isRTL ? "حدث خطأ أثناء الحفظ" : "Error saving");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
      toast.success(isRTL ? "تم الحذف بنجاح" : "Deleted successfully");
      setDeleteId(null);
    },
    onError: () => {
      toast.error(isRTL ? "لا يمكن حذف تصنيف يحتوي على تصنيفات فرعية أو منتجات" : "Cannot delete category with subcategories or products");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("product_categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
    },
  });

  const openCreate = (parentId?: string) => {
    setEditingId(null);
    setForm({ ...emptyForm, parent_id: parentId || null });
    setDialogOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      name_en: cat.name_en || "",
      parent_id: cat.parent_id || null,
      is_active: cat.is_active ?? true,
      image_url: cat.image_url || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error(isRTL ? "اسم التصنيف مطلوب" : "Category name is required");
      return;
    }
    saveMutation.mutate(form);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build tree
  const rootCategories = categories.filter((c: any) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c: any) => c.parent_id === parentId);

  const canManage = can("MANAGE_CATEGORIES");

  const renderCategory = (cat: any, depth: number = 0) => {
    const children = getChildren(cat.id);
    const hasChildren = children.length > 0;
    const expanded = expandedIds.has(cat.id);

    return (
      <div key={cat.id}>
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/50 transition-colors",
            isRTL && "flex-row-reverse"
          )}
          style={{ [isRTL ? "paddingRight" : "paddingLeft"]: `${depth * 28 + 16}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(cat.id)} className="p-0.5">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5" />
          )}

          {cat.image_url ? (
            <img src={cat.image_url} alt="" className="h-8 w-8 rounded object-cover" />
          ) : (
            <FolderTree className="h-5 w-5 text-muted-foreground" />
          )}

          <span className="flex-1 font-medium">{isRTL ? cat.name : cat.name_en || cat.name}</span>

          <Badge variant={cat.is_active ? "default" : "secondary"}>
            {cat.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}
          </Badge>

          {canManage && (
            <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCreate(cat.id)} title={isRTL ? "إضافة تصنيف فرعي" : "Add subcategory"}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(cat.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Switch
                checked={cat.is_active}
                onCheckedChange={(v) => toggleActive.mutate({ id: cat.id, is_active: v })}
                className="ms-2"
              />
            </div>
          )}
        </div>
        {expanded && children.map((child: any) => renderCategory(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className={cn("flex items-center justify-between flex-wrap gap-4", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <FolderTree className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{isRTL ? "إدارة التصنيفات" : "Categories Management"}</h1>
        </div>
        {canManage && (
          <Button onClick={() => openCreate()} className={cn("gap-2", isRTL && "flex-row-reverse")}>
            <Plus className="h-4 w-4" />
            {isRTL ? "إضافة تصنيف" : "Add Category"}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {isRTL ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : rootCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isRTL ? "لا توجد تصنيفات بعد" : "No categories yet"}
            </div>
          ) : (
            rootCategories.map((cat: any) => renderCategory(cat))
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {editingId ? (isRTL ? "تعديل تصنيف" : "Edit Category") : (isRTL ? "إضافة تصنيف" : "Add Category")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{isRTL ? "الاسم بالعربي" : "Arabic Name"} *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{isRTL ? "الاسم بالإنجليزي" : "English Name"}</Label>
              <Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
            </div>
            <div>
              <Label>{isRTL ? "التصنيف الأب" : "Parent Category"}</Label>
              <Select value={form.parent_id || "none"} onValueChange={v => setForm({ ...form, parent_id: v === "none" ? null : v })}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? "بدون (تصنيف رئيسي)" : "None (root category)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isRTL ? "بدون (تصنيف رئيسي)" : "None (root)"}</SelectItem>
                  {categories.filter((c: any) => c.id !== editingId).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{isRTL ? c.name : c.name_en || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isRTL ? "صورة التصنيف" : "Category Image"}</Label>
              <div className="mt-2">
                <ImageUpload
                  value={form.image_url || null}
                  onChange={(url) => setForm({ ...form, image_url: url || "" })}
                  folder="categories"
                  size="md"
                />
              </div>
            </div>
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>{isRTL ? "نشط" : "Active"}</Label>
            </div>
          </div>
          <DialogFooter className={cn(isRTL && "flex-row-reverse")}>
            <Button variant="outline" onClick={closeDialog}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تأكيد الحذف" : "Confirm Delete"}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {isRTL ? "هل أنت متأكد من حذف هذا التصنيف؟" : "Are you sure you want to delete this category?"}
          </p>
          <DialogFooter className={cn(isRTL && "flex-row-reverse")}>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {isRTL ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesManagement;
