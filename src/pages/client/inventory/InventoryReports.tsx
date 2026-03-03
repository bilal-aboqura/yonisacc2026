import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download } from "lucide-react";
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

  const { data: movements = [] } = useQuery({
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

  const { data: products = [] } = useQuery({
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
      if (!p.reorder_level || p.reorder_level <= 0) return false;
      const totalQty = (p.product_stock || []).reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
      return totalQty < p.reorder_level;
    });
  }, [products]);

  const stockValuation = useMemo(() => {
    return products.map((p: any) => {
      const stocks = p.product_stock || [];
      const totalQty = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
      const totalValue = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0) * (ps.avg_cost || 0), 0);
      return { ...p, totalQty, totalValue };
    }).filter((p: any) => p.totalQty > 0);
  }, [products]);

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

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{isRTL ? "تقارير المخزون" : "Inventory Reports"}</h1>
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
          <div className={cn("flex justify-end", isRTL && "flex-row-reverse")}>
            <Button variant="outline" size="sm" onClick={() => exportToExcel(movements.map((m: any) => ({ Date: m.movement_date, Type: m.movement_type, Product: m.products?.name, Qty: m.quantity, Cost: m.unit_cost })), "stock-movements")} className={cn("gap-1", isRTL && "flex-row-reverse")}>
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
                    <TableHead className="text-center">{isRTL ? "الكمية" : "Qty"}</TableHead>
                    <TableHead>{isRTL ? "التكلفة" : "Cost"}</TableHead>
                    <TableHead>{isRTL ? "ملاحظات" : "Notes"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد حركات" : "No movements"}</TableCell></TableRow>
                  ) : movements.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.movement_date}</TableCell>
                      <TableCell>{movementTypeLabel(m.movement_type)}</TableCell>
                      <TableCell>{m.products ? (isRTL ? m.products.name : m.products.name_en || m.products.name) : "-"}</TableCell>
                      <TableCell className={cn("text-center font-medium", m.quantity > 0 ? "text-green-600" : "text-red-600")}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                      <TableCell>{m.unit_cost || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{m.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuation" className="space-y-4">
          <div className={cn("flex justify-end", isRTL && "flex-row-reverse")}>
            <Button variant="outline" size="sm" onClick={() => exportToExcel(stockValuation.map((p: any) => ({ Product: p.name, Qty: p.totalQty, Value: p.totalValue.toFixed(2) })), "stock-valuation")} className={cn("gap-1", isRTL && "flex-row-reverse")}>
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
                    <TableHead className="text-center">{isRTL ? "الكمية" : "Qty"}</TableHead>
                    <TableHead className={cn(isRTL ? "text-left" : "text-right")}>{isRTL ? "القيمة" : "Value"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockValuation.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                  ) : stockValuation.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{isRTL ? p.name : p.name_en || p.name}</TableCell>
                      <TableCell className="text-center">{p.totalQty}</TableCell>
                      <TableCell className={cn("font-medium", isRTL ? "text-left" : "text-right")}>{p.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  {stockValuation.length > 0 && (
                    <TableRow className="font-bold bg-muted/30">
                      <TableCell>{isRTL ? "الإجمالي" : "Total"}</TableCell>
                      <TableCell className="text-center">{stockValuation.reduce((s: number, p: any) => s + p.totalQty, 0)}</TableCell>
                      <TableCell className={cn(isRTL ? "text-left" : "text-right")}>{stockValuation.reduce((s: number, p: any) => s + p.totalValue, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
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
                    <TableHead className="text-center">{isRTL ? "الكمية الحالية" : "Current Qty"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "حد إعادة الطلب" : "Reorder Level"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "النقص" : "Shortage"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {belowReorderProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد منتجات تحت الحد الأدنى" : "No products below reorder level"}</TableCell></TableRow>
                  ) : belowReorderProducts.map((p: any) => {
                    const totalQty = (p.product_stock || []).reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{isRTL ? p.name : p.name_en || p.name}</TableCell>
                        <TableCell className="text-center">{totalQty}</TableCell>
                        <TableCell className="text-center">{p.reorder_level}</TableCell>
                        <TableCell className="text-center text-destructive font-medium">{p.reorder_level - totalQty}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryReports;
