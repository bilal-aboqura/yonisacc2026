import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Gauge } from "lucide-react";

const fuelLabels: Record<string, { ar: string; en: string }> = {
  gasoline_91: { ar: "بنزين 91", en: "Gasoline 91" },
  gasoline_95: { ar: "بنزين 95", en: "Gasoline 95" },
  diesel: { ar: "ديزل", en: "Diesel" },
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
    <DataTable
      title={isRTL ? "إدارة المضخات" : "Pump Management"}
      icon={<Gauge className="h-5 w-5" />}
      columns={[
        { key: "number", header: isRTL ? "رقم المضخة" : "Pump #", render: (p: any) => <span className="font-mono font-semibold">{p.pump_number}</span> },
        { key: "fuel", header: isRTL ? "نوع الوقود" : "Fuel Type", render: (p: any) => (
          <Badge variant="outline">{isRTL ? fuelLabels[p.fuel_type]?.ar : fuelLabels[p.fuel_type]?.en}</Badge>
        )},
        { key: "tank", header: isRTL ? "الخزان" : "Tank", render: (p: any) => p.fuel_tanks?.tank_name || "—" },
        { key: "meter", header: isRTL ? "قراءة العداد" : "Meter Reading", numeric: true, render: (p: any) => Number(p.meter_reading || 0).toLocaleString() },
        { key: "status", header: isRTL ? "الحالة" : "Status", render: (p: any) => (
          <StatusBadge config={{ label: p.status === "active" ? (isRTL ? "نشطة" : "Active") : (isRTL ? "صيانة" : "Maintenance"), variant: p.status === "active" ? "success" : "warning" }} />
        )},
      ]}
      data={pumps || []}
      isLoading={isLoading}
      rowKey={(p: any) => p.id}
      createButton={{ label: isRTL ? "إضافة مضخة" : "Add Pump", onClick: () => navigate("/client/fuel/pumps/new") }}
      searchPlaceholder={isRTL ? "بحث..." : "Search..."}
      onSearch={(p: any, t: string) => p.pump_number?.includes(t)}
    />
  );
};

export default FuelPumps;
