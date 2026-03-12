import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Container, Plus, Droplets, AlertTriangle } from "lucide-react";

const fuelLabels: Record<string, { ar: string; en: string }> = {
  gasoline_91: { ar: "بنزين 91", en: "Gasoline 91" },
  gasoline_95: { ar: "بنزين 95", en: "Gasoline 95" },
  diesel: { ar: "ديزل", en: "Diesel" },
};

const fuelColors: Record<string, string> = {
  gasoline_91: "bg-emerald-500",
  gasoline_95: "bg-blue-500",
  diesel: "bg-amber-600",
};

const FuelTanks = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();

  const { data: tanks, isLoading } = useQuery({
    queryKey: ["fuel-tanks", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_tanks").select("*").eq("company_id", companyId).order("created_at");
      return data || [];
    },
    enabled: !!companyId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Container className="h-6 w-6" />
          {isRTL ? "إدارة الخزانات" : "Tank Management"}
        </h1>
        <Button onClick={() => navigate("/client/fuel/tanks/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          {isRTL ? "إضافة خزان" : "Add Tank"}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : !tanks?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Container className="h-12 w-12 mb-3 opacity-30" />
            <p>{isRTL ? "لا توجد خزانات" : "No tanks found"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tanks.map((tank: any) => {
            const pct = tank.capacity > 0 ? (tank.current_qty / tank.capacity) * 100 : 0;
            const isLow = tank.current_qty <= tank.min_alert_level;
            const isActive = tank.is_active;

            return (
              <Card key={tank.id} className={`relative overflow-hidden transition-shadow hover:shadow-md ${!isActive ? "opacity-60" : ""}`}>
                <div className={`h-1.5 ${fuelColors[tank.fuel_type] || "bg-muted"}`} />
                <CardContent className="pt-4 pb-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Droplets className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-bold leading-tight">{tank.tank_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? fuelLabels[tank.fuel_type]?.ar : fuelLabels[tank.fuel_type]?.en}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isActive ? "default" : "secondary"} className={`text-xs ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}`}>
                      {isActive ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}
                    </Badge>
                  </div>

                  {/* Level */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{isRTL ? "المستوى" : "Level"}</span>
                      <span className={`font-bold ${isLow ? "text-destructive" : ""}`}>{pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct} className={`h-3 ${isLow ? "[&>div]:bg-destructive" : ""}`} />
                    <p className={`text-xs ${isLow ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {Number(tank.current_qty).toLocaleString()} / {Number(tank.capacity).toLocaleString()} L
                    </p>
                  </div>

                  {/* Alert level */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isRTL ? "حد التنبيه" : "Alert Level"}</span>
                    <span>{Number(tank.min_alert_level).toLocaleString()} L</span>
                  </div>

                  {isLow && (
                    <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {isRTL ? "المستوى منخفض!" : "Low level!"}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/client/fuel/tanks/${tank.id}/refill`)}
                  >
                    <Droplets className="h-4 w-4 me-1" />
                    {isRTL ? "تعبئة" : "Refill"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FuelTanks;
