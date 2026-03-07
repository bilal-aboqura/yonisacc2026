import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart3, Truck, Users, TrendingUp, XCircle } from "lucide-react";

const DeliveryReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["delivery-reports", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("delivery_orders")
        .select("*, delivery_drivers(name, name_en)")
        .eq("company_id", companyId)
        .gte("order_date", dateFrom)
        .lte("order_date", dateTo)
        .order("order_date", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const delivered = orders.filter((o: any) => o.status === "delivered");
  const cancelled = orders.filter((o: any) => o.status === "cancelled");
  const totalRevenue = delivered.reduce((s: number, o: any) => s + (Number(o.order_total) || 0), 0);
  const totalDeliveryFees = delivered.reduce((s: number, o: any) => s + (Number(o.delivery_fee) || 0), 0);
  const totalCommissions = delivered.reduce((s: number, o: any) => s + (Number(o.driver_commission) || 0), 0);

  // By Driver
  const driverMap: Record<string, { name: string; orders: number; delivered: number; revenue: number; commission: number }> = {};
  orders.forEach((o: any) => {
    const did = o.driver_id || "unassigned";
    const dName = did === "unassigned"
      ? (isRTL ? "غير مسند" : "Unassigned")
      : (isRTL ? o.delivery_drivers?.name : (o.delivery_drivers?.name_en || o.delivery_drivers?.name)) || "-";
    if (!driverMap[did]) driverMap[did] = { name: dName, orders: 0, delivered: 0, revenue: 0, commission: 0 };
    driverMap[did].orders++;
    if (o.status === "delivered") {
      driverMap[did].delivered++;
      driverMap[did].revenue += Number(o.order_total) || 0;
      driverMap[did].commission += Number(o.driver_commission) || 0;
    }
  });
  const driverStats = Object.values(driverMap).sort((a, b) => b.delivered - a.delivered);

  // By Date
  const dateMap: Record<string, { total: number; delivered: number; cancelled: number; revenue: number }> = {};
  orders.forEach((o: any) => {
    if (!dateMap[o.order_date]) dateMap[o.order_date] = { total: 0, delivered: 0, cancelled: 0, revenue: 0 };
    dateMap[o.order_date].total++;
    if (o.status === "delivered") { dateMap[o.order_date].delivered++; dateMap[o.order_date].revenue += Number(o.order_total) || 0; }
    if (o.status === "cancelled") dateMap[o.order_date].cancelled++;
  });
  const dateStats = Object.entries(dateMap).sort((a, b) => b[0].localeCompare(a[0]));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isRTL ? "تقارير التوصيل" : "Delivery Reports"}</h1>

      {/* Date Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1"><Label>{isRTL ? "من" : "From"}</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label>{isRTL ? "إلى" : "To"}</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center"><BarChart3 className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-xl font-bold tabular-nums">{orders.length}</p><p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الطلبات" : "Total Orders"}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Truck className="h-5 w-5 mx-auto mb-1 text-green-500" /><p className="text-xl font-bold tabular-nums">{delivered.length}</p><p className="text-xs text-muted-foreground">{isRTL ? "تم التوصيل" : "Delivered"}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" /><p className="text-xl font-bold tabular-nums">{cancelled.length}</p><p className="text-xs text-muted-foreground">{isRTL ? "ملغاة" : "Cancelled"}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-5 w-5 mx-auto mb-1 text-blue-500" /><p className="text-xl font-bold tabular-nums">{totalRevenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الإيرادات" : "Total Revenue"}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Users className="h-5 w-5 mx-auto mb-1 text-purple-500" /><p className="text-xl font-bold tabular-nums">{totalCommissions.toLocaleString()}</p><p className="text-xs text-muted-foreground">{isRTL ? "العمولات" : "Commissions"}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">{isRTL ? "يومي" : "Daily"}</TabsTrigger>
          <TabsTrigger value="drivers">{isRTL ? "حسب السائق" : "By Driver"}</TabsTrigger>
          <TabsTrigger value="cancelled">{isRTL ? "الملغاة" : "Cancelled"}</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRTL ? "إجمالي" : "Total"}</TableHead>
                <TableHead>{isRTL ? "تم التوصيل" : "Delivered"}</TableHead>
                <TableHead>{isRTL ? "ملغاة" : "Cancelled"}</TableHead>
                <TableHead className="text-end">{isRTL ? "الإيرادات" : "Revenue"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {dateStats.map(([date, s], i) => (
                  <TableRow key={date} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                    <TableCell className="tabular-nums">{date}</TableCell>
                    <TableCell className="tabular-nums">{s.total}</TableCell>
                    <TableCell className="tabular-nums">{s.delivered}</TableCell>
                    <TableCell className="tabular-nums">{s.cancelled}</TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">{s.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="drivers">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{isRTL ? "السائق" : "Driver"}</TableHead>
                <TableHead>{isRTL ? "إجمالي الطلبات" : "Total Orders"}</TableHead>
                <TableHead>{isRTL ? "تم التوصيل" : "Delivered"}</TableHead>
                <TableHead>{isRTL ? "الإيرادات" : "Revenue"}</TableHead>
                <TableHead className="text-end">{isRTL ? "العمولة" : "Commission"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {driverStats.map((d, i) => (
                  <TableRow key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="tabular-nums">{d.orders}</TableCell>
                    <TableCell className="tabular-nums">{d.delivered}</TableCell>
                    <TableCell className="tabular-nums">{d.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">{d.commission.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="cancelled">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{isRTL ? "رقم الطلب" : "Order #"}</TableHead>
                <TableHead>{isRTL ? "العميل" : "Customer"}</TableHead>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead className="text-end">{isRTL ? "المبلغ" : "Amount"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {cancelled.map((o: any, i: number) => (
                  <TableRow key={o.id} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                    <TableCell className="font-medium tabular-nums">{o.order_number}</TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell className="tabular-nums">{o.order_date}</TableCell>
                    <TableCell className="text-end tabular-nums">{Number(o.order_total).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {cancelled.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد طلبات ملغاة" : "No cancelled orders"}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryReports;
