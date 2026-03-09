import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useRBAC } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Warehouse, TrendingUp, Pencil, Trash2, Printer, FileSpreadsheet, ArrowRight, Loader2, Filter, Tag, Ruler, ShieldCheck, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

const ProductCard = () => {
  const { id } = useParams<{ id: string }>();
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { can } = useRBAC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState("all");

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, product_categories(name, name_en), units(name, name_en, symbol)").eq("id", id!).single();
      if (error) throw error; return data;
    },
    enabled: !!id,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-product", companyId],
    queryFn: async () => { const { data } = await supabase.from("branches").select("id, name, name_en, is_main").eq("company_id", companyId!).eq("is_active", true).order("is_main", { ascending: false }); return data || []; },
    enabled: !!companyId,
  });

  const { data: stockByBranch = [] } = useQuery({
    queryKey: ["product-stock-branches", id],
    queryFn: async () => { const { data, error } = await supabase.from("product_stock").select("*, warehouses(name, name_en, branch_id, branches(name, name_en))").eq("product_id", id!); if (error) throw error; return data || []; },
    enabled: !!id,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["product-movements", id],
    queryFn: async () => { const { data, error } = await supabase.from("stock_movements").select("*, warehouses(name, name_en, branch_id)").eq("product_id", id!).order("movement_date", { ascending: false }).limit(50); if (error) throw error; return data || []; },
    enabled: !!id,
  });

  const filteredStock = branchFilter === "all" ? stockByBranch : stockByBranch.filter((s: any) => s.warehouses?.branch_id === branchFilter);
  const filteredMovements = branchFilter === "all" ? movements : movements.filter((m: any) => m.warehouses?.branch_id === branchFilter);

  const deleteMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("products").delete().eq("id", id!); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); toast.success(isRTL ? "تم حذف المنتج" : "Product deleted"); navigate("/client/inventory"); },
    onError: () => toast.error(isRTL ? "فشل حذف المنتج" : "Failed to delete product"),
  });

  // Sparkline data (last 30 days cumulative)
  const sparklineData = useMemo(() => {
    if (filteredMovements.length === 0) return [];
    const sorted = [...filteredMovements].sort((a, b) => new Date(a.movement_date).getTime() - new Date(b.movement_date).getTime());
    let balance = 0;
    return sorted.map(m => {
      balance += (m as any).quantity || 0;
      return { date: (m as any).movement_date, balance };
    });
  }, [filteredMovements]);

  if (productLoading || !product) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-[88px]" />)}</div>
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  const canEdit = can("EDIT_PRODUCT");
  const canDelete = can("DELETE_PRODUCT");
  const totalQty = filteredStock.reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
  const totalValue = filteredStock.reduce((s: number, ps: any) => s + (ps.quantity || 0) * (ps.avg_cost || 0), 0);
  const avgCost = totalQty > 0 ? totalValue / totalQty : 0;

  let runningBalance = 0;
  const ledger = [...filteredMovements].reverse().map(m => { runningBalance += (m as any).quantity || 0; return { ...m, balance: runningBalance }; }).reverse();

  const movementTypeLabel = (type: string) => {
    const labels: Record<string, Record<string, string>> = {
      purchase: { ar: "شراء", en: "Purchase" }, sale: { ar: "بيع", en: "Sale" },
      adjustment_in: { ar: "تسوية ↑", en: "Adj. In" }, adjustment_out: { ar: "تسوية ↓", en: "Adj. Out" },
      transfer_in: { ar: "تحويل ←", en: "Transfer In" }, transfer_out: { ar: "تحويل →", en: "Transfer Out" },
      consumption: { ar: "استهلاك", en: "Consumption" },
      manufacturing_in: { ar: "تصنيع ←", en: "Mfg. In" }, manufacturing_out: { ar: "تصنيع →", en: "Mfg. Out" },
    };
    return isRTL ? labels[type]?.ar || type : labels[type]?.en || type;
  };

  const inboundTypes = ["purchase", "adjustment_in", "transfer_in", "manufacturing_in"];

  const handlePrint = () => {
    const container = document.getElementById("product-card-root");
    if (container) {
      container.classList.add("product-card-print");
      window.print();
      container.classList.remove("product-card-print");
    } else {
      window.print();
    }
  };
  const handleExportExcel = () => {
    const columns = [
      { header: isRTL ? "التاريخ" : "Date", key: "date", format: "text" as const },
      { header: isRTL ? "النوع" : "Type", key: "type", format: "text" as const },
      { header: isRTL ? "وارد" : "In", key: "in", format: "number" as const },
      { header: isRTL ? "صادر" : "Out", key: "out", format: "number" as const },
      { header: isRTL ? "الرصيد" : "Balance", key: "balance", format: "number" as const },
      { header: isRTL ? "المرجع" : "Reference", key: "ref", format: "text" as const },
    ];
    const rows = ledger.map((m: any) => {
      const qty = m.quantity || 0;
      return { date: m.movement_date, type: movementTypeLabel(m.movement_type), in: qty > 0 ? qty : 0, out: qty < 0 ? Math.abs(qty) : 0, balance: m.balance, ref: m.reference_type || "-" };
    });
    exportToExcel({ filename: `product-ledger-${product.sku || id}`, columns, rows, title: isRTL ? product.name : (product as any).name_en || product.name, subtitle: isRTL ? "سجل حركات المنتج" : "Product Stock Ledger" });
    toast.success(isRTL ? "تم التصدير" : "Exported");
  };

  const productTypeLabel = (t: string) => {
    const m: Record<string, string> = { stock: isRTL ? "مخزني" : "Stock", service: isRTL ? "خدمة" : "Service", manufacturing: isRTL ? "تصنيع" : "Manufacturing" };
    return m[t] || t;
  };

  return (
    <div id="product-card-root" className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={cn("flex items-center justify-between flex-wrap gap-3", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/inventory")}><ArrowRight className="h-5 w-5" /></Button>
          <Package className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? product.name : (product as any).name_en || product.name}</h1>
            <p className="text-muted-foreground text-sm">{product.sku || ""} {product.barcode ? `• ${product.barcode}` : ""}</p>
          </div>
        </div>
        <div className={cn("flex items-center gap-2 flex-wrap", isRTL && "flex-row-reverse")}>
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}><Printer className="h-4 w-4" />{isRTL ? "طباعة" : "Print"}</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}><FileSpreadsheet className="h-4 w-4" />{isRTL ? "تصدير" : "Export"}</Button>
          {canEdit && <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/client/inventory/edit/${id}`)}><Pencil className="h-4 w-4" />{isRTL ? "تعديل" : "Edit"}</Button>}
          {canDelete && <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" />{isRTL ? "حذف" : "Delete"}</Button>}
        </div>
      </div>

      {/* Product Meta Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Tag, label: isRTL ? "النوع" : "Type", value: productTypeLabel((product as any).product_type || "stock") },
          { icon: Layers, label: isRTL ? "التصنيف" : "Category", value: product.product_categories ? (isRTL ? product.product_categories.name : product.product_categories.name_en || product.product_categories.name) : "-" },
          { icon: Ruler, label: isRTL ? "الوحدة" : "Unit", value: product.units ? (isRTL ? product.units.name : product.units.name_en || product.units.name) + (product.units.symbol ? ` (${product.units.symbol})` : "") : "-" },
          { icon: ShieldCheck, label: isRTL ? "خاضع للضريبة" : "Taxable", value: (product as any).is_taxable !== false ? (isRTL ? "نعم" : "Yes") : (isRTL ? "لا" : "No") },
        ].map(({ icon: Icon, label, value }, i) => (
          <Card key={i}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="rounded-lg p-2 bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></div>
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-semibold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Branch Filter */}
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder={isRTL ? "الفرع" : "Branch"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الفروع" : "All Branches"}</SelectItem>
                {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}{b.is_main ? (isRTL ? " (رئيسي)" : " (Main)") : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats + Sparkline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          {[
            { title: isRTL ? "الرصيد الإجمالي" : "Total Stock", value: totalQty },
            { title: isRTL ? "متوسط التكلفة" : "Avg Cost", value: avgCost.toFixed(2) },
            { title: isRTL ? "قيمة المخزون" : "Stock Value", value: totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
            { title: isRTL ? "حد إعادة الطلب" : "Reorder Level", value: (product as any).reorder_level || (product as any).min_stock || 0, isDanger: totalQty < ((product as any).reorder_level || (product as any).min_stock || 0) },
          ].map((stat, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{stat.title}</CardTitle></CardHeader>
              <CardContent><div className={cn("text-2xl font-bold tabular-nums", (stat as any).isDanger && "text-destructive")}>{stat.value}</div></CardContent>
            </Card>
          ))}
        </div>
        {sparklineData.length > 1 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isRTL ? "اتجاه المخزون" : "Stock Trend"}</CardTitle></CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip formatter={(v: number) => [v, isRTL ? "الرصيد" : "Balance"]} labelFormatter={(l) => l} />
                  <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" fill="url(#stockGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stock by Branch */}
      <Card>
        <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}><Warehouse className="h-5 w-5" />{isRTL ? "الرصيد بالفروع" : "Stock by Branch"}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
              <TableHead className="text-center">{isRTL ? "الكمية" : "Qty"}</TableHead>
              <TableHead className="text-center">{isRTL ? "محجوز" : "Reserved"}</TableHead>
              <TableHead className={cn(isRTL ? "text-left" : "text-right")}>{isRTL ? "القيمة" : "Value"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredStock.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{isRTL ? "لا يوجد مخزون" : "No stock"}</TableCell></TableRow>
              ) : filteredStock.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.warehouses?.branches ? (isRTL ? s.warehouses.branches.name : s.warehouses.branches.name_en || s.warehouses.branches.name) : (isRTL ? s.warehouses?.name : s.warehouses?.name_en || s.warehouses?.name)}</TableCell>
                  <TableCell className="text-center tabular-nums">{s.quantity || 0}</TableCell>
                  <TableCell className="text-center tabular-nums">{s.reserved_quantity || 0}</TableCell>
                  <TableCell className={cn("tabular-nums", isRTL ? "text-left" : "text-right")}>{((s.quantity || 0) * (s.avg_cost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stock Ledger */}
      <Card>
        <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}><TrendingUp className="h-5 w-5" />{isRTL ? "سجل الحركات (Stock Ledger)" : "Stock Ledger"}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
              <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
              <TableHead className="text-center">{isRTL ? "وارد" : "In"}</TableHead>
              <TableHead className="text-center">{isRTL ? "صادر" : "Out"}</TableHead>
              <TableHead className="text-center">{isRTL ? "الرصيد" : "Balance"}</TableHead>
              <TableHead>{isRTL ? "المرجع" : "Reference"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {ledger.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد حركات" : "No movements"}</TableCell></TableRow>
              ) : ledger.map((m: any) => {
                const qty = m.quantity || 0;
                const isInbound = inboundTypes.includes(m.movement_type);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">{m.movement_date}</TableCell>
                    <TableCell>
                      <Badge variant={isInbound ? "default" : "destructive"} className="font-normal">
                        {movementTypeLabel(m.movement_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{qty > 0 ? qty : ""}</TableCell>
                    <TableCell className="text-center tabular-nums text-destructive font-medium">{qty < 0 ? Math.abs(qty) : ""}</TableCell>
                    <TableCell className="text-center tabular-nums font-semibold">{m.balance}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.reference_type || "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{isRTL ? "تأكيد الحذف" : "Confirm Delete"}</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">{isRTL ? `هل أنت متأكد من حذف "${product.name}"؟ هذا الإجراء لا يمكن التراجع عنه.` : `Are you sure you want to delete "${(product as any).name_en || product.name}"? This cannot be undone.`}</p>
          <DialogFooter className={cn(isRTL && "flex-row-reverse")}>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRTL ? "حذف" : "Delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductCard;
