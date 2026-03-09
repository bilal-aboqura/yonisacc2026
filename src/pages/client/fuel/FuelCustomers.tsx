import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { Users, Plus } from "lucide-react";

const FuelCustomers = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["fuel-customers", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fuel_customers")
        .select("*, fuel_wallets(balance)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const typeLabels: Record<string, { ar: string; en: string }> = {
    individual: { ar: "فرد", en: "Individual" },
    company: { ar: "شركة", en: "Company" },
    government: { ar: "حكومي", en: "Government" },
  };

  return (
    <DataTable
      title={isRTL ? "عملاء الوقود" : "Fuel Customers"}
      icon={<Users className="h-5 w-5" />}
      columns={[
        { key: "name", header: isRTL ? "الاسم" : "Name", render: (c: any) => (
          <div>
            <p className="font-medium">{c.name}</p>
            {c.name_en && <p className="text-xs text-muted-foreground">{c.name_en}</p>}
          </div>
        )},
        { key: "mobile", header: isRTL ? "الجوال" : "Mobile", render: (c: any) => c.mobile || "—" },
        { key: "type", header: isRTL ? "النوع" : "Type", render: (c: any) => (
          <Badge variant="outline">{isRTL ? typeLabels[c.customer_type]?.ar : typeLabels[c.customer_type]?.en}</Badge>
        )},
        { key: "plate", header: isRTL ? "رقم اللوحة" : "Plate", render: (c: any) => c.plate_number || "—" },
        { key: "wallet", header: isRTL ? "رصيد المحفظة" : "Wallet Balance", numeric: true, render: (c: any) => {
          const w = c.fuel_wallets?.[0];
          return w ? `${Number(w.balance).toLocaleString()} SAR` : "—";
        }},
        { key: "status", header: isRTL ? "الحالة" : "Status", render: (c: any) => (
          <StatusBadge config={{ label: c.status === "active" ? (isRTL ? "نشط" : "Active") : (isRTL ? "موقوف" : "Suspended"), variant: c.status === "active" ? "success" : "destructive" }} />
        )},
      ]}
      data={customers || []}
      isLoading={isLoading}
      rowKey={(c: any) => c.id}
      searchPlaceholder={isRTL ? "بحث بالاسم أو الجوال..." : "Search by name or mobile..."}
      onSearch={(c: any, term: string) => c.name?.toLowerCase().includes(term) || c.mobile?.includes(term) || c.plate_number?.includes(term)}
      createButton={{ label: isRTL ? "إضافة عميل" : "Add Customer", onClick: () => navigate("/client/fuel/customers/new") }}
      actions={[
        { label: isRTL ? "كشف حساب" : "Statement", onClick: (c: any) => navigate(`/client/fuel/customers/${c.id}/statement`) },
        { label: isRTL ? "تعديل" : "Edit", onClick: (c: any) => navigate(`/client/fuel/customers/${c.id}/edit`) },
      ]}
    />
  );
};

export default FuelCustomers;
