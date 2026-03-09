import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Container } from "lucide-react";

const fuelLabels: Record<string, { ar: string; en: string }> = {
  gasoline_91: { ar: "بنزين 91", en: "Gasoline 91" },
  gasoline_95: { ar: "بنزين 95", en: "Gasoline 95" },
  diesel: { ar: "ديزل", en: "Diesel" },
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
    <DataTable
      title={isRTL ? "إدارة الخزانات" : "Tank Management"}
      icon={<Container className="h-5 w-5" />}
      columns={[
        { key: "name", header: isRTL ? "اسم الخزان" : "Tank Name", render: (t: any) => <span className="font-medium">{t.tank_name}</span> },
        { key: "fuel", header: isRTL ? "نوع الوقود" : "Fuel Type", render: (t: any) => (
          <Badge variant="outline">{isRTL ? fuelLabels[t.fuel_type]?.ar : fuelLabels[t.fuel_type]?.en}</Badge>
        )},
        { key: "level", header: isRTL ? "المستوى" : "Level", render: (t: any) => {
          const pct = t.capacity > 0 ? (t.current_qty / t.capacity) * 100 : 0;
          const isLow = t.current_qty <= t.min_alert_level;
          return (
            <div className="w-32 space-y-1">
              <Progress value={pct} className={isLow ? "[&>div]:bg-destructive" : ""} />
              <p className={`text-xs ${isLow ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {Number(t.current_qty).toLocaleString()} / {Number(t.capacity).toLocaleString()} L
              </p>
            </div>
          );
        }},
        { key: "alert", header: isRTL ? "حد التنبيه" : "Alert Level", numeric: true, render: (t: any) => `${Number(t.min_alert_level).toLocaleString()} L` },
        { key: "status", header: isRTL ? "الحالة" : "Status", render: (t: any) => (
          <StatusBadge config={{ label: t.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive"), variant: t.is_active ? "success" : "secondary" }} />
        )},
      ]}
      data={tanks || []}
      isLoading={isLoading}
      rowKey={(t: any) => t.id}
      createButton={{ label: isRTL ? "إضافة خزان" : "Add Tank", onClick: () => navigate("/client/fuel/tanks/new") }}
      actions={[
        { label: isRTL ? "تعبئة" : "Refill", onClick: (t: any) => navigate(`/client/fuel/tanks/${t.id}/refill`) },
      ]}
      searchPlaceholder={isRTL ? "بحث..." : "Search..."}
      onSearch={(t: any, term: string) => t.tank_name?.toLowerCase().includes(term)}
    />
  );
};

export default FuelTanks;
