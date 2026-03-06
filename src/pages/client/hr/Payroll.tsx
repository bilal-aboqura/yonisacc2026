import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Play, Loader2, Eye, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const Payroll = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewRun, setViewRun] = useState<any>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: payrollRuns = [], isLoading } = useQuery({
    queryKey: ["hr-payroll-runs", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_payroll_runs").select("*")
        .eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: payrollItems = [] } = useQuery({
    queryKey: ["hr-payroll-items", viewRun?.id],
    queryFn: async () => {
      if (!viewRun) return [];
      const { data, error } = await (supabase as any)
        .from("hr_payroll_items").select("*, hr_employees(name, name_en, employee_number)")
        .eq("payroll_run_id", viewRun.id);
      if (error) throw error;
      return data;
    },
    enabled: !!viewRun,
  });

  const runPayrollMutation = useMutation({
    mutationFn: async () => {
      // Fetch active employees
      const { data: employees, error: empError } = await (supabase as any)
        .from("hr_employees").select("*").eq("company_id", companyId).eq("status", "active");
      if (empError) throw empError;
      if (!employees || employees.length === 0) throw new Error(isRTL ? "لا يوجد موظفين نشطين" : "No active employees");

      // Fetch active loans
      const { data: loans } = await (supabase as any)
        .from("hr_loans").select("*").eq("company_id", companyId).eq("status", "active");

      // Fetch absence count for the month
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-28`; // Simplified
      const { data: absences } = await (supabase as any)
        .from("hr_attendance").select("employee_id, status")
        .eq("company_id", companyId).eq("status", "absent")
        .gte("attendance_date", startDate).lte("attendance_date", endDate);

      const absenceMap: Record<string, number> = {};
      (absences || []).forEach((a: any) => { absenceMap[a.employee_id] = (absenceMap[a.employee_id] || 0) + 1; });

      const loanMap: Record<string, number> = {};
      (loans || []).forEach((l: any) => { if (l.remaining > 0) loanMap[l.employee_id] = (loanMap[l.employee_id] || 0) + l.monthly_deduction; });

      // Create payroll run
      const runNumber = `PR-${year}-${String(month).padStart(2, "0")}`;
      let totalBasic = 0, totalAllowances = 0, totalDeductions = 0, totalNet = 0;

      const items = employees.map((emp: any) => {
        const basic = emp.basic_salary || 0;
        const housing = emp.housing_allowance || 0;
        const transport = emp.transport_allowance || 0;
        const other = emp.other_allowance || 0;
        const allowances = housing + transport + other;
        const dailyRate = (basic + allowances) / 30;
        const absenceDays = absenceMap[emp.id] || 0;
        const absenceDeduction = dailyRate * absenceDays;
        const loanDeduction = loanMap[emp.id] || 0;
        const totalDed = absenceDeduction + loanDeduction;
        const net = basic + allowances - totalDed;

        totalBasic += basic;
        totalAllowances += allowances;
        totalDeductions += totalDed;
        totalNet += net;

        return {
          employee_id: emp.id, basic_salary: basic,
          housing_allowance: housing, transport_allowance: transport,
          other_allowance: other, total_allowances: allowances,
          absence_deduction: absenceDeduction, loan_deduction: loanDeduction,
          other_deduction: 0, total_deductions: totalDed, net_salary: net,
        };
      });

      const { data: run, error: runError } = await (supabase as any)
        .from("hr_payroll_runs").insert({
          company_id: companyId, run_number: runNumber,
          period_month: month, period_year: year,
          total_basic: totalBasic, total_allowances: totalAllowances,
          total_deductions: totalDeductions, total_net: totalNet,
          status: "draft", created_by: user?.id,
        }).select().single();
      if (runError) throw runError;

      // Insert items
      const itemsWithRun = items.map((i: any) => ({ ...i, payroll_run_id: run.id }));
      const { error: itemsError } = await (supabase as any).from("hr_payroll_items").insert(itemsWithRun);
      if (itemsError) throw itemsError;

      return run;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
      setDialogOpen(false);
      toast.success(isRTL ? "تم تشغيل مسير الرواتب" : "Payroll run completed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Post payroll (create journal entry)
  const postPayrollMutation = useMutation({
    mutationFn: async (run: any) => {
      // Fetch accounts: 512=Salaries Expense, 117=Employee Advances, 111=Cash
      const { data: accounts } = await (supabase as any)
        .from("accounts").select("id, code")
        .eq("company_id", companyId)
        .in("code", ["512", "117", "111"]);

      const salaryAcc = accounts?.find((a: any) => a.code === "512");
      const advanceAcc = accounts?.find((a: any) => a.code === "117");
      const cashAcc = accounts?.find((a: any) => a.code === "111");

      if (!salaryAcc || !cashAcc) throw new Error(isRTL ? "حسابات الرواتب غير موجودة" : "Salary accounts not found");

      const { data: settings } = await (supabase as any)
        .from("company_settings").select("journal_prefix, next_journal_number")
        .eq("company_id", companyId).maybeSingle();

      const prefix = settings?.journal_prefix || "JE-";
      const nextNum = settings?.next_journal_number || 1;
      const entryNumber = `${prefix}${String(nextNum).padStart(6, "0")}`;

      const totalGross = run.total_basic + run.total_allowances;
      const totalLoanDeductions = run.total_deductions; // Simplified

      const desc = isRTL ? `رواتب شهر ${run.period_month}/${run.period_year}` : `Payroll ${run.period_month}/${run.period_year}`;

      const lines: any[] = [
        { debit: totalGross, credit: 0, description: desc }, // Dr. Salaries Expense
      ];

      // Journal: Dr. Salaries 512, Cr. Cash 111, Cr. Employee Advances 117 (if loans)
      const { data: je, error: jeError } = await (supabase as any)
        .from("journal_entries").insert({
          company_id: companyId, entry_number: entryNumber,
          entry_date: new Date().toISOString().split("T")[0],
          description: desc, total_debit: totalGross, total_credit: totalGross,
          status: "posted", source: "hr_payroll",
        }).select().single();

      if (jeError) throw jeError;

      const jeLines = [
        { entry_id: je.id, account_id: salaryAcc.id, debit: totalGross, credit: 0, description: desc },
        { entry_id: je.id, account_id: cashAcc.id, debit: 0, credit: run.total_net, description: desc },
      ];
      if (advanceAcc && totalLoanDeductions > 0) {
        jeLines.push({ entry_id: je.id, account_id: advanceAcc.id, debit: 0, credit: totalLoanDeductions, description: isRTL ? "استقطاعات سلف" : "Loan deductions" });
      }

      await (supabase as any).from("journal_entry_lines").insert(jeLines);
      await (supabase as any).from("company_settings").update({ next_journal_number: nextNum + 1 }).eq("company_id", companyId);

      // Update payroll run status
      await (supabase as any).from("hr_payroll_runs").update({ status: "posted", journal_entry_id: je.id }).eq("id", run.id);

      // Update loan balances
      const { data: items } = await (supabase as any).from("hr_payroll_items").select("employee_id, loan_deduction").eq("payroll_run_id", run.id);
      for (const item of (items || [])) {
        if (item.loan_deduction > 0) {
          const { data: empLoans } = await (supabase as any).from("hr_loans")
            .select("id, remaining, total_paid").eq("employee_id", item.employee_id).eq("status", "active");
          for (const loan of (empLoans || [])) {
            const newPaid = (loan.total_paid || 0) + item.loan_deduction;
            const newRemaining = Math.max(0, (loan.remaining || 0) - item.loan_deduction);
            await (supabase as any).from("hr_loans").update({
              total_paid: newPaid, remaining: newRemaining,
              status: newRemaining <= 0 ? "paid" : "active",
            }).eq("id", loan.id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
      queryClient.invalidateQueries({ queryKey: ["hr-loans"] });
      toast.success(isRTL ? "تم ترحيل مسير الرواتب مع القيد المحاسبي" : "Payroll posted with journal entry");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isRTL ? "الرواتب" : "Payroll"}</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Play className="h-4 w-4 me-2" />{isRTL ? "تشغيل مسير الرواتب" : "Run Payroll"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />{isRTL ? "مسيرات الرواتب" : "Payroll Runs"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          payrollRuns.length === 0 ? <div className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد مسيرات" : "No payroll runs"}</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>{isRTL ? "الرقم" : "Run #"}</TableHead>
              <TableHead>{isRTL ? "الفترة" : "Period"}</TableHead>
              <TableHead>{isRTL ? "إجمالي الرواتب" : "Total Basic"}</TableHead>
              <TableHead>{isRTL ? "البدلات" : "Allowances"}</TableHead>
              <TableHead>{isRTL ? "الاستقطاعات" : "Deductions"}</TableHead>
              <TableHead>{isRTL ? "صافي" : "Net"}</TableHead>
              <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
              <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {payrollRuns.map((run: any) => (
                <TableRow key={run.id}>
                  <TableCell className="font-mono">{run.run_number}</TableCell>
                  <TableCell>{run.period_month}/{run.period_year}</TableCell>
                  <TableCell>{(run.total_basic || 0).toLocaleString()}</TableCell>
                  <TableCell>{(run.total_allowances || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-destructive">{(run.total_deductions || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-bold">{(run.total_net || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={run.status === "posted" ? "default" : "secondary"}>
                      {run.status === "posted" ? (isRTL ? "مرحّل" : "Posted") : (isRTL ? "مسودة" : "Draft")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewRun(run)}><Eye className="h-4 w-4" /></Button>
                      {run.status === "draft" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => postPayrollMutation.mutate(run)} disabled={postPayrollMutation.isPending}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      {/* Run Payroll Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isRTL ? "تشغيل مسير الرواتب" : "Run Payroll"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الشهر" : "Month"}</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(+v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {new Date(2000, i).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "السنة" : "Year"}</Label>
                <Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {isRTL ? "سيتم احتساب رواتب جميع الموظفين النشطين مع خصم الغيابات والسلف تلقائياً" : "All active employees' salaries will be calculated with automatic absence and loan deductions"}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{isRTL ? "إلغاء" : "Cancel"}</Button></DialogClose>
            <Button onClick={() => runPayrollMutation.mutate()} disabled={runPayrollMutation.isPending}>
              {runPayrollMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "تشغيل" : "Run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Payroll Items Dialog */}
      <Dialog open={!!viewRun} onOpenChange={(o) => !o && setViewRun(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isRTL ? "تفاصيل مسير الرواتب" : "Payroll Details"} - {viewRun?.run_number}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow>
              <TableHead>{isRTL ? "الموظف" : "Employee"}</TableHead>
              <TableHead>{isRTL ? "أساسي" : "Basic"}</TableHead>
              <TableHead>{isRTL ? "بدلات" : "Allow."}</TableHead>
              <TableHead>{isRTL ? "خصم غياب" : "Absence"}</TableHead>
              <TableHead>{isRTL ? "خصم سلف" : "Loan"}</TableHead>
              <TableHead>{isRTL ? "صافي" : "Net"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {payrollItems.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.hr_employees ? (isRTL ? item.hr_employees.name : (item.hr_employees.name_en || item.hr_employees.name)) : "—"}</TableCell>
                  <TableCell>{(item.basic_salary || 0).toLocaleString()}</TableCell>
                  <TableCell>{(item.total_allowances || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-destructive">{(item.absence_deduction || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-destructive">{(item.loan_deduction || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-bold">{(item.net_salary || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
