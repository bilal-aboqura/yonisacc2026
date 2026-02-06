import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Car, Edit, Search, Loader2 } from "lucide-react";

interface CarBrand {
  id: string;
  name: string;
  name_en: string | null;
}

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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<CarModel | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [brandId, setBrandId] = useState("");
  const [yearFrom, setYearFrom] = useState<number | "">("");
  const [yearTo, setYearTo] = useState<number | "">("");

  const { data: brands } = useQuery({
    queryKey: ["car-brands", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("car_brands" as any)
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as CarBrand[];
    },
    enabled: !!companyId,
  });

  const { data: models, isLoading } = useQuery({
    queryKey: ["car-models", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("car_models" as any)
        .select("*, car_brands(name, name_en)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CarModel[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !name.trim() || !brandId) throw new Error("Missing data");

      if (editingModel) {
        const { error } = await supabase
          .from("car_models" as any)
          .update({
            name: name.trim(),
            name_en: nameEn.trim() || null,
            brand_id: brandId,
            year_from: yearFrom || null,
            year_to: yearTo || null,
          } as any)
          .eq("id", editingModel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("car_models" as any)
          .insert({
            company_id: companyId,
            name: name.trim(),
            name_en: nameEn.trim() || null,
            brand_id: brandId,
            year_from: yearFrom || null,
            year_to: yearTo || null,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["car-models"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم حفظ الموديل بنجاح" : "Model saved successfully",
      });
    },
    onError: () => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ في الحفظ" : "Error saving model",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("car_models" as any)
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["car-models"] });
    },
  });

  const resetForm = () => {
    setName("");
    setNameEn("");
    setBrandId("");
    setYearFrom("");
    setYearTo("");
    setEditingModel(null);
  };

  const openEdit = (model: CarModel) => {
    setEditingModel(model);
    setName(model.name);
    setNameEn(model.name_en || "");
    setBrandId(model.brand_id);
    setYearFrom(model.year_from || "");
    setYearTo(model.year_to || "");
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const filtered = models?.filter((m) => {
    const matchSearch =
      m.name.includes(searchTerm) ||
      m.name_en?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBrand = filterBrand === "all" || m.brand_id === filterBrand;
    return matchSearch && matchBrand;
  });

  const currentYear = new Date().getFullYear();

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "موديلات السيارات" : "Car Models"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة موديلات السيارات وسنوات الصنع" : "Manage car models and years"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" />
              {isRTL ? "موديل جديد" : "New Model"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingModel
                  ? (isRTL ? "تعديل الموديل" : "Edit Model")
                  : (isRTL ? "موديل جديد" : "New Model")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الماركة *" : "Brand *"}</Label>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? "اختر الماركة" : "Select brand"} />
                  </SelectTrigger>
                  <SelectContent>
                    {brands?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {isRTL ? b.name : (b.name_en || b.name)}
                      </SelectItem>
                    ))}
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

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={isRTL ? "بحث عن موديل..." : "Search models..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="ps-10" />
            </div>
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={isRTL ? "كل الماركات" : "All Brands"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "كل الماركات" : "All Brands"}</SelectItem>
                {brands?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {isRTL ? b.name : (b.name_en || b.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !filtered?.length ? (
            <div className="text-center py-12">
              <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isRTL ? "لا توجد موديلات بعد" : "No models yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL ? "ابدأ بإضافة موديلات السيارات" : "Start by adding car models"}
              </p>
              <Button className="gap-2" onClick={openNew}>
                <Plus className="h-4 w-4" />
                {isRTL ? "إضافة موديل" : "Add Model"}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "الموديل" : "Model"}</TableHead>
                  <TableHead>{isRTL ? "الماركة" : "Brand"}</TableHead>
                  <TableHead>{isRTL ? "السنوات" : "Years"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">
                      {isRTL ? model.name : (model.name_en || model.name)}
                    </TableCell>
                    <TableCell>
                      {isRTL
                        ? model.car_brands?.name
                        : (model.car_brands?.name_en || model.car_brands?.name) || "-"}
                    </TableCell>
                    <TableCell>
                      {model.year_from && model.year_to
                        ? `${model.year_from} - ${model.year_to}`
                        : model.year_from
                        ? `${model.year_from}+`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={model.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: model.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(model)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CarModels;
