import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useRBAC } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitForm {
  name: string;
  name_en: string;
  symbol: string;
  allows_fractions: boolean;
  base_unit_id: string | null;
  conversion_rate: number;
}

const emptyForm: UnitForm = {
  name: "",
  name_en: "",
  symbol: "",
  allows_fractions: false,
  base_unit_id: null,
  conversion_rate: 1,
};

const UnitsManagement = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { can } = useRBAC();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UnitForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["units", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: UnitForm) => {
      const payload: any = {
        company_id: companyId,
        name: formData.name,
        name_en: formData.name_en || null,
        symbol: formData.symbol || null,
        allows_fractions: formData.allows_fractions,
        base_unit_id: formData.base_unit_id || null,
        conversion_rate: formData.conversion_rate || 1,
      };

      if (editingId) {
        const { error } = await supabase.from("units").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("units").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success(isRTL ? "تم الحفظ بنجاح" : "Saved successfully");
      closeDialog();
    },
    onError: () => {
      toast.error(isRTL ? "حدث خطأ أثناء الحفظ" : "Error saving");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success(isRTL ? "تم الحذف بنجاح" : "Deleted successfully");
      setDeleteId(null);
    },
    onError: () => {
      toast.error(isRTL ? "لا يمكن حذف وحدة مرتبطة بمنتجات" : "Cannot delete unit linked to products");
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (unit: any) => {
    setEditingId(unit.id);
    setForm({
      name: unit.name,
      name_en: unit.name_en || "",
      symbol: unit.symbol || "",
      allows_fractions: unit.allows_fractions || false,
      base_unit_id: unit.base_unit_id || null,
      conversion_rate: unit.conversion_rate || 1,
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
      toast.error(isRTL ? "اسم الوحدة مطلوب" : "Unit name is required");
      return;
    }
    saveMutation.mutate(form);
  };

  const getBaseUnitName = (id: string | null) => {
    if (!id) return "-";
    const u = units.find((u: any) => u.id === id);
    return u ? (isRTL ? u.name : u.name_en || u.name) : "-";
  };

  const canManage = can("MANAGE_UNITS");

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className={cn("flex items-center justify-between flex-wrap gap-4", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <Ruler className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{isRTL ? "إدارة الوحدات" : "Units Management"}</h1>
        </div>
        {canManage && (
          <Button onClick={openCreate} className={cn("gap-2", isRTL && "flex-row-reverse")}>
            <Plus className="h-4 w-4" />
            {isRTL ? "إضافة وحدة" : "Add Unit"}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                <TableHead>{isRTL ? "الاسم بالإنجليزية" : "English Name"}</TableHead>
                <TableHead>{isRTL ? "الاختصار" : "Symbol"}</TableHead>
                <TableHead>{isRTL ? "كسور" : "Fractions"}</TableHead>
                <TableHead>{isRTL ? "الوحدة الأساسية" : "Base Unit"}</TableHead>
                <TableHead>{isRTL ? "معدل التحويل" : "Conversion Rate"}</TableHead>
                {canManage && <TableHead>{isRTL ? "الإجراءات" : "Actions"}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isRTL ? "جاري التحميل..." : "Loading..."}
                  </TableCell>
                </TableRow>
              ) : units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isRTL ? "لا توجد وحدات بعد" : "No units yet"}
                  </TableCell>
                </TableRow>
              ) : (
                units.map((unit: any) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.name}</TableCell>
                    <TableCell>{unit.name_en || "-"}</TableCell>
                    <TableCell><Badge variant="secondary">{unit.symbol || "-"}</Badge></TableCell>
                    <TableCell>
                      {unit.allows_fractions ? (
                        <Badge variant="default">{isRTL ? "نعم" : "Yes"}</Badge>
                      ) : (
                        <Badge variant="outline">{isRTL ? "لا" : "No"}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{getBaseUnitName(unit.base_unit_id)}</TableCell>
                    <TableCell>{unit.conversion_rate || 1}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(unit)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(unit.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {editingId ? (isRTL ? "تعديل وحدة" : "Edit Unit") : (isRTL ? "إضافة وحدة" : "Add Unit")}
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
              <Label>{isRTL ? "الاختصار" : "Symbol"}</Label>
              <Input value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} placeholder={isRTL ? "مثل: كغ، م، قطعة" : "e.g. kg, m, pcs"} />
            </div>
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <Switch checked={form.allows_fractions} onCheckedChange={v => setForm({ ...form, allows_fractions: v })} />
              <Label>{isRTL ? "تقبل كسور" : "Allows Fractions"}</Label>
            </div>
            <div>
              <Label>{isRTL ? "الوحدة الأساسية" : "Base Unit"}</Label>
              <Select value={form.base_unit_id || "none"} onValueChange={v => setForm({ ...form, base_unit_id: v === "none" ? null : v })}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? "اختر وحدة أساسية" : "Select base unit"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isRTL ? "بدون" : "None"}</SelectItem>
                  {units.filter((u: any) => u.id !== editingId).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{isRTL ? u.name : u.name_en || u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.base_unit_id && (
              <div>
                <Label>{isRTL ? "معدل التحويل" : "Conversion Rate"}</Label>
                <Input type="number" min={0} step="0.001" value={form.conversion_rate} onChange={e => setForm({ ...form, conversion_rate: parseFloat(e.target.value) || 1 })} />
                <p className="text-xs text-muted-foreground mt-1">
                  {isRTL ? `1 ${form.name || "وحدة"} = ${form.conversion_rate} ${getBaseUnitName(form.base_unit_id)}` : `1 ${form.name_en || form.name || "unit"} = ${form.conversion_rate} ${getBaseUnitName(form.base_unit_id)}`}
                </p>
              </div>
            )}
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
            {isRTL ? "هل أنت متأكد من حذف هذه الوحدة؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure you want to delete this unit? This action cannot be undone."}
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

export default UnitsManagement;
