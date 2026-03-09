import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/ui/data-table";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const FuelWallets = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["fuel-wallets", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("fuel_wallets")
        .select("*, fuel_customers(name, name_en, mobile, plate_number)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  return (
    <DataTable
      title={isRTL ? "محافظ الوقود" : "Fuel Wallets"}
      icon={<Wallet className="h-5 w-5" />}
      columns={[
        { key: "customer", header: isRTL ? "العميل" : "Customer", render: (w: any) => (
          <div>
            <p className="font-medium">{w.fuel_customers?.name}</p>
            <p className="text-xs text-muted-foreground">{w.fuel_customers?.mobile || w.fuel_customers?.plate_number || ""}</p>
          </div>
        )},
        { key: "balance", header: isRTL ? "الرصيد" : "Balance", numeric: true, render: (w: any) => (
          <span className={Number(w.balance) > 0 ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
            {Number(w.balance).toLocaleString()} SAR
          </span>
        )},
        { key: "actions", header: "", render: (w: any) => (
          <Button size="sm" variant="outline" onClick={() => navigate(`/client/fuel/wallets/${w.id}/recharge`)}>
            {isRTL ? "شحن" : "Recharge"}
          </Button>
        )},
      ]}
      data={wallets || []}
      isLoading={isLoading}
      rowKey={(w: any) => w.id}
      searchPlaceholder={isRTL ? "بحث..." : "Search..."}
      onSearch={(w: any, t: string) => w.fuel_customers?.name?.toLowerCase().includes(t)}
    />
  );
};

export default FuelWallets;
