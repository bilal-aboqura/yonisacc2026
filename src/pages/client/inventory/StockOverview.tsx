import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Boxes, Search, AlertTriangle, Eye, Download, Package, DollarSign, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import InventoryStatCard from "@/components/inventory/InventoryStatCard";
import * as XLSX from "xlsx";

const StockOverview = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
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

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (searchTerm && !(p.name?.includes(searchTerm) || p.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.includes(searchTerm))) return false;
      if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
      const { qty } = getStockInfo(p);
      if (branchFilter !== "all" && qty === 0 && (p.product_stock || []).length > 0) return false;
      if (belowReorderOnly && qty >= (p.reorder_level || 0)) return false;
      return true;
    });
  }, [products, searchTerm, branchFilter, categoryFilter, belowReorderOnly]);

  // Stats
  const stats = useMemo(() => {
    let totalValue = 0, belowReorder = 0, zeroStock = 0;
    products.forEach((p: any) => {
      const { qty, value } = getStockInfo(p);
      totalValue += value;
      if ((p.reorder_level || 0) > 0 && qty < (p.reorder_level || 0)) belowReorder++;
      if (qty === 0) zeroStock++;
    });
    return { totalProducts: products.length, totalValue, belowReorder, zeroStock };
  }, [products, branchFilter]);

  const handleExport = () => {
    const data = filteredProducts.map((p: any) => {
      const { qty, reserved, actual, value } = getStockInfo(p);
      return {
        [isRTL ? "المنتج" : "Product"]: isRTL ? p.name : p.name_en || p.name,
        SKU: p.sku || "-",
        [isRTL ? "الكمية" : "Qty"]: qty,
        [isRTL ? "محجوز" : "Reserved"]: reserved,
        [isRTL ? "الفعلي" : "Actual"]: actual,
        [isRTL ? "القيمة" : "Value"]: value.toFixed(2),
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, "stock-overview.xlsx");
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4")}>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Boxes className="h-7 w-7 text-primary" />
            {isRTL ? "عرض المخزون" : "Stock Overview"}
          </h1>
          <p className="text-muted-foreground mt-1">{isRTL ? "عرض أرصدة المخزون والقيم لجميع المنتجات" : "View stock balances and values for all products"}</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2" disabled={filteredProducts.length === 0}>
          <Download className="h-4 w-4" />
          {isRTL ? "تصدير Excel" : "Export Excel"}
        </Button>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[88px] rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InventoryStatCard icon={Package} title={isRTL ? "إجمالي المنتجات" : "Total Products"} value={stats.totalProducts} />
          <InventoryStatCard icon={DollarSign} title={isRTL ? "القيمة الكلية" : "Total Value"} value={stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} variant="success" />
          <InventoryStatCard icon={AlertTriangle} title={isRTL ? "تحت الحد الأدنى" : "Below Reorder"} value={stats.belowReorder} variant={stats.belowReorder > 0 ? "danger" : "default"} />
          <InventoryStatCard icon={TrendingDown} title={isRTL ? "بدون رصيد" : "Zero Stock"} value={stats.zeroStock} variant={stats.zeroStock > 0 ? "warning" : "default"} />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-4", isRTL && "flex-row-reverse")}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className={cn("absolute top-2.5 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input placeholder={isRTL ? "بحث بالاسم أو SKU..." : "Search by name or SKU..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={cn(isRTL ? "pr-9" : "pl-9")} />
            </div>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder={isRTL ? "الفرع" : "Branch"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الفروع" : "All Branches"}</SelectItem>
                {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder={isRTL ? "التصنيف" : "Category"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع التصنيفات" : "All Categories"}</SelectItem>
                {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{isRTL ? c.name : c.name_en || c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant={belowReorderOnly ? "default" : "outline"} onClick={() => setBelowReorderOnly(!belowReorderOnly)} className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              {isRTL ? "تحت الحد" : "Below Reorder"}
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
                <TableHead className="text-end">{isRTL ? "المتاحة" : "Available"}</TableHead>
                <TableHead className="text-end">{isRTL ? "محجوز" : "Reserved"}</TableHead>
                <TableHead className="text-end">{isRTL ? "الفعلي" : "Actual"}</TableHead>
                <TableHead className="text-end">{isRTL ? "حد الطلب" : "Reorder"}</TableHead>
                <TableHead className="text-end">{isRTL ? "القيمة" : "Value"}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Boxes className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground font-medium">{isRTL ? "لا توجد منتجات" : "No products found"}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((p: any) => {
                  const { qty, reserved, actual, value } = getStockInfo(p);
                  const reorder = p.reorder_level || 0;
                  const belowReorder = reorder > 0 && qty < reorder;
                  const reorderPercent = reorder > 0 ? Math.min((qty / reorder) * 100, 100) : -1;
                  return (
                    <TableRow key={p.id} className={belowReorder ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{isRTL ? p.name : p.name_en || p.name}</span>
                          {belowReorder && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                        </div>
                        {reorderPercent >= 0 && (
                          <Progress value={reorderPercent} className={cn("h-1.5 mt-1.5 w-24", reorderPercent < 50 ? "[&>div]:bg-destructive" : reorderPercent < 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")} />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{p.sku || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.product_categories ? (isRTL ? p.product_categories.name : p.product_categories.name_en || p.product_categories.name) : "-"}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{qty}</TableCell>
                      <TableCell className="text-end tabular-nums text-muted-foreground">{reserved}</TableCell>
                      <TableCell className="text-end tabular-nums font-semibold">{actual}</TableCell>
                      <TableCell className="text-end tabular-nums text-muted-foreground">{reorder || "-"}</TableCell>
                      <TableCell className="text-end tabular-nums font-medium">{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/client/inventory/product/${p.id}`)}>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {!isLoading && filteredProducts.length > 0 && (
            <div className="px-4 py-3 border-t text-sm text-muted-foreground flex items-center justify-between">
              <span>{isRTL ? `${filteredProducts.length} منتج` : `${filteredProducts.length} products`}</span>
              <span className="font-medium text-foreground tabular-nums">
                {isRTL ? "إجمالي القيمة:" : "Total Value:"} {filteredProducts.reduce((s: number, p: any) => s + getStockInfo(p).value, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockOverview;
