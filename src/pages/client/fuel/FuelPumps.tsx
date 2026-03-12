import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Gauge, Plus, Wrench, Fuel } from "lucide-react";

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

const FuelPumps = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();

  const { data: pumps, isLoading } = useQuery({
    queryKey: ["fuel-pumps", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_pumps").select("*, fuel_tanks(tank_name)").eq("company_id", companyId).order("pump_number");
      return data || [];
    },
    enabled: !!companyId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gauge className="h-6 w-6" />
          {isRTL ? "إدارة المضخات" : "Pump Management"}
        </h1>
        <Button onClick={() => navigate("/client/fuel/pumps/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          {isRTL ? "إضافة مضخة" : "Add Pump"}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : !pumps?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Gauge className="h-12 w-12 mb-3 opacity-30" />
            <p>{isRTL ? "لا توجد مضخات" : "No pumps found"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pumps.map((pump: any) => {
            const isActive = pump.status === "active";
            return (
              <Card key={pump.id} className={`relative overflow-hidden transition-shadow hover:shadow-md ${!isActive ? "opacity-75" : ""}`}>
                {/* Fuel type color strip */}
                <div className={`h-1.5 ${fuelColors[pump.fuel_type] || "bg-muted"}`} />
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Fuel className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-bold text-lg leading-tight">#{pump.pump_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? fuelLabels[pump.fuel_type]?.ar : fuelLabels[pump.fuel_type]?.en}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isActive ? "default" : "secondary"} className={`text-xs ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}`}>
                      {isActive
                        ? (isRTL ? "نشطة" : "Active")
                        : (isRTL ? "صيانة" : "Maintenance")}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isRTL ? "الخزان" : "Tank"}</span>
                      <span className="font-medium">{pump.fuel_tanks?.tank_name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isRTL ? "قراءة العداد" : "Meter"}</span>
                      <span className="font-mono font-medium">{Number(pump.meter_reading || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {!isActive && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                      <Wrench className="h-3 w-3" />
                      {isRTL ? "تحت الصيانة" : "Under Maintenance"}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FuelPumps;
