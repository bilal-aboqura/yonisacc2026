import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart3, ArrowLeft, ArrowRight, Building2, Users, Home, DollarSign } from "lucide-react";

const RealEstateReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["re-stats", companyId],
    queryFn: async () => {
      const [propsRes, unitsRes, tenantsRes, invoicesRes] = await Promise.all([
        (supabase as any).from("re_properties").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
        (supabase as any).from("re_units").select("id, status", { count: "exact" }).eq("company_id", companyId!),
        (supabase as any).from("re_tenants").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
        (supabase as any).from("re_rent_invoices").select("total_amount, paid_amount, payment_status").eq("company_id", companyId!),
      ]);

      const units = unitsRes.data || [];
      const invoices = invoicesRes.data || [];
      const totalRent = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const totalPaid = invoices.reduce((s: number, i: any) => s + (i.paid_amount || 0), 0);
      const occupiedUnits = units.filter((u: any) => u.status === "occupied").length;

      return {
        properties: propsRes.count || 0,
        totalUnits: unitsRes.count || 0,
        occupiedUnits,
        vacantUnits: (unitsRes.count || 0) - occupiedUnits,
        tenants: tenantsRes.count || 0,
        totalRent,
        totalPaid,
        outstanding: totalRent - totalPaid,
        occupancyRate: (unitsRes.count || 0) > 0 ? Math.round((occupiedUnits / (unitsRes.count || 1)) * 100) : 0,
      };
    },
    enabled: !!companyId,
  });

  const cards = [
    { icon: Building2, label: isRTL ? "العقارات" : "Properties", value: stats?.properties || 0, color: "text-blue-600" },
    { icon: Home, label: isRTL ? "إجمالي الوحدات" : "Total Units", value: stats?.totalUnits || 0, color: "text-green-600" },
    { icon: Home, label: isRTL ? "وحدات مشغولة" : "Occupied", value: stats?.occupiedUnits || 0, color: "text-primary" },
    { icon: Home, label: isRTL ? "وحدات شاغرة" : "Vacant", value: stats?.vacantUnits || 0, color: "text-orange-600" },
    { icon: Users, label: isRTL ? "المستأجرين" : "Tenants", value: stats?.tenants || 0, color: "text-purple-600" },
    { icon: DollarSign, label: isRTL ? "إجمالي الإيجارات" : "Total Rent", value: Number(stats?.totalRent || 0).toLocaleString(), color: "text-green-600" },
    { icon: DollarSign, label: isRTL ? "المحصّل" : "Collected", value: Number(stats?.totalPaid || 0).toLocaleString(), color: "text-primary" },
    { icon: DollarSign, label: isRTL ? "المتبقي" : "Outstanding", value: Number(stats?.outstanding || 0).toLocaleString(), color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            {isRTL ? "تقارير العقارات" : "Real Estate Reports"}
          </h1>
          <p className="text-sm text-muted-foreground">{isRTL ? "نظرة عامة على أداء المحفظة العقارية" : "Overview of your real estate portfolio performance"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <c.icon className={`h-8 w-8 ${c.color}`} />
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold tabular-nums">{c.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "نسبة الإشغال" : "Occupancy Rate"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${stats?.occupancyRate || 0}%` }} />
            </div>
            <span className="text-xl font-bold tabular-nums">{stats?.occupancyRate || 0}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealEstateReports;
