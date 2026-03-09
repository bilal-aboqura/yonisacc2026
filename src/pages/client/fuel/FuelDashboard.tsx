import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, Users, Gauge, Container, TrendingUp, Wallet, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FuelDashboard = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["fuel-dashboard-stats", companyId],
    queryFn: async () => {
      const [customers, pumps, tanks, todaySales] = await Promise.all([
        (supabase as any).from("fuel_customers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        (supabase as any).from("fuel_pumps").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        (supabase as any).from("fuel_tanks").select("id, current_qty, min_alert_level, capacity").eq("company_id", companyId),
        (supabase as any).from("fuel_sales").select("total_amount").eq("company_id", companyId).gte("sale_date", new Date().toISOString().split("T")[0]),
      ]);
      const tanksData = tanks.data || [];
      const lowTanks = tanksData.filter((t: any) => t.current_qty <= t.min_alert_level);
      const todayTotal = (todaySales.data || []).reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
      return {
        customerCount: customers.count || 0,
        pumpCount: pumps.count || 0,
        tankCount: tanksData.length,
        lowTankCount: lowTanks.length,
        todaySales: todayTotal,
      };
    },
    enabled: !!companyId,
  });

  const cards = [
    { icon: Users, label: isRTL ? "العملاء" : "Customers", value: stats?.customerCount ?? 0, color: "text-blue-600", path: "/client/fuel/customers" },
    { icon: Gauge, label: isRTL ? "المضخات" : "Pumps", value: stats?.pumpCount ?? 0, color: "text-emerald-600", path: "/client/fuel/pumps" },
    { icon: Container, label: isRTL ? "الخزانات" : "Tanks", value: stats?.tankCount ?? 0, color: "text-indigo-600", path: "/client/fuel/tanks" },
    { icon: TrendingUp, label: isRTL ? "مبيعات اليوم" : "Today's Sales", value: `${(stats?.todaySales ?? 0).toLocaleString()} SAR`, color: "text-amber-600", path: "/client/fuel/reports" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fuel className="h-6 w-6" />
            {isRTL ? "لوحة تحكم محطة الوقود" : "Fuel Station Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? "نظرة عامة على عمليات المحطة" : "Overview of station operations"}
          </p>
        </div>
        <Button onClick={() => navigate("/client/fuel/pos")} className="gap-2">
          <Fuel className="h-4 w-4" />
          {isRTL ? "نقطة البيع" : "Fuel POS"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(c.path)}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold mt-1">{c.value}</p>
                </div>
                <c.icon className={`h-8 w-8 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(stats?.lowTankCount ?? 0) > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">
                  {isRTL ? `تنبيه: ${stats?.lowTankCount} خزان بمستوى منخفض` : `Alert: ${stats?.lowTankCount} tank(s) at low level`}
                </p>
                <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate("/client/fuel/tanks")}>
                  {isRTL ? "عرض الخزانات" : "View Tanks"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FuelDashboard;
