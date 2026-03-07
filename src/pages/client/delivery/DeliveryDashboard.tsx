import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, CheckCircle, XCircle, TrendingUp, Users } from "lucide-react";

const DeliveryDashboard = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["delivery-orders-dashboard", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("delivery_orders")
        .select("*, delivery_drivers(name, name_en)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["delivery-drivers-dashboard", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("delivery_drivers")
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const today = new Date().toISOString().split("T")[0];
  const todayOrders = orders.filter((o: any) => o.order_date === today);
  const pendingOrders = orders.filter((o: any) => o.status === "pending");
  const outForDelivery = orders.filter((o: any) => o.status === "out_for_delivery");
  const deliveredOrders = orders.filter((o: any) => o.status === "delivered");
  const cancelledOrders = orders.filter((o: any) => o.status === "cancelled");

  const totalRevenue = deliveredOrders.reduce((s: number, o: any) => s + (Number(o.order_total) || 0), 0);
  const deliveryRevenue = deliveredOrders.reduce((s: number, o: any) => s + (Number(o.delivery_fee) || 0), 0);

  // Top drivers by delivered count
  const driverMap: Record<string, { name: string; count: number }> = {};
  deliveredOrders.forEach((o: any) => {
    if (o.driver_id) {
      const dName = isRTL ? o.delivery_drivers?.name : (o.delivery_drivers?.name_en || o.delivery_drivers?.name);
      if (!driverMap[o.driver_id]) driverMap[o.driver_id] = { name: dName || "-", count: 0 };
      driverMap[o.driver_id].count++;
    }
  });
  const topDrivers = Object.values(driverMap).sort((a, b) => b.count - a.count).slice(0, 5);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const stats = [
    { icon: Package, label: isRTL ? "طلبات اليوم" : "Today's Orders", value: todayOrders.length, color: "text-primary" },
    { icon: Truck, label: isRTL ? "قيد التوصيل" : "Out for Delivery", value: outForDelivery.length, color: "text-orange-500" },
    { icon: CheckCircle, label: isRTL ? "تم التوصيل" : "Delivered", value: deliveredOrders.length, color: "text-green-500" },
    { icon: XCircle, label: isRTL ? "ملغاة" : "Cancelled", value: cancelledOrders.length, color: "text-destructive" },
    { icon: TrendingUp, label: isRTL ? "إيرادات التوصيل" : "Delivery Revenue", value: deliveryRevenue.toLocaleString(), color: "text-blue-500" },
    { icon: Users, label: isRTL ? "السائقين النشطين" : "Active Drivers", value: drivers.length, color: "text-purple-500" },
  ];

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "preparing": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "out_for_delivery": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "delivered": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "returned": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default: return "";
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, [string, string]> = {
      pending: ["معلق", "Pending"],
      preparing: ["قيد التحضير", "Preparing"],
      out_for_delivery: ["قيد التوصيل", "Out for Delivery"],
      delivered: ["تم التوصيل", "Delivered"],
      cancelled: ["ملغي", "Cancelled"],
      returned: ["مرتجع", "Returned"],
    };
    return isRTL ? map[s]?.[0] || s : map[s]?.[1] || s;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isRTL ? "لوحة تحكم التوصيل" : "Delivery Dashboard"}</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isRTL ? "آخر الطلبات" : "Recent Orders"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.slice(0, 8).map((o: any) => (
                <div key={o.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{o.order_number} - {o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.order_date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">{Number(o.order_total).toLocaleString()}</span>
                    <Badge variant="outline" className={statusColor(o.status)}>{statusLabel(o.status)}</Badge>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{isRTL ? "لا توجد طلبات" : "No orders yet"}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Top Drivers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isRTL ? "أفضل السائقين" : "Top Drivers"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDrivers.map((d, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center">{i + 1}</span>
                    <p className="text-sm font-medium">{d.name}</p>
                  </div>
                  <Badge variant="secondary">{d.count} {isRTL ? "توصيلة" : "deliveries"}</Badge>
                </div>
              ))}
              {topDrivers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{isRTL ? "لا توجد بيانات" : "No data yet"}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
