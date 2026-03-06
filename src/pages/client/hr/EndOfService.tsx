import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Award, Calculator } from "lucide-react";

const EndOfService = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const [selectedEmpId, setSelectedEmpId] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-all", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_employees").select("*").eq("company_id", companyId);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const selectedEmp = employees.find((e: any) => e.id === selectedEmpId);

  // Saudi Labor Law EOS Calculation
  const calculateEOS = (emp: any) => {
    if (!emp) return null;
    const hireDate = new Date(emp.hire_date);
    const endDate = emp.termination_date ? new Date(emp.termination_date) : new Date();
    const diffMs = endDate.getTime() - hireDate.getTime();
    const totalYears = diffMs / (365.25 * 24 * 60 * 60 * 1000);
    const totalMonths = Math.floor(totalYears * 12);

    const monthlySalary = (emp.basic_salary || 0) + (emp.housing_allowance || 0) + (emp.transport_allowance || 0) + (emp.other_allowance || 0);
    const dailyRate = monthlySalary / 30;

    // First 5 years: half month per year
    // After 5 years: full month per year
    let eos = 0;
    if (totalYears <= 5) {
      eos = (totalYears * monthlySalary) / 2;
    } else {
      eos = (5 * monthlySalary) / 2 + ((totalYears - 5) * monthlySalary);
    }

    return {
      totalYears: totalYears.toFixed(1),
      totalMonths,
      monthlySalary,
      dailyRate: dailyRate.toFixed(2),
      eosAmount: Math.round(eos),
      hireDate: emp.hire_date,
      endDate: emp.termination_date || new Date().toISOString().split("T")[0],
    };
  };

  const eos = calculateEOS(selectedEmp);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isRTL ? "مكافأة نهاية الخدمة" : "End of Service Benefits"}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />{isRTL ? "حاسبة نهاية الخدمة" : "EOS Calculator"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label>{isRTL ? "اختر الموظف" : "Select Employee"}</Label>
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
              <SelectTrigger><SelectValue placeholder={isRTL ? "اختر موظف" : "Select employee"} /></SelectTrigger>
              <SelectContent>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.employee_number} - {isRTL ? e.name : (e.name_en || e.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {eos && (
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-3">
                  <h3 className="font-semibold">{isRTL ? "بيانات الخدمة" : "Service Details"}</h3>
                  <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? "تاريخ التعيين" : "Hire Date"}</span><span>{eos.hireDate}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? "تاريخ الانتهاء" : "End Date"}</span><span>{eos.endDate}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? "سنوات الخدمة" : "Service Years"}</span><span className="font-bold">{eos.totalYears}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? "إجمالي الأشهر" : "Total Months"}</span><span>{eos.totalMonths}</span></div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-3">
                  <h3 className="font-semibold">{isRTL ? "بيانات الراتب" : "Salary Details"}</h3>
                  <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? "الراتب الشهري" : "Monthly Salary"}</span><span>{eos.monthlySalary.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? "الأجر اليومي" : "Daily Rate"}</span><span>{eos.dailyRate}</span></div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 border-primary">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-6 w-6 text-primary" />
                      <h3 className="text-lg font-bold">{isRTL ? "مكافأة نهاية الخدمة" : "End of Service Benefit"}</h3>
                    </div>
                    <span className="text-3xl font-bold text-primary">{eos.eosAmount.toLocaleString()} {isRTL ? "ريال" : "SAR"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isRTL
                      ? "حسب نظام العمل السعودي: نصف شهر عن كل سنة من الخمس الأولى، وشهر كامل عن كل سنة بعدها"
                      : "Per Saudi Labor Law: Half month per year for first 5 years, full month per year thereafter"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {!eos && (
            <div className="text-center py-12 text-muted-foreground">
              {isRTL ? "اختر موظف لحساب مستحقاته" : "Select an employee to calculate benefits"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EndOfService;
