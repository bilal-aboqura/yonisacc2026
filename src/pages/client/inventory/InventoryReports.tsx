import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download, Loader2, AlertTriangle, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const InventoryReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ["stock_movements_report", companyId, branchFilter, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from("stock_movements")
        .select("*, products(name, name_en), warehouses(name, name_en, branch_id)")
        .eq("company_id", companyId!)
        .order("movement_date", { ascending: false })
        .limit(500);
      if (dateFrom) q = q.gte("movement_date", dateFrom);
      if (dateTo) q = q.lte("movement_date", dateTo);
      const { data, error } = await q;
      if (error) throw error;
      let result = data || [];
      if (branchFilter !== "all") {
        result = result.filter((m: any) => m.warehouses?.branch_id === branchFilter);
      }
      return result;
    },
    enabled: !!companyId,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["stock-overview-report", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, product_stock(quantity, avg_cost, warehouse_id, warehouses(branch_id))")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .neq("product_type", "service");
      return data || [];
    },
    enabled: !!companyId,
  });

  const belowReorderProducts = useMemo(() => {
    return products.filter((p: any) => {
      const reorderLevel = p.reorder_level || p.min_stock || 0;
      if (reorderLevel <= 0) return false;
      const stocks = (p.product_stock || []).filter((ps: any) => branchFilter === "all" || ps.warehouses?.branch_id === branchFilter);
      const totalQty = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
      return totalQty < reorderLevel;
    });
  }, [products, branchFilter]);

  const stockValuation = useMemo(() => {
    return products.map((p: any) => {
      const stocks = (p.product_stock || []).filter((ps: any) => branchFilter === "all" || ps.warehouses?.branch_id === branchFilter);
      const totalQty = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
      const totalValue = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0) * (ps.avg_cost || 0), 0);
      return { ...p, totalQty, totalValue };
    }).filter((p: any) => p.totalQty > 0);
  }, [products, branchFilter]);

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const movementTypeLabel = (type: string) => {
    const labels: Record<string, Record<string, string>> = {
      purchase: { ar: "شراء", en: "Purchase" },
      sale: { ar: "بيع", en: "Sale" },
      adjustment_in: { ar: "تسوية زيادة", en: "Adj. In" },
      adjustment_out: { ar: "تسوية نقص", en: "Adj. Out" },
      transfer_in: { ar: "تحويل وارد", en: "Transfer In" },
      transfer_out: { ar: "تحويل صادر", en: "Transfer Out" },
      consumption: { ar: "استهلاك", en: "Consumption" },
      manufacturing_in: { ar: "تصنيع وارد", en: "Mfg. In" },
      manufacturing_out: { ar: "تصنيع صادر", en: "Mfg. Out" },
    };
    return isRTL ? labels[type]?.ar || type : labels[type]?.en || type;
  };

  const formatDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" />
          {isRTL ? "تقارير المخزون" : "Inventory Reports"}
        </h1>
        <p className="text-muted-foreground mt-1">{isRTL ? "تقارير الحركات والتقييم وإعادة الطلب" : "Movements, valuation, and reorder reports"}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-4 items-end", isRTL && "flex-row-reverse")}>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder={isRTL ? "الفرع" : "Branch"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الفروع" : "All"}</SelectItem>
                {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div>
              <label className="text-xs text-muted-foreground">{isRTL ? "من" : "From"}</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isRTL ? "إلى" : "To"}</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="movements" dir={isRTL ? "rtl" : "ltr"}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="movements">{isRTL ? "حركة المخزون" : "Stock Movements"}</TabsTrigger>
          <TabsTrigger value="valuation">{isRTL ? "تقييم المخزون" : "Valuation"}</TabsTrigger>
          <TabsTrigger value="below-reorder">{isRTL ? "تحت الحد الأدنى" : "Below Reorder"}</TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportToExcel(movements.map((m: any) => ({ Date: m.movement_date, Type: m.movement_type, Product: m.products?.name, Qty: m.quantity, Cost: m.unit_cost })), "stock-movements")} className="gap-1">
              <Download className="h-4 w-4" />
              {isRTL ? "تصدير Excel" : "Export Excel"}
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                    <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "التكلفة" : "Cost"}</TableHead>
                    <TableHead>{isRTL ? "ملاحظات" : "Notes"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground font-medium">{isRTL ? "لا توجد حركات" : "No movements"}</p>
                      </TableCell>
                    </TableRow>
                  ) : movements.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">{formatDate(m.movement_date)}</TableCell>
                      <TableCell>{movementTypeLabel(m.movement_type)}</TableCell>
                      <TableCell className="font-medium">{m.products ? (isRTL ? m.products.name : m.products.name_en || m.products.name) : "-"}</TableCell>
                      <TableCell className={cn("text-end tabular-nums font-medium", m.quantity > 0 ? "text-green-600" : "text-destructive")}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                      <TableCell className="text-end tabular-nums text-muted-foreground">{m.unit_cost || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{m.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!movementsLoading && movements.length > 0 && (
                <div className="px-4 py-3 border-t text-sm text-muted-foreground">
                  {isRTL ? `${movements.length} حركة` : `${movements.length} movements`}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuation" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportToExcel(stockValuation.map((p: any) => ({ Product: p.name, Qty: p.totalQty, Value: p.totalValue.toFixed(2) })), "stock-valuation")} className="gap-1">
              <Download className="h-4 w-4" />
              {isRTL ? "تصدير Excel" : "Export Excel"}
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "القيمة" : "Value"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : stockValuation.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12">
                        <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground font-medium">{isRTL ? "لا توجد بيانات" : "No data"}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {stockValuation.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{isRTL ? p.name : p.name_en || p.name}</TableCell>
                          <TableCell className="text-end tabular-nums">{p.totalQty}</TableCell>
                          <TableCell className="text-end tabular-nums font-medium">{p.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/30">
                        <TableCell>{isRTL ? "الإجمالي" : "Total"}</TableCell>
                        <TableCell className="text-end tabular-nums">{stockValuation.reduce((s: number, p: any) => s + p.totalQty, 0)}</TableCell>
                        <TableCell className="text-end tabular-nums">{stockValuation.reduce((s: number, p: any) => s + p.totalValue, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="below-reorder" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "الكمية الحالية" : "Current Qty"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "حد إعادة الطلب" : "Reorder Level"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "النقص" : "Shortage"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : belowReorderProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground font-medium">{isRTL ? "لا توجد منتجات تحت الحد الأدنى" : "No products below reorder level"}</p>
                      </TableCell>
                    </TableRow>
                  ) : belowReorderProducts.map((p: any) => {
                    const totalQty = (p.product_stock || []).reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{isRTL ? p.name : p.name_en || p.name}</TableCell>
                        <TableCell className="text-end tabular-nums">{totalQty}</TableCell>
                        <TableCell className="text-end tabular-nums">{p.reorder_level}</TableCell>
                        <TableCell className="text-end tabular-nums text-destructive font-semibold">{p.reorder_level - totalQty}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!productsLoading && belowReorderProducts.length > 0 && (
                <div className="px-4 py-3 border-t text-sm text-muted-foreground">
                  {isRTL ? `${belowReorderProducts.length} منتج تحت الحد الأدنى` : `${belowReorderProducts.length} products below reorder`}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryReports;
