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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Car, Edit, Loader2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

interface CarBrand { id: string; name: string; name_en: string | null; }

interface CarModel {
  id: string;
  company_id: string;
  brand_id: string;
  name: string;
  name_en: string | null;
  year_from: number | null;
  year_to: number | null;
  is_active: boolean;
  car_brands?: CarBrand;
}

const CarModels = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<CarModel | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [brandId, setBrandId] = useState("");
  const [yearFrom, setYearFrom] = useState<number | "">("");
  const [yearTo, setYearTo] = useState<number | "">("");
  const [filterBrand, setFilterBrand] = useState("all");

  const { data: brands } = useQuery({
    queryKey: ["car-brands", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("car_brands" as any).select("*").eq("company_id", companyId).eq("is_active", true).order("name");
      if (error) throw error;
      return (data || []) as unknown as CarBrand[];
    },
    enabled: !!companyId,
  });

  const { data: models, isLoading } = useQuery({
    queryKey: ["car-models", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("car_models" as any).select("*, car_brands(name, name_en)").eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CarModel[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !name.trim() || !brandId) throw new Error("Missing data");
      if (editingModel) {
        const { error } = await supabase.from("car_models" as any).update({ name: name.trim(), name_en: nameEn.trim() || null, brand_id: brandId, year_from: yearFrom || null, year_to: yearTo || null } as any).eq("id", editingModel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("car_models" as any).insert({ company_id: companyId, name: name.trim(), name_en: nameEn.trim() || null, brand_id: brandId, year_from: yearFrom || null, year_to: yearTo || null } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["car-models"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: isRTL ? "تم الحفظ" : "Saved", description: isRTL ? "تم حفظ الموديل بنجاح" : "Model saved successfully" });
    },
    onError: () => {
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "حدث خطأ في الحفظ" : "Error saving model", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("car_models" as any).update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["car-models"] }); },
  });

  const resetForm = () => { setName(""); setNameEn(""); setBrandId(""); setYearFrom(""); setYearTo(""); setEditingModel(null); };

  const openEdit = (model: CarModel) => {
    setEditingModel(model);
    setName(model.name);
    setNameEn(model.name_en || "");
    setBrandId(model.brand_id);
    setYearFrom(model.year_from || "");
    setYearTo(model.year_to || "");
    setDialogOpen(true);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const filteredModels = models?.filter((m) => filterBrand === "all" || m.brand_id === filterBrand) || [];

  const currentYear = new Date().getFullYear();

  const brandFilterSelect = (
    <Select value={filterBrand} onValueChange={setFilterBrand}>
      <SelectTrigger className="w-[180px] h-9">
        <SelectValue placeholder={isRTL ? "كل الماركات" : "All Brands"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{isRTL ? "كل الماركات" : "All Brands"}</SelectItem>
        {brands?.map((b) => (
          <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : (b.name_en || b.name)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <DataTable
        title={isRTL ? "موديلات السيارات" : "Car Models"}
        icon={<Car className="h-5 w-5" />}
        columns={[
          { key: "name", header: isRTL ? "الموديل" : "Model", render: (m: CarModel) => <span className="font-medium">{isRTL ? m.name : (m.name_en || m.name)}</span> },
          { key: "brand", header: isRTL ? "الماركة" : "Brand", render: (m: CarModel) => isRTL ? m.car_brands?.name : (m.car_brands?.name_en || m.car_brands?.name) || "-" },
          { key: "years", header: isRTL ? "السنوات" : "Years", render: (m: CarModel) => m.year_from && m.year_to ? `${m.year_from} - ${m.year_to}` : m.year_from ? `${m.year_from}+` : "-", hideOnMobile: true },
          { key: "status", header: isRTL ? "الحالة" : "Status", render: (m: CarModel) => (
            <Switch checked={m.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: m.id, is_active: checked })} />
          )},
        ]}
        data={filteredModels}
        isLoading={isLoading}
        rowKey={(m: CarModel) => m.id}
        actions={[
          { label: isRTL ? "تعديل" : "Edit", icon: <Edit className="h-4 w-4" />, onClick: (m: CarModel) => openEdit(m) },
        ]}
        searchPlaceholder={isRTL ? "بحث عن موديل..." : "Search models..."}
        onSearch={(m: CarModel, term: string) => m.name.includes(term) || (m.name_en || "").toLowerCase().includes(term)}
        createButton={{ label: isRTL ? "موديل جديد" : "New Model", onClick: openNew }}
        headerExtra={brandFilterSelect}
        emptyState={{ icon: <Car className="h-10 w-10 text-muted-foreground/60" />, title: isRTL ? "لا توجد موديلات" : "No models yet", actionLabel: isRTL ? "إضافة موديل" : "Add Model", onAction: openNew }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModel ? (isRTL ? "تعديل الموديل" : "Edit Model") : (isRTL ? "موديل جديد" : "New Model")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الماركة *" : "Brand *"}</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الماركة" : "Select brand"} /></SelectTrigger>
                <SelectContent>
                  {brands?.map((b) => (<SelectItem key={b.id} value={b.id}>{isRTL ? b.name : (b.name_en || b.name)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الموديل (عربي) *" : "Model Name (Arabic) *"}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isRTL ? "مثال: كامري" : "e.g. Camry"} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الموديل (إنجليزي)" : "Model Name (English)"}</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Camry" dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "من سنة" : "Year From"}</Label>
                <Input type="number" min="1950" max={currentYear + 2} value={yearFrom} onChange={(e) => setYearFrom(e.target.value ? Number(e.target.value) : "")} placeholder="2010" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "إلى سنة" : "Year To"}</Label>
                <Input type="number" min="1950" max={currentYear + 2} value={yearTo} onChange={(e) => setYearTo(e.target.value ? Number(e.target.value) : "")} placeholder={String(currentYear)} />
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !name.trim() || !brandId} className="w-full">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarModels;