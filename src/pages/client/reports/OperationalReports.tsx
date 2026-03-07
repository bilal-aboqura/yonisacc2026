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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Factory, Download, Truck, Wrench, Flame, ClipboardList, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const OperationalReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "transfers";
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => { const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!).eq("is_active", true); return data || []; },
    enabled: !!companyId,
  });

  // Stock movements for operational reports
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["operational-movements", companyId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("stock_movements").select("*, products(name, name_en), warehouses(name, name_en, branch_id)").eq("company_id", companyId!).order("movement_date", { ascending: false }).limit(500);
      if (dateFrom) q = q.gte("movement_date", dateFrom);
      if (dateTo) q = q.lte("movement_date", dateTo);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Stock adjustments
  const { data: adjustments = [] } = useQuery({
    queryKey: ["stock-adjustments-report", companyId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("stock_adjustments").select("*, stock_adjustment_items(*, products(name, name_en))").eq("company_id", companyId!).order("adjustment_date", { ascending: false });
      if (dateFrom) q = q.gte("adjustment_date", dateFrom);
      if (dateTo) q = q.lte("adjustment_date", dateTo);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Stock transfers
  const { data: transfers = [] } = useQuery({
    queryKey: ["stock-transfers-report", companyId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("stock_transfers").select("*, stock_transfer_items(*, products(name, name_en)), source:warehouses!stock_transfers_source_warehouse_id_fkey(name, name_en), destination:warehouses!stock_transfers_destination_warehouse_id_fkey(name, name_en)").eq("company_id", companyId!).order("transfer_date", { ascending: false });
      if (dateFrom) q = q.gte("transfer_date", dateFrom);
      if (dateTo) q = q.lte("transfer_date", dateTo);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Internal consumptions
  const { data: consumptions = [] } = useQuery({
    queryKey: ["consumptions-report", companyId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("internal_consumptions").select("*, internal_consumption_items(*, products(name, name_en))").eq("company_id", companyId!).order("consumption_date", { ascending: false });
      if (dateFrom) q = q.gte("consumption_date", dateFrom);
      if (dateTo) q = q.lte("consumption_date", dateTo);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Manufacturing orders
  const { data: mfgOrders = [] } = useQuery({
    queryKey: ["manufacturing-report", companyId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("manufacturing_orders").select("*, products(name, name_en), manufacturing_order_items(*, products(name, name_en))").eq("company_id", companyId!).order("created_at", { ascending: false });
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
  });

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";

  const exportToExcelRaw = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  // Damaged items from adjustments
  const damagedItems = useMemo(() => {
    const items: any[] = [];
    adjustments.forEach((adj: any) => {
      if (adj.adjustment_type === "decrease" || adj.reason?.includes("تالف") || adj.reason?.toLowerCase().includes("damage")) {
        (adj.stock_adjustment_items || []).forEach((item: any) => {
          items.push({ date: adj.adjustment_date, product: item.products ? (isRTL ? item.products.name : item.products.name_en || item.products.name) : "-", qty: item.quantity, reason: adj.reason || adj.notes || "-", reference: adj.reference_number || "-" });
        });
      }
    });
    return items;
  }, [adjustments, isRTL]);

  // Manufacturing materials consumed
  const mfgMaterials = useMemo(() => {
    const items: any[] = [];
    mfgOrders.forEach((order: any) => {
      (order.manufacturing_order_items || []).forEach((item: any) => {
        items.push({ orderRef: order.order_number || order.id?.slice(0, 8), product: order.products ? (isRTL ? order.products.name : order.products.name_en || order.products.name) : "-", material: item.products ? (isRTL ? item.products.name : item.products.name_en || item.products.name) : "-", qty: item.quantity_required || item.quantity, status: order.status });
      });
    });
    return items;
  }, [mfgOrders, isRTL]);

  const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <TableRow><TableCell colSpan={8} className="text-center py-16"><Icon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">{text}</p></TableCell></TableRow>
  );
  const LoadingSkeleton = ({ cols }: { cols: number }) => (<>{Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: cols }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)}</>);

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Factory className="h-7 w-7 text-primary" />
          {isRTL ? "التقارير التشغيلية" : "Operational Reports"}
        </h1>
        <p className="text-muted-foreground mt-1">{isRTL ? "تقارير العمليات والتصنيع والتحويلات" : "Operations, manufacturing, and transfer reports"}</p>
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
          <div><label className="text-xs text-muted-foreground">{isRTL ? "من" : "From"}</label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" /></div>
          <div><label className="text-xs text-muted-foreground">{isRTL ? "إلى" : "To"}</label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" /></div>
        </div>
      </CardContent></Card>

      <Tabs defaultValue={defaultTab} dir={isRTL ? "rtl" : "ltr"}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="transfers">{isRTL ? "التحويلات" : "Transfers"}</TabsTrigger>
          <TabsTrigger value="consumptions">{isRTL ? "الاستهلاك الداخلي" : "Consumptions"}</TabsTrigger>
          <TabsTrigger value="damaged">{isRTL ? "الأصناف التالفة" : "Damaged"}</TabsTrigger>
          <TabsTrigger value="adjustments">{isRTL ? "التسويات" : "Adjustments"}</TabsTrigger>
          <TabsTrigger value="manufacturing">{isRTL ? "التصنيع" : "Manufacturing"}</TabsTrigger>
          <TabsTrigger value="mfg-materials">{isRTL ? "مواد التصنيع" : "Mfg Materials"}</TabsTrigger>
        </TabsList>

        {/* Transfers */}
        <TabsContent value="transfers" className="space-y-4">
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
            <TableHead>{isRTL ? "المرجع" : "Reference"}</TableHead>
            <TableHead>{isRTL ? "من مستودع" : "From"}</TableHead>
            <TableHead>{isRTL ? "إلى مستودع" : "To"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الأصناف" : "Items"}</TableHead>
            <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {transfers.length === 0 ? <EmptyState icon={Truck} text={isRTL ? "لا توجد تحويلات" : "No transfers"} /> :
            transfers.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground">{formatDate(t.transfer_date)}</TableCell>
                <TableCell className="font-medium">{t.reference_number || "-"}</TableCell>
                <TableCell>{t.source ? (isRTL ? t.source.name : t.source.name_en || t.source.name) : "-"}</TableCell>
                <TableCell>{t.destination ? (isRTL ? t.destination.name : t.destination.name_en || t.destination.name) : "-"}</TableCell>
                <TableCell className="text-end tabular-nums">{(t.stock_transfer_items || []).length}</TableCell>
                <TableCell><Badge variant={t.status === "completed" ? "default" : "outline"}>{t.status || "-"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        {/* Consumptions */}
        <TabsContent value="consumptions" className="space-y-4">
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
            <TableHead>{isRTL ? "المرجع" : "Reference"}</TableHead>
            <TableHead>{isRTL ? "القسم" : "Department"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الأصناف" : "Items"}</TableHead>
            <TableHead>{isRTL ? "ملاحظات" : "Notes"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {consumptions.length === 0 ? <EmptyState icon={Wrench} text={isRTL ? "لا توجد عمليات استهلاك" : "No consumptions"} /> :
            consumptions.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="text-muted-foreground">{formatDate(c.consumption_date)}</TableCell>
                <TableCell className="font-medium">{c.reference_number || "-"}</TableCell>
                <TableCell>{c.department || "-"}</TableCell>
                <TableCell className="text-end tabular-nums">{(c.internal_consumption_items || []).length}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">{c.notes || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        {/* Damaged */}
        <TabsContent value="damaged" className="space-y-4">
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
            <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
            <TableHead>{isRTL ? "السبب" : "Reason"}</TableHead>
            <TableHead>{isRTL ? "المرجع" : "Reference"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {damagedItems.length === 0 ? <EmptyState icon={Flame} text={isRTL ? "لا توجد أصناف تالفة" : "No damaged items"} /> :
            damagedItems.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">{formatDate(item.date)}</TableCell>
                <TableCell className="font-medium">{item.product}</TableCell>
                <TableCell className="text-end tabular-nums text-destructive">{item.qty}</TableCell>
                <TableCell className="text-muted-foreground">{item.reason}</TableCell>
                <TableCell>{item.reference}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        {/* Adjustments */}
        <TabsContent value="adjustments" className="space-y-4">
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
            <TableHead>{isRTL ? "المرجع" : "Reference"}</TableHead>
            <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الأصناف" : "Items"}</TableHead>
            <TableHead>{isRTL ? "السبب" : "Reason"}</TableHead>
            <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {adjustments.length === 0 ? <EmptyState icon={ClipboardList} text={isRTL ? "لا توجد تسويات" : "No adjustments"} /> :
            adjustments.map((adj: any) => (
              <TableRow key={adj.id}>
                <TableCell className="text-muted-foreground">{formatDate(adj.adjustment_date)}</TableCell>
                <TableCell className="font-medium">{adj.reference_number || "-"}</TableCell>
                <TableCell><Badge variant={adj.adjustment_type === "increase" ? "default" : "destructive"}>{adj.adjustment_type === "increase" ? (isRTL ? "زيادة" : "Increase") : (isRTL ? "نقص" : "Decrease")}</Badge></TableCell>
                <TableCell className="text-end tabular-nums">{(adj.stock_adjustment_items || []).length}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">{adj.reason || adj.notes || "-"}</TableCell>
                <TableCell><Badge variant={adj.status === "posted" ? "default" : "outline"}>{adj.status || "-"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        {/* Manufacturing */}
        <TabsContent value="manufacturing" className="space-y-4">
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "رقم الأمر" : "Order #"}</TableHead>
            <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
            <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
            <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {mfgOrders.length === 0 ? <EmptyState icon={Factory} text={isRTL ? "لا توجد أوامر تصنيع" : "No manufacturing orders"} /> :
            mfgOrders.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.order_number || o.id?.slice(0, 8)}</TableCell>
                <TableCell>{o.products ? (isRTL ? o.products.name : o.products.name_en || o.products.name) : "-"}</TableCell>
                <TableCell className="text-end tabular-nums">{o.quantity}</TableCell>
                <TableCell><Badge variant={o.status === "completed" ? "default" : o.status === "in_progress" ? "secondary" : "outline"}>{o.status || "-"}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(o.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        {/* Manufacturing Materials */}
        <TabsContent value="mfg-materials" className="space-y-4">
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "أمر التصنيع" : "Order"}</TableHead>
            <TableHead>{isRTL ? "المنتج النهائي" : "Final Product"}</TableHead>
            <TableHead>{isRTL ? "المادة الخام" : "Raw Material"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
            <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {mfgMaterials.length === 0 ? <EmptyState icon={Package} text={isRTL ? "لا توجد مواد" : "No materials"} /> :
            mfgMaterials.map((m, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{m.orderRef}</TableCell>
                <TableCell>{m.product}</TableCell>
                <TableCell>{m.material}</TableCell>
                <TableCell className="text-end tabular-nums">{m.qty}</TableCell>
                <TableCell><Badge variant="outline">{m.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OperationalReports;
