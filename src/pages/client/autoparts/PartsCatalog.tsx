import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Package, Loader2, MapPin, Car, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CarBrand {
  id: string;
  name: string;
  name_en: string | null;
}

interface PartProduct {
  id: string;
  name: string;
  name_en: string | null;
  sku: string | null;
  oem_number: string | null;
  shelf_location: string | null;
  part_condition: string | null;
  sale_price: number | null;
  product_car_compatibility: Array<{
    car_model_id: string;
    car_models: {
      name: string;
      name_en: string | null;
      car_brands: { name: string; name_en: string | null };
    };
  }>;
}

const PartsCatalog = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");

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

  const { data: products, isLoading } = useQuery({
    queryKey: ["parts-catalog", companyId, filterCondition],
    queryFn: async () => {
      if (!companyId) return [];

      const baseQuery = supabase
        .from("products")
        .select("id, name, name_en, sku, oem_number, shelf_location, part_condition, sale_price")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");

      const finalQuery = filterCondition !== "all" 
        ? baseQuery.eq("part_condition", filterCondition) 
        : baseQuery;

      const { data, error } = await (finalQuery as any);
      if (error) throw error;

      // Fetch compatibility data separately
      const productIds = (data || []).map((p: any) => p.id);
      let compatData: any[] = [];
      if (productIds.length > 0) {
        const { data: compat } = await supabase
          .from("product_car_compatibility" as any)
          .select("product_id, car_model_id, car_models(name, name_en, car_brands(name, name_en))")
          .in("product_id", productIds);
        compatData = (compat || []) as any[];
      }

      return (data || []).map((p: any) => ({
        ...p,
        product_car_compatibility: compatData.filter((c: any) => c.product_id === p.id),
      })) as PartProduct[];
    },
    enabled: !!companyId,
  });

  const filtered = products?.filter((p) => {
    const matchSearch =
      !searchTerm ||
      p.name?.includes(searchTerm) ||
      p.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.oem_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchBrand =
      filterBrand === "all" ||
      p.product_car_compatibility?.some(
        (c: any) => brands?.find((b) => b.id === filterBrand)?.name === c.car_models?.car_brands?.name
      );

    return matchSearch && matchBrand;
  });

  const conditionLabels: Record<string, { ar: string; en: string }> = {
    new: { ar: "جديد", en: "New" },
    used: { ar: "مستعمل", en: "Used" },
    refurbished: { ar: "مجدد", en: "Refurbished" },
  };

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "كتالوج القطع" : "Parts Catalog"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "بحث متقدم في قطع الغيار حسب رقم OEM أو الماركة والموديل" : "Advanced search for parts by OEM number or brand/model"}
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/client/inventory/new")}>
          <Package className="h-4 w-4" />
          {isRTL ? "إضافة قطعة" : "Add Part"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث بالاسم أو رقم OEM أو SKU..." : "Search by name, OEM number, or SKU..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "كل الماركات" : "All Brands"}</SelectItem>
                {brands?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : (b.name_en || b.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCondition} onValueChange={setFilterCondition}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "كل الحالات" : "All"}</SelectItem>
                <SelectItem value="new">{isRTL ? "جديد" : "New"}</SelectItem>
                <SelectItem value="used">{isRTL ? "مستعمل" : "Used"}</SelectItem>
                <SelectItem value="refurbished">{isRTL ? "مجدد" : "Refurbished"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isRTL ? "نتائج البحث" : "Search Results"}
            {filtered && <Badge variant="secondary">{filtered.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !filtered?.length ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{isRTL ? "لا توجد قطع" : "No parts found"}</h3>
              <p className="text-muted-foreground">{isRTL ? "جرب تعديل معايير البحث" : "Try adjusting your search criteria"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "القطعة" : "Part"}</TableHead>
                    <TableHead><div className="flex items-center gap-1"><Hash className="h-3 w-3" />OEM</div></TableHead>
                    <TableHead><div className="flex items-center gap-1"><Car className="h-3 w-3" />{isRTL ? "التوافق" : "Compatibility"}</div></TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Condition"}</TableHead>
                    <TableHead><div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{isRTL ? "الرف" : "Shelf"}</div></TableHead>
                    <TableHead>{isRTL ? "السعر" : "Price"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{isRTL ? product.name : (product.name_en || product.name)}</p>
                          {product.sku && <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>}
                        </div>
                      </TableCell>
                      <TableCell><span className="font-mono text-sm">{product.oem_number || "-"}</span></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {product.product_car_compatibility?.slice(0, 3).map((c: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {isRTL
                                ? `${c.car_models?.car_brands?.name} ${c.car_models?.name}`
                                : `${c.car_models?.car_brands?.name_en || c.car_models?.car_brands?.name} ${c.car_models?.name_en || c.car_models?.name}`}
                            </Badge>
                          ))}
                          {(product.product_car_compatibility?.length || 0) > 3 && (
                            <Badge variant="secondary" className="text-xs">+{product.product_car_compatibility.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.part_condition && (
                          <Badge variant={product.part_condition === "new" ? "default" : "secondary"} className="text-xs">
                            {isRTL ? conditionLabels[product.part_condition]?.ar : conditionLabels[product.part_condition]?.en}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell><span className="text-sm">{product.shelf_location || "-"}</span></TableCell>
                      <TableCell><span className="font-medium">{product.sale_price} {isRTL ? "ر.س" : "SAR"}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PartsCatalog;
