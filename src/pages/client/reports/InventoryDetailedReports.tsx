import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Download, AlertTriangle, Clock, Users, UserCheck, ListChecks, BarChart3, BoxSelect, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const InventoryDetailedReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "stock";
  const [branchFilter, setBranchFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => { const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!).eq("is_active", true); return data || []; },
    enabled: !!companyId,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses", companyId],
    queryFn: async () => { const { data } = await supabase.from("warehouses").select("*").eq("company_id", companyId!).eq("is_active", true); return data || []; },
    enabled: !!companyId,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-full-report", companyId],
    queryFn: async () => {
      const { data } = await (supabase.from("products").select("*, product_categories(name, name_en), product_stock(quantity, avg_cost, warehouse_id, warehouses(branch_id, name, name_en))").eq("company_id", companyId!).eq("is_active", true).neq("product_type", "service") as any);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["movements-report", companyId],
    queryFn: async () => {
      const { data } = await (supabase.from("stock_movements").select("*, products(name, name_en), warehouses(name, name_en, branch_id)").eq("company_id", companyId!).order("movement_date", { ascending: false }).limit(1000) as any);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  // Fetch sales invoices for "items by customer" report
  const { data: salesInvoices = [] } = useQuery({
    queryKey: ["sales-invoices-items", companyId],
    queryFn: async () => {
      const { data } = await (supabase.from("invoices").select("items, contacts(name, name_en)").eq("company_id", companyId!).eq("invoice_type", "sale").neq("status", "draft") as any);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  // Fetch purchase invoices for "items by vendor" report
  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ["purchase-invoices-items", companyId],
    queryFn: async () => {
      const { data } = await (supabase.from("invoices").select("items, contacts(name, name_en)").eq("company_id", companyId!).eq("invoice_type", "purchase").neq("status", "draft") as any);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const formatCurrency = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const exportToExcelRaw = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  // Current stock with filtering
  const currentStock = useMemo(() => {
    return products.map((p: any) => {
      const stocks = (p.product_stock || []).filter((ps: any) => {
        if (branchFilter !== "all" && ps.warehouses?.branch_id !== branchFilter) return false;
        if (warehouseFilter !== "all" && ps.warehouse_id !== warehouseFilter) return false;
        return true;
      });
      const totalQty = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
      const totalValue = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0) * (ps.avg_cost || 0), 0);
      return { ...p, totalQty, totalValue };
    }).filter((p: any) => p.totalQty !== 0 || warehouseFilter === "all");
  }, [products, branchFilter, warehouseFilter]);

  // Price list
  const priceList = useMemo(() => {
    return products.map((p: any) => ({
      name: isRTL ? p.name : p.name_en || p.name,
      sku: p.sku || p.barcode || "-",
      category: p.product_categories ? (isRTL ? p.product_categories.name : p.product_categories.name_en || p.product_categories.name) : "-",
      buyPrice: p.purchase_price || 0,
      sellPrice: p.selling_price || 0,
      minPrice: p.min_selling_price || 0,
    })).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [products, isRTL]);

  // Dead stock (no movements in last 90 days)
  const deadStock = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const lastMovement: Record<string, Date> = {};
    movements.forEach((m: any) => {
      const d = new Date(m.movement_date);
      if (!lastMovement[m.product_id] || d > lastMovement[m.product_id]) lastMovement[m.product_id] = d;
    });
    return products.filter((p: any) => {
      const stocks = p.product_stock || [];
      const qty = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
      if (qty <= 0) return false;
      const last = lastMovement[p.id];
      return !last || last < cutoff;
    }).map((p: any) => {
      const stocks = p.product_stock || [];
      const qty = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
      const value = stocks.reduce((s: number, ps: any) => s + (ps.quantity || 0) * (ps.avg_cost || 0), 0);
      const lastDate = lastMovement[p.id];
      const days = lastDate ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      return { name: isRTL ? p.name : p.name_en || p.name, qty, value, lastDate: lastDate ? lastDate.toLocaleDateString() : "-", days };
    }).sort((a: any, b: any) => b.days - a.days);
  }, [products, movements, isRTL]);

  // Items by vendor
  const itemsByVendor = useMemo(() => {
    const map: Record<string, { vendor: string; items: { name: string; qty: number; total: number }[] }> = {};
    purchaseInvoices.forEach((inv: any) => {
      const vendor = inv.contacts ? (isRTL ? inv.contacts.name : inv.contacts.name_en || inv.contacts.name) : (isRTL ? "غير محدد" : "Unknown");
      if (!map[vendor]) map[vendor] = { vendor, items: [] };
      (inv.items || []).forEach((item: any) => {
        const existing = map[vendor].items.find((i: any) => i.name === (item.product_name || item.description));
        if (existing) { existing.qty += item.quantity || 0; existing.total += (item.quantity || 0) * (item.unit_price || 0); }
        else map[vendor].items.push({ name: item.product_name || item.description || "-", qty: item.quantity || 0, total: (item.quantity || 0) * (item.unit_price || 0) });
      });
    });
    return Object.values(map);
  }, [purchaseInvoices, isRTL]);

  // Items by customer
  const itemsByCustomer = useMemo(() => {
    const map: Record<string, { customer: string; items: { name: string; qty: number; total: number }[] }> = {};
    salesInvoices.forEach((inv: any) => {
      const customer = inv.contacts ? (isRTL ? inv.contacts.name : inv.contacts.name_en || inv.contacts.name) : (isRTL ? "غير محدد" : "Unknown");
      if (!map[customer]) map[customer] = { customer, items: [] };
      (inv.items || []).forEach((item: any) => {
        const existing = map[customer].items.find((i: any) => i.name === (item.product_name || item.description));
        if (existing) { existing.qty += item.quantity || 0; existing.total += (item.quantity || 0) * (item.unit_price || 0); }
        else map[customer].items.push({ name: item.product_name || item.description || "-", qty: item.quantity || 0, total: (item.quantity || 0) * (item.unit_price || 0) });
      });
    });
    return Object.values(map);
  }, [salesInvoices, isRTL]);

  const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <TableRow><TableCell colSpan={8} className="text-center py-16"><Icon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">{text}</p></TableCell></TableRow>
  );
  const LoadingSkeleton = ({ cols }: { cols: number }) => (<>{Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: cols }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)}</>);

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Package className="h-7 w-7 text-primary" />
          {isRTL ? "تقارير المخزون التفصيلية" : "Detailed Inventory Reports"}
        </h1>
        <p className="text-muted-foreground mt-1">{isRTL ? "تقارير شاملة للأصناف والمخزون" : "Comprehensive item and stock reports"}</p>
      </div>

      <Card><CardContent className="p-4">
        <div className={cn("flex flex-wrap gap-4 items-end", isRTL && "flex-row-reverse")}>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder={isRTL ? "الفرع" : "Branch"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? "جميع الفروع" : "All"}</SelectItem>
              {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder={isRTL ? "المستودع" : "Warehouse"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? "جميع المستودعات" : "All"}</SelectItem>
              {warehouses.map((w: any) => <SelectItem key={w.id} value={w.id}>{isRTL ? w.name : w.name_en || w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Tabs defaultValue={defaultTab} dir={isRTL ? "rtl" : "ltr"}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="stock">{isRTL ? "المخزون الحالي" : "Current Stock"}</TabsTrigger>
          <TabsTrigger value="pricelist">{isRTL ? "قائمة الأسعار" : "Price List"}</TabsTrigger>
          <TabsTrigger value="movements">{isRTL ? "حركة الأصناف" : "Movements"}</TabsTrigger>
          <TabsTrigger value="byvendor">{isRTL ? "حسب المورد" : "By Vendor"}</TabsTrigger>
          <TabsTrigger value="bycustomer">{isRTL ? "حسب العميل" : "By Customer"}</TabsTrigger>
          <TabsTrigger value="deadstock">{isRTL ? "المخزون الراكد" : "Dead Stock"}</TabsTrigger>
        </TabsList>

        {/* Current Stock */}
        <TabsContent value="stock" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{isRTL ? `${currentStock.length} صنف` : `${currentStock.length} items`}</p>
            <Button variant="outline" size="sm" onClick={() => exportToExcelRaw(currentStock.map((p: any) => ({ [isRTL ? "الصنف" : "Item"]: isRTL ? p.name : p.name_en || p.name, [isRTL ? "الكمية" : "Qty"]: p.totalQty, [isRTL ? "القيمة" : "Value"]: p.totalValue.toFixed(2) })), "current-stock")} className="gap-1"><Download className="h-4 w-4" />{isRTL ? "تصدير" : "Export"}</Button>
          </div>
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
            <TableHead>{isRTL ? "الرمز" : "SKU"}</TableHead>
            <TableHead>{isRTL ? "التصنيف" : "Category"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
            <TableHead className="text-end">{isRTL ? "القيمة" : "Value"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <LoadingSkeleton cols={5} /> : currentStock.length === 0 ? <EmptyState icon={Package} text={isRTL ? "لا توجد أصناف" : "No items"} /> :
            currentStock.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{isRTL ? p.name : p.name_en || p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.sku || p.barcode || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{p.product_categories ? (isRTL ? p.product_categories.name : p.product_categories.name_en || p.product_categories.name) : "-"}</TableCell>
                <TableCell className={cn("text-end tabular-nums font-medium", p.totalQty < 0 && "text-destructive")}>{p.totalQty}</TableCell>
                <TableCell className="text-end tabular-nums">{formatCurrency(p.totalValue)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        {/* Price List */}
        <TabsContent value="pricelist" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportToExcelRaw(priceList.map(p => ({ [isRTL ? "الصنف" : "Item"]: p.name, [isRTL ? "الرمز" : "SKU"]: p.sku, [isRTL ? "سعر الشراء" : "Buy"]: p.buyPrice, [isRTL ? "سعر البيع" : "Sell"]: p.sellPrice })), "price-list")} className="gap-1"><Download className="h-4 w-4" />{isRTL ? "تصدير" : "Export"}</Button>
          </div>
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
            <TableHead>{isRTL ? "الرمز" : "SKU"}</TableHead>
            <TableHead>{isRTL ? "التصنيف" : "Category"}</TableHead>
            <TableHead className="text-end">{isRTL ? "سعر الشراء" : "Buy Price"}</TableHead>
            <TableHead className="text-end">{isRTL ? "سعر البيع" : "Sell Price"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الحد الأدنى" : "Min Price"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {priceList.length === 0 ? <EmptyState icon={ListChecks} text={isRTL ? "لا توجد أصناف" : "No items"} /> :
            priceList.map((p: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                <TableCell className="text-muted-foreground">{p.category}</TableCell>
                <TableCell className="text-end tabular-nums">{formatCurrency(p.buyPrice)}</TableCell>
                <TableCell className="text-end tabular-nums font-medium">{formatCurrency(p.sellPrice)}</TableCell>
                <TableCell className="text-end tabular-nums text-muted-foreground">{formatCurrency(p.minPrice)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        {/* Movements */}
        <TabsContent value="movements" className="space-y-4">
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
            <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
            <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الرصيد" : "Balance"}</TableHead>
            <TableHead>{isRTL ? "المستودع" : "Warehouse"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {movements.length === 0 ? <EmptyState icon={BarChart3} text={isRTL ? "لا توجد حركات" : "No movements"} /> :
            movements.slice(0, 200).map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="text-muted-foreground">{new Date(m.movement_date).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{m.products ? (isRTL ? m.products.name : m.products.name_en || m.products.name) : "-"}</TableCell>
                <TableCell><Badge variant={m.quantity > 0 ? "default" : "destructive"} className="font-normal">{m.movement_type}</Badge></TableCell>
                <TableCell className={cn("text-end tabular-nums font-medium", m.quantity > 0 ? "text-emerald-600" : "text-destructive")}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                <TableCell className="text-end tabular-nums">{m.running_balance ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{m.warehouses ? (isRTL ? m.warehouses.name : m.warehouses.name_en || m.warehouses.name) : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        {/* By Vendor */}
        <TabsContent value="byvendor" className="space-y-4">
          {itemsByVendor.length === 0 ? <Card><CardContent className="py-16 text-center text-muted-foreground"><UserCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />{isRTL ? "لا توجد بيانات" : "No data"}</CardContent></Card> :
          itemsByVendor.map((group, i) => (
            <Card key={i}><CardHeader className="pb-2"><CardTitle className="text-base">{group.vendor}</CardTitle></CardHeader>
            <CardContent className="p-0"><Table><TableHeader><TableRow>
              <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
              <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
              <TableHead className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>{group.items.map((item: any, j: number) => (
              <TableRow key={j}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-end tabular-nums">{item.qty}</TableCell><TableCell className="text-end tabular-nums">{formatCurrency(item.total)}</TableCell></TableRow>
            ))}</TableBody></Table></CardContent></Card>
          ))}
        </TabsContent>

        {/* By Customer */}
        <TabsContent value="bycustomer" className="space-y-4">
          {itemsByCustomer.length === 0 ? <Card><CardContent className="py-16 text-center text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />{isRTL ? "لا توجد بيانات" : "No data"}</CardContent></Card> :
          itemsByCustomer.map((group, i) => (
            <Card key={i}><CardHeader className="pb-2"><CardTitle className="text-base">{group.customer}</CardTitle></CardHeader>
            <CardContent className="p-0"><Table><TableHeader><TableRow>
              <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
              <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
              <TableHead className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>{group.items.map((item: any, j: number) => (
              <TableRow key={j}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-end tabular-nums">{item.qty}</TableCell><TableCell className="text-end tabular-nums">{formatCurrency(item.total)}</TableCell></TableRow>
            ))}</TableBody></Table></CardContent></Card>
          ))}
        </TabsContent>

        {/* Dead Stock */}
        <TabsContent value="deadstock" className="space-y-4">
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
            <TableHead className="text-end">{isRTL ? "القيمة" : "Value"}</TableHead>
            <TableHead>{isRTL ? "آخر حركة" : "Last Movement"}</TableHead>
            <TableHead className="text-end">{isRTL ? "أيام الركود" : "Days Idle"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {deadStock.length === 0 ? <EmptyState icon={AlertTriangle} text={isRTL ? "لا يوجد مخزون راكد" : "No dead stock"} /> :
            deadStock.map((p: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-end tabular-nums">{p.qty}</TableCell>
                <TableCell className="text-end tabular-nums">{formatCurrency(p.value)}</TableCell>
                <TableCell className="text-muted-foreground">{p.lastDate}</TableCell>
                <TableCell className="text-end"><Badge variant={p.days > 180 ? "destructive" : "secondary"}>{p.days}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryDetailedReports;
