import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, DollarSign, Clock, AlertTriangle, FileText, CheckCircle } from "lucide-react";

const HRDashboard = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-dashboard", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_employees").select("*, hr_departments(name, name_en)")
        .eq("company_id", companyId).eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const now = new Date();
  const in30 = new Date(Date.now() + 30 * 86400000);
  const in60 = new Date(Date.now() + 60 * 86400000);
  const in90 = new Date(Date.now() + 90 * 86400000);

  const expiredContracts = employees.filter((e: any) => e.contract_end_date && new Date(e.contract_end_date) < now);
  const expiring30 = employees.filter((e: any) => {
    if (!e.contract_end_date) return false;
    const d = new Date(e.contract_end_date);
    return d >= now && d <= in30;
  });
  const expiring60 = employees.filter((e: any) => {
    if (!e.contract_end_date) return false;
    const d = new Date(e.contract_end_date);
    return d > in30 && d <= in60;
  });
  const expiring90 = employees.filter((e: any) => {
    if (!e.contract_end_date) return false;
    const d = new Date(e.contract_end_date);
    return d > in60 && d <= in90;
  });
  const noContract = employees.filter((e: any) => !e.contract_end_date);

  const totalSalary = employees.reduce((s: number, e: any) =>
    s + (e.basic_salary || 0) + (e.housing_allowance || 0) + (e.transport_allowance || 0) + (e.other_allowance || 0), 0);

  const stats = [
    { icon: Users, label: isRTL ? "إجمالي الموظفين" : "Total Employees", value: employees.length, color: "text-primary" },
    { icon: DollarSign, label: isRTL ? "إجمالي الرواتب" : "Total Payroll", value: totalSalary.toLocaleString(), color: "text-emerald-600" },
    { icon: AlertTriangle, label: isRTL ? "عقود منتهية" : "Expired Contracts", value: expiredContracts.length, color: "text-destructive" },
    { icon: Clock, label: isRTL ? "تنتهي خلال 30 يوم" : "Expiring in 30d", value: expiring30.length, color: "text-orange-500" },
  ];

  const urgentAlerts = [...expiredContracts, ...expiring30].sort((a: any, b: any) =>
    new Date(a.contract_end_date).getTime() - new Date(b.contract_end_date).getTime()
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isRTL ? "لوحة تحكم الموارد البشرية" : "HR Dashboard"}
      </h1>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contract Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isRTL ? "ملخص العقود" : "Contract Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                <span className="text-sm font-medium">{isRTL ? "عقود منتهية" : "Expired Contracts"}</span>
                <Badge variant="destructive">{expiredContracts.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10">
                <span className="text-sm font-medium">{isRTL ? "تنتهي خلال 30 يوم" : "Expiring within 30 days"}</span>
                <Badge className="bg-orange-500 text-white">{expiring30.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10">
                <span className="text-sm font-medium">{isRTL ? "تنتهي خلال 60 يوم" : "Expiring within 60 days"}</span>
                <Badge className="bg-yellow-500 text-white">{expiring60.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
                <span className="text-sm font-medium">{isRTL ? "تنتهي خلال 90 يوم" : "Expiring within 90 days"}</span>
                <Badge className="bg-blue-500 text-white">{expiring90.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm font-medium">{isRTL ? "بدون عقد محدد" : "No contract set"}</span>
                <Badge variant="secondary">{noContract.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10">
                <span className="text-sm font-medium">{isRTL ? "عقود سارية" : "Active Contracts"}</span>
                <Badge className="bg-emerald-500 text-white">
                  {employees.length - expiredContracts.length - noContract.length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {isRTL ? "تنبيهات انتهاء العقود" : "Contract Expiry Alerts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {urgentAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
                <p>{isRTL ? "لا توجد تنبيهات حالياً" : "No alerts at this time"}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {urgentAlerts.map((emp: any) => {
                  const endDate = new Date(emp.contract_end_date);
                  const isExpired = endDate < now;
                  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);

                  return (
                    <div key={emp.id} className={`flex items-center justify-between p-3 rounded-lg border ${isExpired ? "border-destructive/50 bg-destructive/5" : "border-orange-500/50 bg-orange-500/5"}`}>
                      <div>
                        <p className="font-medium text-sm">{isRTL ? emp.name : (emp.name_en || emp.name)}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.employee_number} • {isRTL ? emp.job_title : (emp.job_title_en || emp.job_title) || "—"}
                        </p>
                      </div>
                      <div className="text-end">
                        <Badge variant={isExpired ? "destructive" : "outline"} className={!isExpired ? "border-orange-500 text-orange-500" : ""}>
                          {isExpired
                            ? (isRTL ? `منتهي منذ ${Math.abs(daysLeft)} يوم` : `Expired ${Math.abs(daysLeft)}d ago`)
                            : (isRTL ? `متبقي ${daysLeft} يوم` : `${daysLeft}d left`)}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{emp.contract_end_date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HRDashboard;
