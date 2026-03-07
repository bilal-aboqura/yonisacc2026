import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, BarChart3, TrendingUp, Package, Car } from "lucide-react";
import { format } from "date-fns";

const AutoPartsReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return format(d, "yyyy-MM-dd");
  });
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // Sales by part
  const { data: salesByPart = [], isLoading: loadingSales } = useQuery({
    queryKey: ["ap-report-sales-part", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("invoice_items")
        .select("product_id, quantity, total, products(name, name_en, sku, oem_number)")
        .eq("company_id", companyId!)
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");
      
      const grouped: Record<string, { name: string; sku: string; oem: string; qty: number; total: number }> = {};
      (data || []).forEach((item: any) => {
        if (!item.product_id) return;
        if (!grouped[item.product_id]) {
          grouped[item.product_id] = {
            name: isRTL ? item.products?.name : (item.products?.name_en || item.products?.name) || "—",
            sku: item.products?.sku || "",
            oem: item.products?.oem_number || "",
            qty: 0,
            total: 0,
          };
        }
        grouped[item.product_id].qty += Number(item.quantity || 0);
        grouped[item.product_id].total += Number(item.total || 0);
      });

      return Object.values(grouped).sort((a, b) => b.total - a.total);
    },
    enabled: !!companyId,
  });

  // Inventory valuation
  const { data: inventoryVal = [], isLoading: loadingInv } = useQuery({
    queryKey: ["ap-report-inventory", companyId],
    queryFn: async () => {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, name_en, sku, oem_number, purchase_price, sale_price")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("name")
        .limit(200);

      const ids = (products || []).map((p: any) => p.id);
      if (!ids.length) return [];

      const { data: stock } = await (supabase as any)
        .from("warehouse_stock")
        .select("product_id, quantity")
        .eq("company_id", companyId!)
        .in("product_id", ids);

      const stockMap: Record<string, number> = {};
      (stock || []).forEach((s: any) => {
        stockMap[s.product_id] = (stockMap[s.product_id] || 0) + Number(s.quantity || 0);
      });

      return (products || []).map((p: any) => ({
        name: isRTL ? p.name : (p.name_en || p.name),
        sku: p.sku,
        oem: p.oem_number,
        qty: stockMap[p.id] || 0,
        cost: Number(p.purchase_price || 0),
        price: Number(p.sale_price || 0),
        value: (stockMap[p.id] || 0) * Number(p.purchase_price || 0),
      })).filter((p: any) => p.qty > 0).sort((a: any, b: any) => b.value - a.value);
    },
    enabled: !!companyId,
  });

  // Sales by brand (via compatibility)
  const { data: salesByBrand = [], isLoading: loadingBrand } = useQuery({
    queryKey: ["ap-report-brand", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const { data: items } = await (supabase as any)
        .from("invoice_items")
        .select("product_id, quantity, total")
        .eq("company_id", companyId!)
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");

      const productIds = [...new Set((items || []).map((i: any) => i.product_id).filter(Boolean))];
      if (!productIds.length) return [];

      const { data: compat } = await (supabase as any)
        .from("product_car_compatibility")
        .select("product_id, car_models(car_brands(name, name_en))")
        .in("product_id", productIds);

      const brandMap: Record<string, string> = {};
      (compat || []).forEach((c: any) => {
        const brandName = isRTL ? c.car_models?.car_brands?.name : (c.car_models?.car_brands?.name_en || c.car_models?.car_brands?.name);
        if (brandName) brandMap[c.product_id] = brandName;
      });

      const grouped: Record<string, { brand: string; qty: number; total: number }> = {};
      (items || []).forEach((item: any) => {
        const brand = brandMap[item.product_id] || (isRTL ? "غير محدد" : "Unspecified");
        if (!grouped[brand]) grouped[brand] = { brand, qty: 0, total: 0 };
        grouped[brand].qty += Number(item.quantity || 0);
        grouped[brand].total += Number(item.total || 0);
      });

      return Object.values(grouped).sort((a, b) => b.total - a.total);
    },
    enabled: !!companyId,
  });

  const totalInvValue = inventoryVal.reduce((s, i) => s + i.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isRTL ? "تقارير قطع الغيار" : "Auto Parts Reports"}</h1>
        <p className="text-sm text-muted-foreground">{isRTL ? "تحليل المبيعات والمخزون حسب القطعة والماركة" : "Sales and inventory analysis by part and brand"}</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "من تاريخ" : "From"}</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "إلى تاريخ" : "To"}</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales-part">
        <TabsList className="mb-4">
          <TabsTrigger value="sales-part" className="gap-1.5"><Package className="h-3.5 w-3.5" />{isRTL ? "مبيعات بالقطعة" : "Sales by Part"}</TabsTrigger>
          <TabsTrigger value="sales-brand" className="gap-1.5"><Car className="h-3.5 w-3.5" />{isRTL ? "مبيعات بالماركة" : "Sales by Brand"}</TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />{isRTL ? "تقييم المخزون" : "Inventory Valuation"}</TabsTrigger>
        </TabsList>

        <TabsContent value="sales-part">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {isRTL ? "المبيعات حسب القطعة" : "Sales by Part"}
                <Badge variant="secondary">{salesByPart.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSales ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRTL ? "القطعة" : "Part"}</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>OEM</TableHead>
                      <TableHead>{isRTL ? "الكمية" : "Qty"}</TableHead>
                      <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesByPart.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-sm">{p.sku || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{p.oem || "-"}</TableCell>
                        <TableCell className="tabular-nums">{p.qty}</TableCell>
                        <TableCell className="tabular-nums font-medium">{p.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {!salesByPart.length && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-brand">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                {isRTL ? "المبيعات حسب الماركة" : "Sales by Brand"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBrand ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRTL ? "الماركة" : "Brand"}</TableHead>
                      <TableHead>{isRTL ? "الكمية" : "Qty"}</TableHead>
                      <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesByBrand.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{b.brand}</TableCell>
                        <TableCell className="tabular-nums">{b.qty}</TableCell>
                        <TableCell className="tabular-nums font-medium">{b.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {!salesByBrand.length && (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {isRTL ? "تقييم المخزون" : "Inventory Valuation"}
                </span>
                <Badge variant="outline" className="text-base">{isRTL ? "الإجمالي" : "Total"}: {totalInvValue.toFixed(2)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInv ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRTL ? "القطعة" : "Part"}</TableHead>
                      <TableHead>OEM</TableHead>
                      <TableHead>{isRTL ? "الكمية" : "Qty"}</TableHead>
                      <TableHead>{isRTL ? "التكلفة" : "Cost"}</TableHead>
                      <TableHead>{isRTL ? "السعر" : "Price"}</TableHead>
                      <TableHead>{isRTL ? "القيمة" : "Value"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryVal.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-sm">{p.oem || "-"}</TableCell>
                        <TableCell className="tabular-nums">{p.qty}</TableCell>
                        <TableCell className="tabular-nums">{p.cost.toFixed(2)}</TableCell>
                        <TableCell className="tabular-nums">{p.price.toFixed(2)}</TableCell>
                        <TableCell className="tabular-nums font-medium">{p.value.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {!inventoryVal.length && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutoPartsReports;
