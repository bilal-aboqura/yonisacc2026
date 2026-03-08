import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Calendar, DollarSign, Loader2, Banknote } from "lucide-react";

const HRReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const today = new Date();
  const [monthFilter, setMonthFilter] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);

  const year = parseInt(monthFilter.split("-")[0]);
  const month = parseInt(monthFilter.split("-")[1]);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-report-employees", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_employees").select("*, hr_departments(name, name_en)")
        .eq("company_id", companyId).order("employee_number");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: attendance = [], isLoading: loadingAtt } = useQuery({
    queryKey: ["hr-report-attendance", companyId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_attendance").select("employee_id, status")
        .eq("company_id", companyId)
        .gte("attendance_date", startDate).lte("attendance_date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: leaves = [], isLoading: loadingLeaves } = useQuery({
    queryKey: ["hr-report-leaves", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_leaves").select("*, hr_employees(name, name_en, employee_number)")
        .eq("company_id", companyId).eq("status", "approved")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: payrollRuns = [], isLoading: loadingPayroll } = useQuery({
    queryKey: ["hr-report-payroll", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_payroll_runs").select("*")
        .eq("company_id", companyId).eq("status", "posted")
        .order("period_year", { ascending: false }).order("period_month", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: loans = [], isLoading: loadingLoans } = useQuery({
    queryKey: ["hr-report-loans", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_loans").select("*, hr_employees(name, name_en, employee_number)")
        .eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Attendance summary per employee
  const attSummary = employees.map((emp: any) => {
    const empAtt = attendance.filter((a: any) => a.employee_id === emp.id);
    return {
      id: emp.id,
      name: isRTL ? emp.name : (emp.name_en || emp.name),
      number: emp.employee_number,
      dept: emp.hr_departments ? (isRTL ? emp.hr_departments.name : (emp.hr_departments.name_en || emp.hr_departments.name)) : "—",
      present: empAtt.filter((a: any) => a.status === "present").length,
      absent: empAtt.filter((a: any) => a.status === "absent").length,
      late: empAtt.filter((a: any) => a.status === "late").length,
      leave: empAtt.filter((a: any) => a.status === "leave").length,
      total: empAtt.length,
    };
  });

  // Leave summary per employee
  const leaveSummary: Record<string, { name: string; number: string; annual: number; sick: number; unpaid: number; emergency: number; total: number }> = {};
  leaves.forEach((l: any) => {
    const empId = l.employee_id;
    if (!leaveSummary[empId]) {
      leaveSummary[empId] = {
        name: l.hr_employees ? (isRTL ? l.hr_employees.name : (l.hr_employees.name_en || l.hr_employees.name)) : "—",
        number: l.hr_employees?.employee_number || "",
        annual: 0, sick: 0, unpaid: 0, emergency: 0, total: 0,
      };
    }
    const days = l.days_count || 0;
    leaveSummary[empId].total += days;
    if (l.leave_type === "annual") leaveSummary[empId].annual += days;
    else if (l.leave_type === "sick") leaveSummary[empId].sick += days;
    else if (l.leave_type === "unpaid") leaveSummary[empId].unpaid += days;
    else if (l.leave_type === "emergency") leaveSummary[empId].emergency += days;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isRTL ? "تقارير الموارد البشرية" : "HR Reports"}</h1>

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="attendance" className="flex items-center gap-1"><Users className="h-4 w-4" />{isRTL ? "الحضور" : "Attendance"}</TabsTrigger>
          <TabsTrigger value="leaves" className="flex items-center gap-1"><Calendar className="h-4 w-4" />{isRTL ? "الإجازات" : "Leaves"}</TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{isRTL ? "الرواتب" : "Payroll"}</TabsTrigger>
          <TabsTrigger value="loans" className="flex items-center gap-1"><Banknote className="h-4 w-4" />{isRTL ? "السلف" : "Advances"}</TabsTrigger>
        </TabsList>

        {/* Attendance Report */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? "تقرير الحضور الشهري" : "Monthly Attendance Report"}</CardTitle>
                <div className="space-y-1">
                  <Label>{isRTL ? "الشهر" : "Month"}</Label>
                  <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-44" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAtt ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
              <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                  <TableHead className="border-b border-border/50">{isRTL ? "رقم" : "#"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "القسم" : "Dept"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "حضور" : "Present"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "غياب" : "Absent"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "تأخر" : "Late"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "إجازة" : "Leave"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الإجمالي" : "Total"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {attSummary.filter(e => e.total > 0).map((e, idx) => (
                    <TableRow key={e.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                      <TableCell className="font-mono border-b border-border/30">{e.number}</TableCell>
                      <TableCell className="font-medium border-b border-border/30">{e.name}</TableCell>
                      <TableCell className="border-b border-border/30">{e.dept}</TableCell>
                      <TableCell className="text-emerald-600 font-bold border-b border-border/30">{e.present}</TableCell>
                      <TableCell className="text-red-600 font-bold border-b border-border/30">{e.absent}</TableCell>
                      <TableCell className="text-amber-600 border-b border-border/30">{e.late}</TableCell>
                      <TableCell className="text-blue-600 border-b border-border/30">{e.leave}</TableCell>
                      <TableCell className="border-b border-border/30">{e.total}</TableCell>
                    </TableRow>
                  ))}
                  {attSummary.filter(e => e.total > 0).length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaves Report */}
        <TabsContent value="leaves">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? "تقرير الإجازات" : "Leaves Report"}</CardTitle></CardHeader>
            <CardContent>
              {loadingLeaves ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{isRTL ? "رقم" : "#"}</TableHead>
                  <TableHead>{isRTL ? "الموظف" : "Employee"}</TableHead>
                  <TableHead>{isRTL ? "سنوية" : "Annual"}</TableHead>
                  <TableHead>{isRTL ? "مرضية" : "Sick"}</TableHead>
                  <TableHead>{isRTL ? "بدون راتب" : "Unpaid"}</TableHead>
                  <TableHead>{isRTL ? "اضطرارية" : "Emergency"}</TableHead>
                  <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {Object.entries(leaveSummary).map(([id, s]) => (
                    <TableRow key={id}>
                      <TableCell className="font-mono">{s.number}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.annual}</TableCell>
                      <TableCell>{s.sick}</TableCell>
                      <TableCell>{s.unpaid}</TableCell>
                      <TableCell>{s.emergency}</TableCell>
                      <TableCell className="font-bold">{s.total}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(leaveSummary).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Report */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? "تقرير الرواتب" : "Payroll Report"}</CardTitle></CardHeader>
            <CardContent>
              {loadingPayroll ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{isRTL ? "الفترة" : "Period"}</TableHead>
                  <TableHead>{isRTL ? "الأساسي" : "Basic"}</TableHead>
                  <TableHead>{isRTL ? "البدلات" : "Allowances"}</TableHead>
                  <TableHead>{isRTL ? "الاستقطاعات" : "Deductions"}</TableHead>
                  <TableHead>{isRTL ? "الصافي" : "Net"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {payrollRuns.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.period_month}/{r.period_year}</TableCell>
                      <TableCell>{(r.total_basic || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-emerald-600">{(r.total_allowances || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">{(r.total_deductions || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-bold">{(r.total_net || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {payrollRuns.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                  )}
                  {payrollRuns.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>{isRTL ? "الإجمالي" : "Total"}</TableCell>
                      <TableCell>{payrollRuns.reduce((s: number, r: any) => s + (r.total_basic || 0), 0).toLocaleString()}</TableCell>
                      <TableCell className="text-emerald-600">{payrollRuns.reduce((s: number, r: any) => s + (r.total_allowances || 0), 0).toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">{payrollRuns.reduce((s: number, r: any) => s + (r.total_deductions || 0), 0).toLocaleString()}</TableCell>
                      <TableCell>{payrollRuns.reduce((s: number, r: any) => s + (r.total_net || 0), 0).toLocaleString()}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loans/Advances Report */}
        <TabsContent value="loans">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? "تقرير السلف" : "Advances Report"}</CardTitle></CardHeader>
            <CardContent>
              {loadingLoans ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card><CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي السلف" : "Total"}</p>
                    <p className="text-xl font-bold">{loans.reduce((s: number, l: any) => s + (l.amount || 0), 0).toLocaleString()}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">{isRTL ? "المسدد" : "Paid"}</p>
                    <p className="text-xl font-bold text-emerald-600">{loans.reduce((s: number, l: any) => s + (l.total_paid || 0), 0).toLocaleString()}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">{isRTL ? "المتبقي" : "Remaining"}</p>
                    <p className="text-xl font-bold text-amber-600">{loans.reduce((s: number, l: any) => s + (l.remaining || 0), 0).toLocaleString()}</p>
                  </CardContent></Card>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{isRTL ? "الموظف" : "Employee"}</TableHead>
                    <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                    <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead>{isRTL ? "المسدد" : "Paid"}</TableHead>
                    <TableHead>{isRTL ? "المتبقي" : "Remaining"}</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {loans.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.hr_employees ? (isRTL ? l.hr_employees.name : (l.hr_employees.name_en || l.hr_employees.name)) : "—"}</TableCell>
                        <TableCell>{l.loan_type === "advance" ? (isRTL ? "سلفة" : "Advance") : (isRTL ? "قرض" : "Loan")}</TableCell>
                        <TableCell>{(l.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-emerald-600">{(l.total_paid || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-amber-600">{(l.remaining || 0).toLocaleString()}</TableCell>
                        <TableCell>{l.status === "active" ? (isRTL ? "نشطة" : "Active") : (isRTL ? "مسددة" : "Paid")}</TableCell>
                      </TableRow>
                    ))}
                    {loans.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HRReports;
