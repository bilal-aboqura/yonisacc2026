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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Download, AlertTriangle, Package, Layers, Search, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const InventoryReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => { const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!).eq("is_active", true); return data || []; },
    enabled: !!companyId,
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ["stock_movements_report", companyId, branchFilter, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("stock_movements").select("*, products(name, name_en, sku), warehouses(name, name_en, branch_id)").eq("company_id", companyId!).order("movement_date", { ascending: true }).limit(1000);
      if (dateFrom) q = q.gte("movement_date", dateFrom);
      if (dateTo) q = q.lte("movement_date", dateTo);
      const { data, error } = await q;
      if (error) throw error;
      let result = data || [];
      if (branchFilter !== "all") result = result.filter((m: any) => m.warehouses?.branch_id === branchFilter);
      return result;
    },
    enabled: !!companyId,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["stock-overview-report", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, product_categories(name, name_en), product_stock(quantity, avg_cost, warehouse_id, warehouses(branch_id, name, name_en))").eq("company_id", companyId!).eq("is_active", true).neq("product_type", "service");
      return data || [];
    },
    enabled: !!companyId,
  });

  const inboundTypes = ["purchase", "adjustment_in", "transfer_in", "manufacturing_in"];

  // Compute ledger with running balance & weighted avg cost per product
  const movementLedger = useMemo(() => {
    const sorted = [...movements].sort((a: any, b: any) => new Date(a.movement_date).getTime() - new Date(b.movement_date).getTime() || a.id.localeCompare(b.id));

    const balances: Record<string, { qty: number; avgCost: number }> = {};

    return sorted.map((m: any) => {
      const pid = m.product_id;
      if (!balances[pid]) balances[pid] = { qty: 0, avgCost: 0 };

      const qty = m.quantity || 0;
      const unitCost = m.unit_cost || 0;
      const isInbound = inboundTypes.includes(m.movement_type);
      const prev = balances[pid];

      if (isInbound && qty > 0 && unitCost > 0) {
        const newQty = prev.qty + qty;
        const newAvg = newQty > 0 ? (prev.qty * prev.avgCost + qty * unitCost) / newQty : unitCost;
        balances[pid] = { qty: newQty, avgCost: newAvg };
      } else {
        balances[pid] = { qty: prev.qty + qty, avgCost: prev.avgCost };
      }

      const bal = balances[pid];
      return {
        ...m,
        inQty: qty > 0 ? qty : 0,
        outQty: qty < 0 ? Math.abs(qty) : 0,
        runningBalance: bal.qty,
        movingAvgCost: bal.avgCost,
        lineValue: bal.qty * bal.avgCost,
      };
    });
  }, [movements]);

  // Filter by product search
  const filteredLedger = useMemo(() => {
    if (!productSearch.trim()) return movementLedger;
    const term = productSearch.toLowerCase();
    return movementLedger.filter((m: any) => {
      const name = (m.products?.name || "").toLowerCase();
      const nameEn = (m.products?.name_en || "").toLowerCase();
      const sku = (m.products?.sku || "").toLowerCase();
      return name.includes(term) || nameEn.includes(term) || sku.includes(term);
    });
  }, [movementLedger, productSearch]);

  // Display in descending order (newest first)
  const displayLedger = useMemo(() => [...filteredLedger].reverse(), [filteredLedger]);

  // Summary cards
  const movementSummary = useMemo(() => {
    const totalIn = filteredLedger.reduce((s: number, m: any) => s + m.inQty, 0);
    const totalOut = filteredLedger.reduce((s: number, m: any) => s + m.outQty, 0);
    return { totalIn, totalOut, net: totalIn - totalOut, count: filteredLedger.length };
  }, [filteredLedger]);

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
    const items = products.map((p: any) => {
      const stocks = (p.product_stock || []).filter((ps: any) => branchFilter === "all" || ps.warehouses?.branch_id === branchFilter);
      const totalQty = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
      const totalValue = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0) * (ps.avg_cost || 0), 0);
      const avgCost = totalQty > 0 ? totalValue / totalQty : 0;
      return { ...p, totalQty, totalValue, avgCost };
    }).filter((p: any) => p.totalQty > 0);
    const grandTotal = items.reduce((s: number, p: any) => s + p.totalValue, 0);
    return { items, grandTotal };
  }, [products, branchFilter]);

  const categorySummary = useMemo(() => {
    const map: Record<string, { name: string; count: number; qty: number; value: number }> = {};
    products.forEach((p: any) => {
      const catName = p.product_categories ? (isRTL ? p.product_categories.name : p.product_categories.name_en || p.product_categories.name) : (isRTL ? "بدون تصنيف" : "Uncategorized");
      const catId = p.category_id || "none";
      if (!map[catId]) map[catId] = { name: catName, count: 0, qty: 0, value: 0 };
      const stocks = (p.product_stock || []).filter((ps: any) => branchFilter === "all" || ps.warehouses?.branch_id === branchFilter);
      const qty = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
      const val = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0) * (ps.avg_cost || 0), 0);
      map[catId].count++;
      map[catId].qty += qty;
      map[catId].value += val;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [products, branchFilter, isRTL]);

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const movementTypeLabel = (type: string) => {
    const labels: Record<string, Record<string, string>> = {
      purchase: { ar: "شراء", en: "Purchase" }, sale: { ar: "بيع", en: "Sale" },
      adjustment_in: { ar: "تسوية زيادة", en: "Adj. In" }, adjustment_out: { ar: "تسوية نقص", en: "Adj. Out" },
      transfer_in: { ar: "تحويل وارد", en: "Transfer In" }, transfer_out: { ar: "تحويل صادر", en: "Transfer Out" },
      consumption: { ar: "استهلاك", en: "Consumption" },
      manufacturing_in: { ar: "تصنيع وارد", en: "Mfg. In" }, manufacturing_out: { ar: "تصنيع صادر", en: "Mfg. Out" },
    };
    return isRTL ? labels[type]?.ar || type : labels[type]?.en || type;
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";
  const fmtNum = (n: number, decimals = 2) => n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" />
          {isRTL ? "تقارير المخزون" : "Inventory Reports"}
        </h1>
        <p className="text-muted-foreground mt-1">{isRTL ? "تقارير الحركات والتقييم وإعادة الطلب" : "Movements, valuation, and reorder reports"}</p>
      </div>

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
            <div><label className="text-xs text-muted-foreground">{isRTL ? "من" : "From"}</label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" /></div>
            <div><label className="text-xs text-muted-foreground">{isRTL ? "إلى" : "To"}</label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" /></div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="movements" dir={isRTL ? "rtl" : "ltr"}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="movements">{isRTL ? "حركة المخزون" : "Stock Movements"}</TabsTrigger>
          <TabsTrigger value="valuation">{isRTL ? "تقييم المخزون" : "Valuation"}</TabsTrigger>
          <TabsTrigger value="category">{isRTL ? "ملخص التصنيفات" : "By Category"}</TabsTrigger>
          <TabsTrigger value="below-reorder">{isRTL ? "تحت الحد الأدنى" : "Below Reorder"}</TabsTrigger>
        </TabsList>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: TrendingUp, label: isRTL ? "إجمالي الوارد" : "Total Inbound", value: movementSummary.totalIn, color: "text-emerald-600 dark:text-emerald-400" },
              { icon: TrendingDown, label: isRTL ? "إجمالي الصادر" : "Total Outbound", value: movementSummary.totalOut, color: "text-destructive" },
              { icon: Activity, label: isRTL ? "صافي الحركة" : "Net Movement", value: movementSummary.net, color: "text-primary" },
              { icon: BarChart3, label: isRTL ? "عدد الحركات" : "Movements", value: movementSummary.count, color: "text-muted-foreground" },
            ].map(({ icon: Icon, label, value, color }, i) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-muted"><Icon className={cn("h-4 w-4", color)} /></div>
                  <div><p className="text-xs text-muted-foreground">{label}</p><p className={cn("text-lg font-bold tabular-nums", color)}>{value}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className={cn("flex flex-wrap gap-3 items-center justify-between", isRTL && "flex-row-reverse")}>
            <div className="relative w-[260px]">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input placeholder={isRTL ? "بحث بالمنتج أو SKU..." : "Search product or SKU..."} value={productSearch} onChange={e => setProductSearch(e.target.value)} className={cn(isRTL ? "pr-9" : "pl-9")} />
            </div>
            <Button variant="outline" size="sm" onClick={() => exportToExcel(displayLedger.map((m: any) => ({
              [isRTL ? "التاريخ" : "Date"]: m.movement_date,
              [isRTL ? "النوع" : "Type"]: movementTypeLabel(m.movement_type),
              [isRTL ? "المنتج" : "Product"]: m.products ? (isRTL ? m.products.name : m.products.name_en || m.products.name) : "-",
              [isRTL ? "وارد" : "In"]: m.inQty || "",
              [isRTL ? "صادر" : "Out"]: m.outQty || "",
              [isRTL ? "الرصيد" : "Balance"]: m.runningBalance,
              [isRTL ? "تكلفة الوحدة" : "Unit Cost"]: m.unit_cost || 0,
              [isRTL ? "متوسط التكلفة" : "Avg Cost"]: Number(m.movingAvgCost.toFixed(2)),
              [isRTL ? "القيمة" : "Value"]: Number(m.lineValue.toFixed(2)),
            })), "stock-movements-ledger")} className="gap-1"><Download className="h-4 w-4" />{isRTL ? "تصدير Excel" : "Export Excel"}</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                    <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "وارد" : "In"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "صادر" : "Out"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "الرصيد" : "Balance"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "تكلفة الوحدة" : "Unit Cost"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "متوسط التكلفة" : "Avg Cost"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "القيمة" : "Value"}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {movementsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)
                    ) : displayLedger.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-12"><BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground font-medium">{isRTL ? "لا توجد حركات" : "No movements"}</p></TableCell></TableRow>
                    ) : displayLedger.map((m: any) => {
                      const isInbound = inboundTypes.includes(m.movement_type);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(m.movement_date)}</TableCell>
                          <TableCell>
                            <Badge variant={isInbound ? "default" : "destructive"} className="font-normal">
                              {movementTypeLabel(m.movement_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{m.products ? (isRTL ? m.products.name : m.products.name_en || m.products.name) : "-"}</TableCell>
                          <TableCell className="text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{m.inQty > 0 ? m.inQty : ""}</TableCell>
                          <TableCell className="text-center tabular-nums text-destructive font-medium">{m.outQty > 0 ? m.outQty : ""}</TableCell>
                          <TableCell className="text-center tabular-nums font-semibold">{m.runningBalance}</TableCell>
                          <TableCell className="text-end tabular-nums text-muted-foreground">{m.unit_cost ? fmtNum(m.unit_cost) : "-"}</TableCell>
                          <TableCell className="text-end tabular-nums text-muted-foreground">{fmtNum(m.movingAvgCost)}</TableCell>
                          <TableCell className="text-end tabular-nums font-medium">{fmtNum(m.lineValue)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {!movementsLoading && displayLedger.length > 0 && <div className="px-4 py-3 border-t text-sm text-muted-foreground">{isRTL ? `${displayLedger.length} حركة` : `${displayLedger.length} movements`}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Valuation Tab */}
        <TabsContent value="valuation" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportToExcel(stockValuation.items.map((p: any) => ({ Product: p.name, Qty: p.totalQty, AvgCost: p.avgCost.toFixed(2), Value: p.totalValue.toFixed(2) })), "stock-valuation")} className="gap-1"><Download className="h-4 w-4" />{isRTL ? "تصدير Excel" : "Export Excel"}</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "متوسط التكلفة" : "Avg Cost"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "القيمة" : "Value"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "النسبة" : "%"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {productsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)
                  ) : stockValuation.items.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12"><Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground font-medium">{isRTL ? "لا توجد بيانات" : "No data"}</p></TableCell></TableRow>
                  ) : (
                    <>
                      {stockValuation.items.map((p: any) => {
                        const pct = stockValuation.grandTotal > 0 ? (p.totalValue / stockValuation.grandTotal) * 100 : 0;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{isRTL ? p.name : p.name_en || p.name}</TableCell>
                            <TableCell className="text-end tabular-nums">{p.totalQty}</TableCell>
                            <TableCell className="text-end tabular-nums text-muted-foreground">{p.avgCost.toFixed(2)}</TableCell>
                            <TableCell className="text-end tabular-nums font-medium">{p.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-end tabular-nums text-muted-foreground">{pct.toFixed(1)}%</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-bold bg-muted/30">
                        <TableCell>{isRTL ? "الإجمالي" : "Total"}</TableCell>
                        <TableCell className="text-end tabular-nums">{stockValuation.items.reduce((s: number, p: any) => s + p.totalQty, 0)}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-end tabular-nums">{stockValuation.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-end tabular-nums">100%</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category Summary Tab */}
        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{isRTL ? "التصنيف" : "Category"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "عدد المنتجات" : "Products"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "القيمة" : "Value"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {productsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)
                  ) : categorySummary.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12"><Layers className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground font-medium">{isRTL ? "لا توجد بيانات" : "No data"}</p></TableCell></TableRow>
                  ) : (
                    <>
                      {categorySummary.map((c, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-end tabular-nums">{c.count}</TableCell>
                          <TableCell className="text-end tabular-nums">{c.qty}</TableCell>
                          <TableCell className="text-end tabular-nums font-medium">{c.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/30">
                        <TableCell>{isRTL ? "الإجمالي" : "Total"}</TableCell>
                        <TableCell className="text-end tabular-nums">{categorySummary.reduce((s, c) => s + c.count, 0)}</TableCell>
                        <TableCell className="text-end tabular-nums">{categorySummary.reduce((s, c) => s + c.qty, 0)}</TableCell>
                        <TableCell className="text-end tabular-nums">{categorySummary.reduce((s, c) => s + c.value, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Below Reorder Tab */}
        <TabsContent value="below-reorder" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "الكمية الحالية" : "Current Qty"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "حد إعادة الطلب" : "Reorder Level"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "النقص" : "Shortage"}</TableHead>
                  <TableHead>{isRTL ? "الأولوية" : "Priority"}</TableHead>
                  <TableHead className="w-[100px]">{isRTL ? "المستوى" : "Level"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {productsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)
                  ) : belowReorderProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12"><AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground font-medium">{isRTL ? "لا توجد منتجات تحت الحد الأدنى" : "No products below reorder level"}</p></TableCell></TableRow>
                  ) : belowReorderProducts.map((p: any) => {
                    const reorderLevel = p.reorder_level || p.min_stock || 0;
                    const stocks = (p.product_stock || []).filter((ps: any) => branchFilter === "all" || ps.warehouses?.branch_id === branchFilter);
                    const totalQty = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
                    const shortage = reorderLevel - totalQty;
                    const pct = reorderLevel > 0 ? (totalQty / reorderLevel) * 100 : 0;
                    const priority = pct <= 25 ? "critical" : pct <= 60 ? "medium" : "low";
                    const priorityLabel = { critical: isRTL ? "حرج" : "Critical", medium: isRTL ? "متوسط" : "Medium", low: isRTL ? "منخفض" : "Low" };
                    const priorityVariant = { critical: "destructive" as const, medium: "outline" as const, low: "secondary" as const };
                    return (
                      <TableRow key={p.id} className={priority === "critical" ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{isRTL ? p.name : p.name_en || p.name}</TableCell>
                        <TableCell className="text-end tabular-nums">{totalQty}</TableCell>
                        <TableCell className="text-end tabular-nums">{reorderLevel}</TableCell>
                        <TableCell className="text-end tabular-nums text-destructive font-semibold">{shortage}</TableCell>
                        <TableCell><Badge variant={priorityVariant[priority]}>{priorityLabel[priority]}</Badge></TableCell>
                        <TableCell><Progress value={pct} className={cn("h-2", pct <= 25 ? "[&>div]:bg-destructive" : pct <= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")} /></TableCell>
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
