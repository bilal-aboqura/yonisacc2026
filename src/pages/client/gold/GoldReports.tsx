import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Weight, TrendingUp, Gem } from "lucide-react";

const GoldReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();

  // Stock by Weight report
  const { data: stockByKarat = [] } = useQuery({
    queryKey: ["gold-stock-karat", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("gold_items" as any)
        .select("karat, weight_grams, gold_cost, making_cost, stone_cost")
        .eq("company_id", companyId)
        .eq("is_active", true);
      if (!data) return [];

      const grouped: Record<string, { count: number; weight: number; value: number }> = {};
      (data as any[]).forEach((item: any) => {
        if (!grouped[item.karat]) grouped[item.karat] = { count: 0, weight: 0, value: 0 };
        grouped[item.karat].count++;
        grouped[item.karat].weight += Number(item.weight_grams) || 0;
        grouped[item.karat].value += (Number(item.gold_cost) || 0) + (Number(item.making_cost) || 0) + (Number(item.stone_cost) || 0);
      });
      return Object.entries(grouped).map(([karat, data]) => ({ karat, ...data }));
    },
    enabled: !!companyId,
  });

  // Sales profit report
  const { data: salesData = [] } = useQuery({
    queryKey: ["gold-sales-report", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("gold_sales_invoices" as any)
        .select("invoice_date, total_amount, total_weight, status")
        .eq("company_id", companyId)
        .eq("status", "confirmed")
        .order("invoice_date", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Daily sales grouped
  const dailySales = (salesData as any[]).reduce((acc: any, inv: any) => {
    const date = inv.invoice_date;
    if (!acc[date]) acc[date] = { count: 0, weight: 0, amount: 0 };
    acc[date].count++;
    acc[date].weight += Number(inv.total_weight) || 0;
    acc[date].amount += Number(inv.total_amount) || 0;
    return acc;
  }, {});

  const totalStockWeight = stockByKarat.reduce((s, i) => s + i.weight, 0);
  const totalStockValue = stockByKarat.reduce((s, i) => s + i.value, 0);
  const totalStockItems = stockByKarat.reduce((s, i) => s + i.count, 0);

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold">{isRTL ? "تقارير الذهب" : "Gold Reports"}</h1>
        <p className="text-muted-foreground">{isRTL ? "تقارير المخزون والمبيعات والأرباح" : "Stock, sales, and profit reports"}</p>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock" className="gap-1"><Weight className="h-4 w-4" />{isRTL ? "المخزون بالوزن" : "Stock by Weight"}</TabsTrigger>
          <TabsTrigger value="daily" className="gap-1"><BarChart3 className="h-4 w-4" />{isRTL ? "المبيعات اليومية" : "Daily Sales"}</TabsTrigger>
          <TabsTrigger value="making" className="gap-1"><Gem className="h-4 w-4" />{isRTL ? "أرباح المصنعية" : "Making Profit"}</TabsTrigger>
        </TabsList>

        {/* Stock by Weight */}
        <TabsContent value="stock">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card><CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{isRTL ? "عدد الأصناف" : "Items"}</p>
              <p className="text-2xl font-bold">{totalStockItems}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الوزن" : "Total Weight"}</p>
              <p className="text-2xl font-bold text-amber-600">{totalStockWeight.toFixed(2)} g</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي القيمة" : "Total Value"}</p>
              <p className="text-2xl font-bold text-green-600">{totalStockValue.toFixed(2)}</p>
            </CardContent></Card>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "العيار" : "Karat"}</TableHead>
                    <TableHead>{isRTL ? "عدد الأصناف" : "Items"}</TableHead>
                    <TableHead>{isRTL ? "الوزن (جرام)" : "Weight (g)"}</TableHead>
                    <TableHead>{isRTL ? "القيمة" : "Value"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockByKarat.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                  ) : stockByKarat.map((row) => (
                    <TableRow key={row.karat}>
                      <TableCell><Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{row.karat}</Badge></TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell className="font-semibold">{row.weight.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">{row.value.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Sales */}
        <TabsContent value="daily">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "عدد الفواتير" : "Invoices"}</TableHead>
                    <TableHead>{isRTL ? "الوزن" : "Weight"}</TableHead>
                    <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(dailySales).length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد مبيعات" : "No sales"}</TableCell></TableRow>
                  ) : Object.entries(dailySales).map(([date, data]: [string, any]) => (
                    <TableRow key={date}>
                      <TableCell className="font-medium">{date}</TableCell>
                      <TableCell>{data.count}</TableCell>
                      <TableCell>{data.weight.toFixed(2)} g</TableCell>
                      <TableCell className="font-semibold">{data.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Making Cost Profit */}
        <TabsContent value="making">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                {isRTL ? "تحليل أرباح المصنعية" : "Making Cost Profit Analysis"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {isRTL
                  ? "يتم حساب أرباح المصنعية من الفرق بين سعر البيع وتكلفة الذهب والأحجار. هذا التقرير يتطلب فواتير مبيعات مؤكدة."
                  : "Making cost profit is calculated from the difference between selling price and gold + stone costs. This report requires confirmed sales invoices."}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المبيعات" : "Total Sales"}</p>
                    <p className="text-2xl font-bold">{(salesData as any[]).reduce((s: number, i: any) => s + (Number(i.total_amount) || 0), 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{isRTL ? "عدد الفواتير المؤكدة" : "Confirmed Invoices"}</p>
                    <p className="text-2xl font-bold">{(salesData as any[]).length}</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GoldReports;
