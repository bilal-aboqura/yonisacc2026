import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useRBAC } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Boxes, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const StockOverview = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [belowReorderOnly, setBelowReorderOnly] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["stock-overview", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name, name_en), product_stock(quantity, reserved_quantity, avg_cost, warehouse_id, warehouses(name, name_en, branch_id))")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .neq("product_type", "service")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").eq("company_id", companyId!).eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["product_categories", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_categories").select("*").eq("company_id", companyId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (searchTerm && !(p.name?.includes(searchTerm) || p.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.includes(searchTerm))) return false;
      if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;

      const stocks = p.product_stock || [];
      const totalQty = stocks.reduce((sum: number, s: any) => {
        if (branchFilter !== "all" && s.warehouses?.branch_id !== branchFilter) return sum;
        return sum + (s.quantity || 0);
      }, 0);

      if (branchFilter !== "all" && totalQty === 0 && stocks.length > 0) return false;
      if (belowReorderOnly && totalQty >= (p.reorder_level || 0)) return false;

      return true;
    });
  }, [products, searchTerm, branchFilter, categoryFilter, belowReorderOnly]);

  const getStockInfo = (product: any) => {
    const stocks = product.product_stock || [];
    let qty = 0, reserved = 0, value = 0;
    stocks.forEach((s: any) => {
      if (branchFilter !== "all" && s.warehouses?.branch_id !== branchFilter) return;
      qty += s.quantity || 0;
      reserved += s.reserved_quantity || 0;
      value += (s.quantity || 0) * (s.avg_cost || 0);
    });
    return { qty, reserved, actual: qty - reserved, value };
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
        <Boxes className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{isRTL ? "عرض المخزون" : "Stock Overview"}</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-4", isRTL && "flex-row-reverse")}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className={cn("absolute top-2.5 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input
                placeholder={isRTL ? "بحث بالاسم أو SKU..." : "Search by name or SKU..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={cn(isRTL ? "pr-9" : "pl-9")}
              />
            </div>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isRTL ? "الفرع" : "Branch"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الفروع" : "All Branches"}</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isRTL ? "التصنيف" : "Category"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع التصنيفات" : "All Categories"}</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{isRTL ? c.name : c.name_en || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={belowReorderOnly ? "default" : "outline"}
              onClick={() => setBelowReorderOnly(!belowReorderOnly)}
              className={cn("gap-2", isRTL && "flex-row-reverse")}
            >
              <AlertTriangle className="h-4 w-4" />
              {isRTL ? "تحت الحد الأدنى" : "Below Reorder"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                <TableHead>{isRTL ? "SKU" : "SKU"}</TableHead>
                <TableHead>{isRTL ? "التصنيف" : "Category"}</TableHead>
                <TableHead className="text-center">{isRTL ? "الكمية المتاحة" : "Available"}</TableHead>
                <TableHead className="text-center">{isRTL ? "محجوز" : "Reserved"}</TableHead>
                <TableHead className="text-center">{isRTL ? "الفعلي" : "Actual"}</TableHead>
                <TableHead className="text-center">{isRTL ? "حد إعادة الطلب" : "Reorder Level"}</TableHead>
                <TableHead className={cn(isRTL ? "text-left" : "text-right")}>{isRTL ? "القيمة" : "Value"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isRTL ? "جاري التحميل..." : "Loading..."}
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isRTL ? "لا توجد منتجات" : "No products found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((p: any) => {
                  const { qty, reserved, actual, value } = getStockInfo(p);
                  const belowReorder = (p.reorder_level || 0) > 0 && qty < (p.reorder_level || 0);
                  return (
                    <TableRow key={p.id} className={belowReorder ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">
                        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                          {isRTL ? p.name : p.name_en || p.name}
                          {belowReorder && <AlertTriangle className="h-4 w-4 text-destructive" />}
                        </div>
                      </TableCell>
                      <TableCell>{p.sku || "-"}</TableCell>
                      <TableCell>
                        {p.product_categories ? (isRTL ? p.product_categories.name : p.product_categories.name_en || p.product_categories.name) : "-"}
                      </TableCell>
                      <TableCell className="text-center">{qty}</TableCell>
                      <TableCell className="text-center">{reserved}</TableCell>
                      <TableCell className="text-center font-medium">{actual}</TableCell>
                      <TableCell className="text-center">{p.reorder_level || "-"}</TableCell>
                      <TableCell className={cn("font-medium", isRTL ? "text-left" : "text-right")}>
                        {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockOverview;
