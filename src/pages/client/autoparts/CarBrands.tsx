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
  const [searchTerm, setSearchTerm] = useState("");
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
          .insert({
            company_id: companyId,
            name: name.trim(),
            name_en: nameEn.trim() || null,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["car-brands"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم حفظ الماركة بنجاح" : "Brand saved successfully",
      });
    },
    onError: () => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ في الحفظ" : "Error saving brand",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("car_brands" as any)
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["car-brands"] });
    },
  });

  const resetForm = () => {
    setName("");
    setNameEn("");
    setEditingBrand(null);
  };

  const openEdit = (brand: CarBrand) => {
    setEditingBrand(brand);
    setName(brand.name);
    setNameEn(brand.name_en || "");
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const filtered = brands?.filter(
    (b) =>
      b.name.includes(searchTerm) ||
      b.name_en?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "ماركات السيارات" : "Car Brands"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة ماركات السيارات المتوفرة" : "Manage available car brands"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" />
              {isRTL ? "ماركة جديدة" : "New Brand"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBrand
                  ? (isRTL ? "تعديل الماركة" : "Edit Brand")
                  : (isRTL ? "ماركة جديدة" : "New Brand")}
              </DialogTitle>
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

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث عن ماركة..." : "Search brands..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
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
                {isRTL ? "لا توجد ماركات بعد" : "No brands yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL ? "ابدأ بإضافة ماركات السيارات" : "Start by adding car brands"}
              </p>
              <Button className="gap-2" onClick={openNew}>
                <Plus className="h-4 w-4" />
                {isRTL ? "إضافة ماركة" : "Add Brand"}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "الماركة" : "Brand"}</TableHead>
                  <TableHead>{isRTL ? "الاسم الإنجليزي" : "English Name"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>{brand.name_en || "-"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={brand.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: brand.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(brand)}>
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

export default CarBrands;
