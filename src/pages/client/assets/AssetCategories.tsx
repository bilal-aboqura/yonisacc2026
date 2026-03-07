import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";

const METHODS = [
  { value: "straight_line", ar: "القسط الثابت", en: "Straight Line" },
  { value: "declining_balance", ar: "القسط المتناقص", en: "Declining Balance" },
  { value: "units_of_production", ar: "وحدات الإنتاج", en: "Units of Production" },
];

const AssetCategories = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", name_en: "", depreciation_method: "straight_line", default_useful_life_months: "60", default_salvage_percentage: "0" });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["asset-categories", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("asset_categories").select("*").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        company_id: companyId,
        name: form.name,
        name_en: form.name_en || null,
        depreciation_method: form.depreciation_method,
        default_useful_life_months: parseInt(form.default_useful_life_months) || 60,
        default_salvage_percentage: parseFloat(form.default_salvage_percentage) || 0,
      };
      if (editId) {
        const { error } = await (supabase as any).from("asset_categories").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("asset_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
      toast({ title: isRTL ? "تم الحفظ" : "Saved" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: isRTL ? "خطأ" : "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("asset_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
      toast({ title: isRTL ? "تم الحذف" : "Deleted" });
    },
  });

  const resetForm = () => {
    setForm({ name: "", name_en: "", depreciation_method: "straight_line", default_useful_life_months: "60", default_salvage_percentage: "0" });
    setEditId(null);
    setDialogOpen(false);
  };

  const openEdit = (cat: any) => {
    setForm({
      name: cat.name,
      name_en: cat.name_en || "",
      depreciation_method: cat.depreciation_method,
      default_useful_life_months: String(cat.default_useful_life_months || 60),
      default_salvage_percentage: String(cat.default_salvage_percentage || 0),
    });
    setEditId(cat.id);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{isRTL ? "تصنيفات الأصول" : "Asset Categories"}</CardTitle>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            {isRTL ? "إضافة تصنيف" : "Add Category"}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                <TableHead>{isRTL ? "طريقة الإهلاك" : "Depreciation Method"}</TableHead>
                <TableHead>{isRTL ? "العمر الافتراضي" : "Default Life"}</TableHead>
                <TableHead>{isRTL ? "نسبة الخردة" : "Salvage %"}</TableHead>
                <TableHead>{isRTL ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
              ) : (!categories || categories.length === 0) ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد تصنيفات" : "No categories"}</TableCell></TableRow>
              ) : (
                categories.map((cat: any) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{isRTL ? cat.name : (cat.name_en || cat.name)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {METHODS.find(m => m.value === cat.depreciation_method)?.[isRTL ? "ar" : "en"] || cat.depreciation_method}
                      </Badge>
                    </TableCell>
                    <TableCell>{cat.default_useful_life_months} {isRTL ? "شهر" : "months"}</TableCell>
                    <TableCell>{cat.default_salvage_percentage}%</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(cat.id)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? (isRTL ? "تعديل تصنيف" : "Edit Category") : (isRTL ? "إضافة تصنيف" : "Add Category")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
              <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "طريقة الإهلاك" : "Depreciation Method"}</Label>
              <Select value={form.depreciation_method} onValueChange={v => setForm(f => ({ ...f, depreciation_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => <SelectItem key={m.value} value={m.value}>{isRTL ? m.ar : m.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "العمر الافتراضي (أشهر)" : "Useful Life (months)"}</Label>
                <Input type="number" value={form.default_useful_life_months} onChange={e => setForm(f => ({ ...f, default_useful_life_months: e.target.value }))} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "نسبة الخردة %" : "Salvage %"}</Label>
                <Input type="number" value={form.default_salvage_percentage} onChange={e => setForm(f => ({ ...f, default_salvage_percentage: e.target.value }))} dir="ltr" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{isRTL ? "إلغاء" : "Cancel"}</Button></DialogClose>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetCategories;
