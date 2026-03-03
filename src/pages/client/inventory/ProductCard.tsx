import { useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Warehouse, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const ProductCard = () => {
  const { id } = useParams<{ id: string }>();
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();

  const { data: product } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name, name_en), units(name, name_en, symbol)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stockByBranch = [] } = useQuery({
    queryKey: ["product-stock-branches", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_stock")
        .select("*, warehouses(name, name_en, branches(name, name_en))")
        .eq("product_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["product-movements", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, warehouses(name, name_en)")
        .eq("product_id", id!)
        .order("movement_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  if (!product) return <div className="p-6 text-center text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</div>;

  const totalQty = stockByBranch.reduce((s: number, ps: any) => s + (ps.quantity || 0), 0);
  const totalValue = stockByBranch.reduce((s: number, ps: any) => s + (ps.quantity || 0) * (ps.avg_cost || 0), 0);
  const avgCost = totalQty > 0 ? totalValue / totalQty : 0;

  // Calculate running balance for ledger
  let runningBalance = 0;
  const ledger = [...movements].reverse().map(m => {
    runningBalance += (m as any).quantity || 0;
    return { ...m, balance: runningBalance };
  }).reverse();

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

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
        <Package className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? product.name : (product as any).name_en || product.name}</h1>
          <p className="text-muted-foreground text-sm">{product.sku || ""} {product.barcode ? `• ${product.barcode}` : ""}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isRTL ? "الرصيد الإجمالي" : "Total Stock"}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalQty}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isRTL ? "متوسط التكلفة" : "Avg Cost"}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{avgCost.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isRTL ? "قيمة المخزون" : "Stock Value"}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isRTL ? "حد إعادة الطلب" : "Reorder Level"}</CardTitle></CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", totalQty < ((product as any).reorder_level || 0) && "text-destructive")}>
              {(product as any).reorder_level || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock by Branch */}
      <Card>
        <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}><Warehouse className="h-5 w-5" />{isRTL ? "الرصيد بالفروع" : "Stock by Branch"}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
                <TableHead className="text-center">{isRTL ? "الكمية" : "Qty"}</TableHead>
                <TableHead className="text-center">{isRTL ? "محجوز" : "Reserved"}</TableHead>
                <TableHead className={cn(isRTL ? "text-left" : "text-right")}>{isRTL ? "القيمة" : "Value"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockByBranch.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.warehouses?.branches ? (isRTL ? s.warehouses.branches.name : s.warehouses.branches.name_en || s.warehouses.branches.name) : (isRTL ? s.warehouses?.name : s.warehouses?.name_en || s.warehouses?.name)}</TableCell>
                  <TableCell className="text-center">{s.quantity || 0}</TableCell>
                  <TableCell className="text-center">{s.reserved_quantity || 0}</TableCell>
                  <TableCell className={cn(isRTL ? "text-left" : "text-right")}>{((s.quantity || 0) * (s.avg_cost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
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
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                <TableHead className="text-center">{isRTL ? "وارد" : "In"}</TableHead>
                <TableHead className="text-center">{isRTL ? "صادر" : "Out"}</TableHead>
                <TableHead className="text-center">{isRTL ? "الرصيد" : "Balance"}</TableHead>
                <TableHead>{isRTL ? "المرجع" : "Reference"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد حركات" : "No movements"}</TableCell></TableRow>
              ) : ledger.map((m: any) => {
                const qty = m.quantity || 0;
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.movement_date}</TableCell>
                    <TableCell>{movementTypeLabel(m.movement_type)}</TableCell>
                    <TableCell className="text-center text-green-600">{qty > 0 ? qty : ""}</TableCell>
                    <TableCell className="text-center text-red-600">{qty < 0 ? Math.abs(qty) : ""}</TableCell>
                    <TableCell className="text-center font-medium">{m.balance}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.reference_type || "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductCard;
