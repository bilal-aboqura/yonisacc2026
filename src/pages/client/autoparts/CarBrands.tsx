import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Car, Edit, Loader2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

interface CarBrand {
  id: string;
  company_id: string;
  name: string;
  name_en: string | null;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const CarBrands = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<CarBrand | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");

  const { data: brands, isLoading } = useQuery({
    queryKey: ["car-brands", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("car_brands" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as CarBrand[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !name.trim()) throw new Error("Missing data");
      if (editingBrand) {
        const { error } = await supabase
          .from("car_brands" as any)
          .update({ name: name.trim(), name_en: nameEn.trim() || null } as any)
          .eq("id", editingBrand.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("car_brands" as any)
          .insert({ company_id: companyId, name: name.trim(), name_en: nameEn.trim() || null } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["car-brands"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: isRTL ? "تم الحفظ" : "Saved", description: isRTL ? "تم حفظ الماركة بنجاح" : "Brand saved successfully" });
    },
    onError: () => {
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "حدث خطأ في الحفظ" : "Error saving brand", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("car_brands" as any).update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["car-brands"] }); },
  });

  const resetForm = () => { setName(""); setNameEn(""); setEditingBrand(null); };

  const openEdit = (brand: CarBrand) => {
    setEditingBrand(brand);
    setName(brand.name);
    setNameEn(brand.name_en || "");
    setDialogOpen(true);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <DataTable
        title={isRTL ? "ماركات السيارات" : "Car Brands"}
        icon={<Car className="h-5 w-5" />}
        columns={[
          { key: "name", header: isRTL ? "الماركة" : "Brand", render: (b: CarBrand) => <span className="font-medium">{b.name}</span> },
          { key: "name_en", header: isRTL ? "الاسم الإنجليزي" : "English Name", render: (b: CarBrand) => b.name_en || "-" },
          { key: "status", header: isRTL ? "الحالة" : "Status", render: (b: CarBrand) => (
            <Switch checked={b.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: b.id, is_active: checked })} />
          )},
        ]}
        data={brands || []}
        isLoading={isLoading}
        rowKey={(b: CarBrand) => b.id}
        actions={[
          { label: isRTL ? "تعديل" : "Edit", icon: <Edit className="h-4 w-4" />, onClick: (b: CarBrand) => openEdit(b) },
        ]}
        searchPlaceholder={isRTL ? "بحث عن ماركة..." : "Search brands..."}
        onSearch={(b: CarBrand, term: string) => b.name.includes(term) || (b.name_en || "").toLowerCase().includes(term)}
        createButton={{ label: isRTL ? "ماركة جديدة" : "New Brand", onClick: openNew }}
        emptyState={{ icon: <Car className="h-10 w-10 text-muted-foreground/60" />, title: isRTL ? "لا توجد ماركات" : "No brands yet", actionLabel: isRTL ? "إضافة ماركة" : "Add Brand", onAction: openNew }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? (isRTL ? "تعديل الماركة" : "Edit Brand") : (isRTL ? "ماركة جديدة" : "New Brand")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الماركة (عربي) *" : "Brand Name (Arabic) *"}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isRTL ? "مثال: تويوتا" : "e.g. Toyota"} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الماركة (إنجليزي)" : "Brand Name (English)"}</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Toyota" dir="ltr" />
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !name.trim()} className="w-full">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarBrands;