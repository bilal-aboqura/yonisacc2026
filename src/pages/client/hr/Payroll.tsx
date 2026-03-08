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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DollarSign, Play, Loader2, Eye, CheckCircle, ArrowLeft, Pencil, XCircle, Save, Calendar, Users, TrendingDown } from "lucide-react";
import { toast } from "sonner";

const Payroll = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showRunForm, setShowRunForm] = useState(false);
  const [viewRun, setViewRun] = useState<any>(null);
  const [editRun, setEditRun] = useState<any>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [confirmAction, setConfirmAction] = useState<{ type: "approve" | "cancel"; run: any } | null>(null);

  // Queries
  const { data: payrollRuns = [], isLoading } = useQuery({
    queryKey: ["hr-payroll-runs", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_payroll_runs").select("*")
        .eq("company_id", companyId).order("period_year", { ascending: false }).order("period_month", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const activeRunId = viewRun?.id || editRun?.id;
  const { data: payrollItems = [] } = useQuery({
    queryKey: ["hr-payroll-items", activeRunId],
    queryFn: async () => {
      if (!activeRunId) return [];
      const { data, error } = await (supabase as any)
        .from("hr_payroll_items").select("*, hr_employees(name, name_en, employee_number)")
        .eq("payroll_run_id", activeRunId);
      if (error) throw error;
      return data;
    },
    enabled: !!activeRunId,
  });

  // Helper: get last day of month
  const getLastDayOfMonth = (y: number, m: number) => new Date(y, m, 0).toISOString().split("T")[0];

  // Run Payroll
  const runPayrollMutation = useMutation({
    mutationFn: async () => {
      const { data: employees, error: empError } = await (supabase as any)
        .from("hr_employees").select("*").eq("company_id", companyId).eq("status", "active");
      if (empError) throw empError;
      if (!employees || employees.length === 0) throw new Error(isRTL ? "لا يوجد موظفين نشطين" : "No active employees");

      const { data: loans } = await (supabase as any)
        .from("hr_loans").select("*").eq("company_id", companyId).eq("status", "active");

      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = getLastDayOfMonth(year, month);
      const { data: absences } = await (supabase as any)
        .from("hr_attendance").select("employee_id, status")
        .eq("company_id", companyId).eq("status", "absent")
        .gte("attendance_date", startDate).lte("attendance_date", endDate);

      const absenceMap: Record<string, number> = {};
      (absences || []).forEach((a: any) => { absenceMap[a.employee_id] = (absenceMap[a.employee_id] || 0) + 1; });

      const loanMap: Record<string, number> = {};
      (loans || []).forEach((l: any) => { if (l.remaining > 0) loanMap[l.employee_id] = (loanMap[l.employee_id] || 0) + l.monthly_deduction; });

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
        const absenceDeduction = Math.round(dailyRate * absenceDays * 100) / 100;
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

      const runDate = getLastDayOfMonth(year, month);
      const { data: run, error: runError } = await (supabase as any)
        .from("hr_payroll_runs").insert({
          company_id: companyId, run_number: runNumber,
          period_month: month, period_year: year, run_date: runDate,
          total_basic: totalBasic, total_allowances: totalAllowances,
          total_deductions: totalDeductions, total_net: totalNet,
          status: "draft", created_by: user?.id,
        }).select().single();
      if (runError) throw runError;

      const itemsWithRun = items.map((i: any) => ({ ...i, payroll_run_id: run.id }));
      const { error: itemsError } = await (supabase as any).from("hr_payroll_items").insert(itemsWithRun);
      if (itemsError) throw itemsError;

      return run;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
      setShowRunForm(false);
      toast.success(isRTL ? "تم تشغيل مسير الرواتب" : "Payroll run completed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Approve (Post) payroll — journal entry date = last day of payroll month
  const approvePayrollMutation = useMutation({
    mutationFn: async (run: any) => {
      const { data: accounts } = await (supabase as any)
        .from("accounts").select("id, code")
        .eq("company_id", companyId)
        .in("code", ["512", "117", "111"]);

      const salaryAcc = accounts?.find((a: any) => a.code === "512");
      const advanceAcc = accounts?.find((a: any) => a.code === "117");
      const cashAcc = accounts?.find((a: any) => a.code === "111");

      if (!salaryAcc || !cashAcc) throw new Error(isRTL ? "حسابات الرواتب غير موجودة (512, 111)" : "Salary accounts not found (512, 111)");

      const { data: settings } = await (supabase as any)
        .from("company_settings").select("journal_prefix, next_journal_number")
        .eq("company_id", companyId).maybeSingle();

      const prefix = settings?.journal_prefix || "JE-";
      const nextNum = settings?.next_journal_number || 1;
      const entryNumber = `${prefix}${String(nextNum).padStart(6, "0")}`;

      const totalGross = run.total_basic + run.total_allowances;
      const entryDate = getLastDayOfMonth(run.period_year, run.period_month);
      const desc = isRTL ? `رواتب شهر ${run.period_month}/${run.period_year}` : `Payroll ${run.period_month}/${run.period_year}`;

      const { data: je, error: jeError } = await (supabase as any)
        .from("journal_entries").insert({
          company_id: companyId, entry_number: entryNumber,
          entry_date: entryDate,
          description: desc, total_debit: totalGross, total_credit: totalGross,
          status: "posted", source: "hr_payroll",
        }).select().single();
      if (jeError) throw jeError;

      const jeLines = [
        { entry_id: je.id, account_id: salaryAcc.id, debit: totalGross, credit: 0, description: desc },
        { entry_id: je.id, account_id: cashAcc.id, debit: 0, credit: run.total_net, description: desc },
      ];
      if (advanceAcc && run.total_deductions > 0) {
        jeLines.push({ entry_id: je.id, account_id: advanceAcc.id, debit: 0, credit: run.total_deductions, description: isRTL ? "استقطاعات سلف" : "Loan deductions" });
      }

      await (supabase as any).from("journal_entry_lines").insert(jeLines);
      await (supabase as any).from("company_settings").update({ next_journal_number: nextNum + 1 }).eq("company_id", companyId);
      await (supabase as any).from("hr_payroll_runs").update({ status: "posted", journal_entry_id: je.id }).eq("id", run.id);

      // Update loans
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
      setConfirmAction(null);
      toast.success(isRTL ? "تم اعتماد المسير وإنشاء القيد المحاسبي" : "Payroll approved & journal entry created");
    },
    onError: (e: any) => { setConfirmAction(null); toast.error(e.message); },
  });

  // Cancel payroll
  const cancelPayrollMutation = useMutation({
    mutationFn: async (run: any) => {
      await (supabase as any).from("hr_payroll_items").delete().eq("payroll_run_id", run.id);
      await (supabase as any).from("hr_payroll_runs").delete().eq("id", run.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
      setConfirmAction(null);
      setViewRun(null);
      toast.success(isRTL ? "تم إلغاء المسير" : "Payroll cancelled");
    },
    onError: (e: any) => { setConfirmAction(null); toast.error(e.message); },
  });

  // Save edited items
  const saveEditMutation = useMutation({
    mutationFn: async () => {
      let totalBasic = 0, totalAllowances = 0, totalDeductions = 0, totalNet = 0;

      for (const item of editItems) {
        const allowances = (item.housing_allowance || 0) + (item.transport_allowance || 0) + (item.other_allowance || 0);
        const deductions = (item.absence_deduction || 0) + (item.loan_deduction || 0) + (item.other_deduction || 0);
        const net = (item.basic_salary || 0) + allowances - deductions;

        totalBasic += item.basic_salary || 0;
        totalAllowances += allowances;
        totalDeductions += deductions;
        totalNet += net;

        await (supabase as any).from("hr_payroll_items").update({
          basic_salary: item.basic_salary,
          housing_allowance: item.housing_allowance,
          transport_allowance: item.transport_allowance,
          other_allowance: item.other_allowance,
          total_allowances: allowances,
          absence_deduction: item.absence_deduction,
          loan_deduction: item.loan_deduction,
          other_deduction: item.other_deduction,
          total_deductions: deductions,
          net_salary: net,
        }).eq("id", item.id);
      }

      await (supabase as any).from("hr_payroll_runs").update({
        total_basic: totalBasic, total_allowances: totalAllowances,
        total_deductions: totalDeductions, total_net: totalNet,
      }).eq("id", editRun.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-items"] });
      setEditRun(null);
      setEditItems([]);
      toast.success(isRTL ? "تم حفظ التعديلات" : "Changes saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Open edit mode
  const openEdit = (run: any) => {
    setEditRun(run);
    setViewRun(null);
  };

  // When items load for edit, populate editItems
  const handleEditItemsLoaded = () => {
    if (editRun && payrollItems.length > 0 && editItems.length === 0) {
      setEditItems(payrollItems.map((i: any) => ({ ...i })));
    }
  };
  handleEditItemsLoaded();

  const updateEditItem = (index: number, field: string, value: number) => {
    const updated = [...editItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditItems(updated);
  };

  const getItemNet = (item: any) => {
    const allowances = (item.housing_allowance || 0) + (item.transport_allowance || 0) + (item.other_allowance || 0);
    const deductions = (item.absence_deduction || 0) + (item.loan_deduction || 0) + (item.other_deduction || 0);
    return (item.basic_salary || 0) + allowances - deductions;
  };

  const formatNum = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const monthName = (m: number) => new Date(2000, m - 1).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "long" });

  const statusBadge = (status: string) => {
    if (status === "posted") return <Badge className="bg-emerald-600 text-white">{isRTL ? "معتمد" : "Approved"}</Badge>;
    return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">{isRTL ? "مسودة" : "Draft"}</Badge>;
  };

  // ===== EDIT VIEW =====
  if (editRun) {
    const editTotals = editItems.reduce((acc, item) => {
      const allowances = (item.housing_allowance || 0) + (item.transport_allowance || 0) + (item.other_allowance || 0);
      const deductions = (item.absence_deduction || 0) + (item.loan_deduction || 0) + (item.other_deduction || 0);
      const net = (item.basic_salary || 0) + allowances - deductions;
      return { basic: acc.basic + (item.basic_salary || 0), allowances: acc.allowances + allowances, deductions: acc.deductions + deductions, net: acc.net + net };
    }, { basic: 0, allowances: 0, deductions: 0, net: 0 });

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => { setEditRun(null); setEditItems([]); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? "تعديل مسير الرواتب" : "Edit Payroll"}</h1>
            <p className="text-sm text-muted-foreground">{editRun.run_number} • {monthName(editRun.period_month)} {editRun.period_year}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground mb-1">{isRTL ? "الأساسي" : "Basic"}</p><p className="text-xl font-bold tabular-nums">{formatNum(editTotals.basic)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground mb-1">{isRTL ? "البدلات" : "Allowances"}</p><p className="text-xl font-bold tabular-nums text-emerald-600">{formatNum(editTotals.allowances)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground mb-1">{isRTL ? "الاستقطاعات" : "Deductions"}</p><p className="text-xl font-bold tabular-nums text-destructive">{formatNum(editTotals.deductions)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground mb-1">{isRTL ? "الصافي" : "Net"}</p><p className="text-xl font-bold tabular-nums text-primary">{formatNum(editTotals.net)}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="pt-6">
             <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 dark:bg-muted/30">
                    <TableHead className="font-semibold border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                    <TableHead className="text-center font-semibold border-b border-border/50">{isRTL ? "أساسي" : "Basic"}</TableHead>
                    <TableHead className="text-center font-semibold border-b border-border/50">{isRTL ? "سكن" : "Housing"}</TableHead>
                    <TableHead className="text-center font-semibold border-b border-border/50">{isRTL ? "نقل" : "Transport"}</TableHead>
                    <TableHead className="text-center font-semibold border-b border-border/50">{isRTL ? "أخرى" : "Other"}</TableHead>
                    <TableHead className="text-center font-semibold border-b border-border/50">{isRTL ? "خصم غياب" : "Absence"}</TableHead>
                    <TableHead className="text-center font-semibold border-b border-border/50">{isRTL ? "خصم سلف" : "Loan"}</TableHead>
                    <TableHead className="text-center font-semibold border-b border-border/50">{isRTL ? "صافي" : "Net"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editItems.map((item: any, idx: number) => (
                    <TableRow key={item.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                      <TableCell className="font-medium whitespace-nowrap border-b border-border/30">
                        <span className="text-xs text-muted-foreground me-2">{item.hr_employees?.employee_number}</span>
                        {item.hr_employees ? (isRTL ? item.hr_employees.name : (item.hr_employees.name_en || item.hr_employees.name)) : "—"}
                      </TableCell>
                      <TableCell className="border-b border-border/30"><Input type="number" className="h-8 w-24 text-center tabular-nums" value={item.basic_salary || 0} onChange={(e) => updateEditItem(idx, "basic_salary", +e.target.value)} /></TableCell>
                      <TableCell className="border-b border-border/30"><Input type="number" className="h-8 w-24 text-center tabular-nums" value={item.housing_allowance || 0} onChange={(e) => updateEditItem(idx, "housing_allowance", +e.target.value)} /></TableCell>
                      <TableCell className="border-b border-border/30"><Input type="number" className="h-8 w-24 text-center tabular-nums" value={item.transport_allowance || 0} onChange={(e) => updateEditItem(idx, "transport_allowance", +e.target.value)} /></TableCell>
                      <TableCell className="border-b border-border/30"><Input type="number" className="h-8 w-24 text-center tabular-nums" value={item.other_allowance || 0} onChange={(e) => updateEditItem(idx, "other_allowance", +e.target.value)} /></TableCell>
                      <TableCell className="border-b border-border/30"><Input type="number" className="h-8 w-24 text-center tabular-nums" value={item.absence_deduction || 0} onChange={(e) => updateEditItem(idx, "absence_deduction", +e.target.value)} /></TableCell>
                      <TableCell className="border-b border-border/30"><Input type="number" className="h-8 w-24 text-center tabular-nums" value={item.loan_deduction || 0} onChange={(e) => updateEditItem(idx, "loan_deduction", +e.target.value)} /></TableCell>
                      <TableCell className="font-bold tabular-nums text-center text-primary border-b border-border/30">{formatNum(getItemNet(item))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => { setEditRun(null); setEditItems([]); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveEditMutation.mutate()} disabled={saveEditMutation.isPending}>
                {saveEditMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                <Save className="h-4 w-4 me-2" />{isRTL ? "حفظ التعديلات" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== VIEW DETAILS =====
  if (viewRun) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setViewRun(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{isRTL ? "تفاصيل مسير الرواتب" : "Payroll Details"}</h1>
              <p className="text-sm text-muted-foreground">{viewRun.run_number} • {monthName(viewRun.period_month)} {viewRun.period_year}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(viewRun.status)}
            {viewRun.status === "draft" && (
              <>
                <Button variant="outline" size="sm" onClick={() => openEdit(viewRun)}>
                  <Pencil className="h-4 w-4 me-1" />{isRTL ? "تعديل" : "Edit"}
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setConfirmAction({ type: "approve", run: viewRun })}>
                  <CheckCircle className="h-4 w-4 me-1" />{isRTL ? "اعتماد" : "Approve"}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setConfirmAction({ type: "cancel", run: viewRun })}>
                  <XCircle className="h-4 w-4 me-1" />{isRTL ? "إلغاء" : "Cancel"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">{isRTL ? "الأساسي" : "Basic"}</p><p className="text-xl font-bold tabular-nums">{formatNum(viewRun.total_basic || 0)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Users className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground">{isRTL ? "البدلات" : "Allowances"}</p><p className="text-xl font-bold tabular-nums text-emerald-600">{formatNum(viewRun.total_allowances || 0)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><TrendingDown className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-xs text-muted-foreground">{isRTL ? "الاستقطاعات" : "Deductions"}</p><p className="text-xl font-bold tabular-nums text-destructive">{formatNum(viewRun.total_deductions || 0)}</p></div>
          </CardContent></Card>
          <Card className="border-primary/30 bg-primary/5"><CardContent className="pt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">{isRTL ? "الصافي" : "Net"}</p><p className="text-xl font-bold tabular-nums text-primary">{formatNum(viewRun.total_net || 0)}</p></div>
          </CardContent></Card>
        </div>

        {viewRun.status === "posted" && viewRun.journal_entry_id && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>{isRTL ? `تم إنشاء القيد المحاسبي بتاريخ ${getLastDayOfMonth(viewRun.period_year, viewRun.period_month)}` : `Journal entry created on ${getLastDayOfMonth(viewRun.period_year, viewRun.period_month)}`}</span>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isRTL ? "تفاصيل الموظفين" : "Employee Details"}</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 dark:bg-muted/30">
                    <TableHead className="font-semibold border-b border-border/50">#</TableHead>
                    <TableHead className="font-semibold border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                    <TableHead className="text-end font-semibold border-b border-border/50">{isRTL ? "أساسي" : "Basic"}</TableHead>
                    <TableHead className="text-end font-semibold border-b border-border/50">{isRTL ? "سكن" : "Housing"}</TableHead>
                    <TableHead className="text-end font-semibold border-b border-border/50">{isRTL ? "نقل" : "Transport"}</TableHead>
                    <TableHead className="text-end font-semibold border-b border-border/50">{isRTL ? "أخرى" : "Other"}</TableHead>
                    <TableHead className="text-end font-semibold text-destructive border-b border-border/50">{isRTL ? "خصم غياب" : "Absence"}</TableHead>
                    <TableHead className="text-end font-semibold text-destructive border-b border-border/50">{isRTL ? "خصم سلف" : "Loan"}</TableHead>
                    <TableHead className="text-end font-semibold border-b border-border/50">{isRTL ? "إجمالي الاستقطاعات" : "Total Ded."}</TableHead>
                    <TableHead className="text-end font-semibold text-primary border-b border-border/50">{isRTL ? "الصافي" : "Net"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollItems.map((item: any, idx: number) => (
                    <TableRow key={item.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                      <TableCell className="text-muted-foreground tabular-nums border-b border-border/30">{idx + 1}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap border-b border-border/30">
                        <div>
                          <span>{item.hr_employees ? (isRTL ? item.hr_employees.name : (item.hr_employees.name_en || item.hr_employees.name)) : "—"}</span>
                          <span className="block text-xs text-muted-foreground">{item.hr_employees?.employee_number}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-end tabular-nums border-b border-border/30">{formatNum(item.basic_salary || 0)}</TableCell>
                      <TableCell className="text-end tabular-nums border-b border-border/30">{formatNum(item.housing_allowance || 0)}</TableCell>
                      <TableCell className="text-end tabular-nums border-b border-border/30">{formatNum(item.transport_allowance || 0)}</TableCell>
                      <TableCell className="text-end tabular-nums border-b border-border/30">{formatNum(item.other_allowance || 0)}</TableCell>
                      <TableCell className="text-end tabular-nums text-destructive border-b border-border/30">{formatNum(item.absence_deduction || 0)}</TableCell>
                      <TableCell className="text-end tabular-nums text-destructive border-b border-border/30">{formatNum(item.loan_deduction || 0)}</TableCell>
                      <TableCell className="text-end tabular-nums text-destructive font-medium border-b border-border/30">{formatNum(item.total_deductions || 0)}</TableCell>
                      <TableCell className="text-end tabular-nums font-bold text-primary border-b border-border/30">{formatNum(item.net_salary || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <TableRow className="bg-muted/70 font-bold border-t-2">
                    <TableCell colSpan={2}>{isRTL ? "الإجمالي" : "Total"}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatNum(viewRun.total_basic || 0)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell className="text-end tabular-nums text-destructive">{formatNum(viewRun.total_deductions || 0)}</TableCell>
                    <TableCell className="text-end tabular-nums text-primary">{formatNum(viewRun.total_net || 0)}</TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== RUN FORM =====
  if (showRunForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowRunForm(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isRTL ? "تشغيل مسير الرواتب" : "Run Payroll"}</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الشهر" : "Month"}</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(+v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{monthName(i + 1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "السنة" : "Year"}</Label>
                <Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} />
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
              <Calendar className="inline h-4 w-4 me-2" />
              {isRTL
                ? `سيتم إنشاء القيد المحاسبي بتاريخ ${getLastDayOfMonth(year, month)} عند الاعتماد`
                : `Journal entry will be dated ${getLastDayOfMonth(year, month)} upon approval`}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {isRTL ? "سيتم احتساب رواتب جميع الموظفين النشطين مع خصم الغيابات والسلف تلقائياً" : "All active employees' salaries will be calculated with automatic absence and loan deductions"}
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowRunForm(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => runPayrollMutation.mutate()} disabled={runPayrollMutation.isPending}>
                {runPayrollMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                <Play className="h-4 w-4 me-2" />{isRTL ? "تشغيل" : "Run"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== MAIN LIST =====
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isRTL ? "الرواتب" : "Payroll"}</h1>
        <Button onClick={() => setShowRunForm(true)}>
          <Play className="h-4 w-4 me-2" />{isRTL ? "تشغيل مسير جديد" : "New Payroll Run"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />{isRTL ? "مسيرات الرواتب" : "Payroll Runs"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : payrollRuns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{isRTL ? "لا توجد مسيرات رواتب" : "No payroll runs yet"}</p>
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 dark:bg-muted/30">
                    <TableHead className="font-semibold border-b border-border/50">{isRTL ? "رقم المسير" : "Run #"}</TableHead>
                    <TableHead className="font-semibold border-b border-border/50">{isRTL ? "الفترة" : "Period"}</TableHead>
                    <TableHead className="font-semibold border-b border-border/50">{isRTL ? "تاريخ التشغيل" : "Run Date"}</TableHead>
                    <TableHead className="text-end font-semibold border-b border-border/50">{isRTL ? "الأساسي" : "Basic"}</TableHead>
                    <TableHead className="text-end font-semibold border-b border-border/50">{isRTL ? "البدلات" : "Allowances"}</TableHead>
                    <TableHead className="text-end font-semibold border-b border-border/50">{isRTL ? "الاستقطاعات" : "Deductions"}</TableHead>
                    <TableHead className="text-end font-semibold border-b border-border/50">{isRTL ? "الصافي" : "Net"}</TableHead>
                    <TableHead className="text-center font-semibold border-b border-border/50">{isRTL ? "الحالة" : "Status"}</TableHead>
                    <TableHead className="text-center font-semibold border-b border-border/50">{isRTL ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRuns.map((run: any, idx: number) => (
                    <TableRow key={run.id} className={`cursor-pointer transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                      <TableCell className="font-mono text-sm border-b border-border/30">{run.run_number}</TableCell>
                      <TableCell className="font-medium border-b border-border/30">{monthName(run.period_month)} {run.period_year}</TableCell>
                      <TableCell className="text-sm text-muted-foreground border-b border-border/30">{run.run_date || "—"}</TableCell>
                      <TableCell className="text-end tabular-nums border-b border-border/30">{formatNum(run.total_basic || 0)}</TableCell>
                      <TableCell className="text-end tabular-nums text-emerald-600 border-b border-border/30">{formatNum(run.total_allowances || 0)}</TableCell>
                      <TableCell className="text-end tabular-nums text-destructive border-b border-border/30">{formatNum(run.total_deductions || 0)}</TableCell>
                      <TableCell className="text-end tabular-nums font-bold border-b border-border/30">{formatNum(run.total_net || 0)}</TableCell>
                      <TableCell className="text-center border-b border-border/30">{statusBadge(run.status)}</TableCell>
                      <TableCell className="border-b border-border/30">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title={isRTL ? "عرض" : "View"} onClick={() => setViewRun(run)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {run.status === "draft" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={isRTL ? "تعديل" : "Edit"} onClick={() => openEdit(run)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title={isRTL ? "اعتماد" : "Approve"} onClick={() => setConfirmAction({ type: "approve", run })}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title={isRTL ? "إلغاء" : "Cancel"} onClick={() => setConfirmAction({ type: "cancel", run })}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "approve"
                ? (isRTL ? "تأكيد اعتماد المسير" : "Confirm Approval")
                : (isRTL ? "تأكيد إلغاء المسير" : "Confirm Cancellation")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "approve"
                ? (isRTL
                  ? `سيتم إنشاء قيد محاسبي بتاريخ ${confirmAction?.run ? getLastDayOfMonth(confirmAction.run.period_year, confirmAction.run.period_month) : ""} وترحيل المسير. لا يمكن التراجع.`
                  : `A journal entry dated ${confirmAction?.run ? getLastDayOfMonth(confirmAction.run.period_year, confirmAction.run.period_month) : ""} will be created. This cannot be undone.`)
                : (isRTL ? "سيتم حذف المسير وجميع بياناته نهائياً. لا يمكن التراجع." : "The payroll run and all its data will be permanently deleted. This cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "رجوع" : "Back"}</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.type === "cancel" ? "bg-destructive hover:bg-destructive/90" : "bg-emerald-600 hover:bg-emerald-700"}
              onClick={() => {
                if (confirmAction?.type === "approve") approvePayrollMutation.mutate(confirmAction.run);
                else if (confirmAction?.type === "cancel") cancelPayrollMutation.mutate(confirmAction.run);
              }}
              disabled={approvePayrollMutation.isPending || cancelPayrollMutation.isPending}
            >
              {(approvePayrollMutation.isPending || cancelPayrollMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {confirmAction?.type === "approve" ? (isRTL ? "اعتماد" : "Approve") : (isRTL ? "إلغاء المسير" : "Cancel Run")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Payroll;
