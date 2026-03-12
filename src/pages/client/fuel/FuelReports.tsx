import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Fuel, Users, Container } from "lucide-react";
import { format } from "date-fns";

const fuelLabels: Record<string, { ar: string; en: string }> = {
  gasoline_91: { ar: "بنزين 91", en: "Gasoline 91" },
  gasoline_95: { ar: "بنزين 95", en: "Gasoline 95" },
  diesel: { ar: "ديزل", en: "Diesel" },
};

const FuelReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  const { data: sales } = useQuery({
    queryKey: ["fuel-sales-report", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_sales")
        .select("*, fuel_customers(name), fuel_pumps(pump_number)")
        .eq("company_id", companyId)
        .gte("sale_date", dateFrom)
        .lte("sale_date", dateTo + "T23:59:59")
        .order("sale_date", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: tankRefills } = useQuery({
    queryKey: ["fuel-refills-report", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_tank_refills")
        .select("*, fuel_tanks(tank_name, fuel_type)")
        .eq("company_id", companyId)
        .gte("refill_date", dateFrom)
        .lte("refill_date", dateTo + "T23:59:59")
        .order("refill_date", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Sales summary by fuel type
  const salesByType: Record<string, { qty: number; total: number }> = {};
  (sales || []).forEach((s: any) => {
    if (!salesByType[s.fuel_type]) salesByType[s.fuel_type] = { qty: 0, total: 0 };
    salesByType[s.fuel_type].qty += Number(s.quantity);
    salesByType[s.fuel_type].total += Number(s.total_amount);
  });

  const totalSalesAmount = (sales || []).reduce((s: number, r: any) => s + Number(r.total_amount), 0);
  const totalLiters = (sales || []).reduce((s: number, r: any) => s + Number(r.quantity), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6" />
        {isRTL ? "تقارير محطة الوقود" : "Fuel Station Reports"}
      </h1>

      {/* Date filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label>{isRTL ? "من" : "From"}</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "إلى" : "To"}</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} dir="ltr" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المبيعات" : "Total Sales"}</p>
            <p className="text-2xl font-bold text-emerald-600">{totalSalesAmount.toLocaleString()} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي اللترات" : "Total Liters"}</p>
            <p className="text-2xl font-bold">{totalLiters.toLocaleString()} L</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">{isRTL ? "عدد العمليات" : "Transactions"}</p>
            <p className="text-2xl font-bold">{(sales || []).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales by fuel type */}
      <Card>
        <CardHeader><CardTitle>{isRTL ? "المبيعات حسب نوع الوقود" : "Sales by Fuel Type"}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(salesByType).map(([type, data]) => (
              <div key={type} className="p-4 rounded-lg border">
                <Badge variant="outline" className="mb-2">{isRTL ? fuelLabels[type]?.ar : fuelLabels[type]?.en}</Badge>
                <p className="text-lg font-bold">{data.total.toLocaleString()} SAR</p>
                <p className="text-sm text-muted-foreground">{data.qty.toLocaleString()} L</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">{isRTL ? "المبيعات" : "Sales"}</TabsTrigger>
          <TabsTrigger value="refills">{isRTL ? "تعبئة الخزانات" : "Tank Refills"}</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "العميل" : "Customer"}</TableHead>
                    <TableHead>{isRTL ? "المضخة" : "Pump"}</TableHead>
                    <TableHead>{isRTL ? "الوقود" : "Fuel"}</TableHead>
                    <TableHead>{isRTL ? "الكمية" : "Qty"}</TableHead>
                    <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead>{isRTL ? "الدفع" : "Payment"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sales || []).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{format(new Date(s.sale_date), "MM-dd HH:mm")}</TableCell>
                      <TableCell>{s.fuel_customers?.name || (isRTL ? "عميل نقدي" : "Walk-in")}</TableCell>
                      <TableCell>{s.fuel_pumps?.pump_number || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{isRTL ? fuelLabels[s.fuel_type]?.ar : fuelLabels[s.fuel_type]?.en}</Badge></TableCell>
                      <TableCell>{Number(s.quantity).toLocaleString()} L</TableCell>
                      <TableCell className="font-semibold">{Number(s.total_amount).toLocaleString()} SAR</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{s.payment_method === "wallet" ? (isRTL ? "محفظة" : "Wallet") : (isRTL ? "نقدي" : "Cash")}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refills">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "الخزان" : "Tank"}</TableHead>
                    <TableHead>{isRTL ? "الكمية" : "Qty"}</TableHead>
                    <TableHead>{isRTL ? "تكلفة اللتر" : "Unit Cost"}</TableHead>
                    <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead>{isRTL ? "المورد" : "Supplier"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tankRefills || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{format(new Date(r.refill_date), "yyyy-MM-dd")}</TableCell>
                      <TableCell>{r.fuel_tanks?.tank_name || "—"}</TableCell>
                      <TableCell>{Number(r.quantity).toLocaleString()} L</TableCell>
                      <TableCell>{Number(r.unit_cost).toFixed(2)} SAR</TableCell>
                      <TableCell className="font-semibold">{Number(r.total_cost).toLocaleString()} SAR</TableCell>
                      <TableCell>{r.supplier_name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FuelReports;
