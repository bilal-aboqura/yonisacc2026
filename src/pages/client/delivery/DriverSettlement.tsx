import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Calculator, Wallet, Truck, TrendingUp, Package, DollarSign } from "lucide-react";
import { format } from "date-fns";

const DriverSettlement = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const [selectedDriver, setSelectedDriver] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, "yyyy-MM-dd");
  });
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: drivers = [] } = useQuery({
    queryKey: ["settlement-drivers", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("delivery_drivers")
        .select("id, name, name_en, phone")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["settlement-orders", companyId, selectedDriver, dateFrom, dateTo],
    queryFn: async () => {
      let query = (supabase as any)
        .from("delivery_orders")
        .select("*, delivery_drivers(name, name_en, phone)")
        .eq("company_id", companyId)
        .gte("order_date", dateFrom)
        .lte("order_date", dateTo)
        .in("status", ["delivered", "returned", "cancelled"]);

      if (selectedDriver !== "all") {
        query = query.eq("driver_id", selectedDriver);
      } else {
        query = query.not("driver_id", "is", null);
      }

      const { data } = await query.order("order_date", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Group by driver
  const driverSummaries = orders.reduce((acc: any, order: any) => {
    const dId = order.driver_id;
    if (!acc[dId]) {
      acc[dId] = {
        driverName: isRTL ? order.delivery_drivers?.name : (order.delivery_drivers?.name_en || order.delivery_drivers?.name),
        phone: order.delivery_drivers?.phone,
        totalOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        returnedOrders: 0,
        totalRevenue: 0,
        totalDeliveryFees: 0,
        totalCommission: 0,
        netPayable: 0,
        orders: [],
      };
    }
    acc[dId].totalOrders += 1;
    if (order.status === "delivered") {
      acc[dId].deliveredOrders += 1;
      acc[dId].totalRevenue += Number(order.order_total || 0);
      acc[dId].totalDeliveryFees += Number(order.delivery_fee || 0);
    }
    if (order.status === "cancelled") acc[dId].cancelledOrders += 1;
    if (order.status === "returned") acc[dId].returnedOrders += 1;
    acc[dId].totalCommission += Number(order.driver_commission || 0);
    acc[dId].orders.push(order);
    return acc;
  }, {});

  Object.values(driverSummaries).forEach((s: any) => {
    s.netPayable = s.totalCommission;
  });

  const summaryList = Object.entries(driverSummaries).map(([id, s]) => ({ driverId: id, ...(s as any) }));

  const totalCommission = summaryList.reduce((s, d) => s + d.totalCommission, 0);
  const totalDelivered = summaryList.reduce((s, d) => s + d.deliveredOrders, 0);
  const totalRevenue = summaryList.reduce((s, d) => s + d.totalRevenue, 0);
  const totalFees = summaryList.reduce((s, d) => s + d.totalDeliveryFees, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isRTL ? "تقفيل حساب السائقين" : "Driver Settlement"}</h1>
        <p className="text-sm text-muted-foreground">{isRTL ? "حساب عمولات السائقين وتقفيل حساباتهم" : "Calculate driver commissions and settle accounts"}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-1.5 flex-1">
              <Label>{isRTL ? "السائق" : "Driver"}</Label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "جميع السائقين" : "All Drivers"}</SelectItem>
                  {drivers.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{isRTL ? d.name : (d.name_en || d.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "طلبات مسلمة" : "Delivered"}</p>
              <p className="text-xl font-bold">{totalDelivered}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><TrendingUp className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الإيرادات" : "Total Revenue"}</p>
              <p className="text-xl font-bold">{totalRevenue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Truck className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "رسوم التوصيل" : "Delivery Fees"}</p>
              <p className="text-xl font-bold">{totalFees.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Wallet className="h-5 w-5 text-orange-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي العمولات" : "Total Commission"}</p>
              <p className="text-xl font-bold">{totalCommission.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Driver Summaries */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : summaryList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{isRTL ? "لا توجد بيانات" : "No data found"}</p>
            <p className="text-sm text-muted-foreground">{isRTL ? "لا توجد طلبات مكتملة في الفترة المحددة" : "No completed orders in the selected period"}</p>
          </CardContent>
        </Card>
      ) : (
        summaryList.map((driver) => (
          <Card key={driver.driverId}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <span>{driver.driverName}</span>
                  {driver.phone && <span className="text-sm text-muted-foreground font-normal">({driver.phone})</span>}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="default">{driver.deliveredOrders} {isRTL ? "مسلم" : "delivered"}</Badge>
                  {driver.cancelledOrders > 0 && <Badge variant="destructive">{driver.cancelledOrders} {isRTL ? "ملغي" : "cancelled"}</Badge>}
                  {driver.returnedOrders > 0 && <Badge variant="secondary">{driver.returnedOrders} {isRTL ? "مرتجع" : "returned"}</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted/40 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي المبيعات" : "Total Sales"}</p>
                  <p className="font-bold text-lg">{driver.totalRevenue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{isRTL ? "رسوم التوصيل" : "Delivery Fees"}</p>
                  <p className="font-bold text-lg">{driver.totalDeliveryFees.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{isRTL ? "العمولة المستحقة" : "Commission Due"}</p>
                  <p className="font-bold text-lg text-primary">{driver.totalCommission.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{isRTL ? "صافي المستحق" : "Net Payable"}</p>
                  <p className="font-bold text-lg text-green-600">{driver.netPayable.toFixed(2)}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "رقم الطلب" : "Order #"}</TableHead>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "العميل" : "Customer"}</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead>{isRTL ? "رسوم التوصيل" : "Del. Fee"}</TableHead>
                    <TableHead>{isRTL ? "العمولة" : "Commission"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driver.orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                      <TableCell className="text-sm">{o.order_date}</TableCell>
                      <TableCell className="text-sm">{o.customer_name}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === "delivered" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"} className="text-xs">
                          {o.status === "delivered" ? (isRTL ? "مسلم" : "Delivered") : o.status === "cancelled" ? (isRTL ? "ملغي" : "Cancelled") : (isRTL ? "مرتجع" : "Returned")}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{Number(o.order_total || 0).toFixed(2)}</TableCell>
                      <TableCell className="tabular-nums">{Number(o.delivery_fee || 0).toFixed(2)}</TableCell>
                      <TableCell className="tabular-nums font-medium text-primary">{Number(o.driver_commission || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default DriverSettlement;
