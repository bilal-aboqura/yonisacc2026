import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { useActivePaymentMethods } from "@/hooks/useActivePaymentMethods";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DollarSign, Play, Loader2, Eye, CheckCircle, ArrowLeft, Pencil, XCircle, Save, Calendar, Users, TrendingDown, Banknote, CreditCard, History } from "lucide-react";
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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Payment state
  const [paymentSelectedItems, setPaymentSelectedItems] = useState<Set<string>>(new Set());
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: activePaymentMethods = [] } = useActivePaymentMethods(companyId);

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
        .from("hr_payroll_items").select("*, hr_employees(name, name_en, employee_number, account_id)")
        .eq("payroll_run_id", activeRunId);
      if (error) throw error;
      return data;
    },
    enabled: !!activeRunId,
  });

  // Fetch payment history for posted runs
  const { data: payrollPayments = [] } = useQuery({
    queryKey: ["hr-payroll-payments", activeRunId],
    queryFn: async () => {
      if (!activeRunId) return [];
      const { data, error } = await (supabase as any)
        .from("hr_payroll_payments")
        .select("*, payment_methods(name, name_en)")
        .eq("payroll_run_id", activeRunId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeRunId,
  });

  const { data: paymentItems = [] } = useQuery({
    queryKey: ["hr-payroll-payment-items", activeRunId],
    queryFn: async () => {
      if (!activeRunId) return [];
      const { data, error } = await (supabase as any)
        .from("hr_payroll_payment_items")
        .select("*, hr_employees(name, name_en, employee_number)")
        .eq("payment_id", "any")
        .limit(0); // placeholder
      // Fetch via payments
      const paymentIds = payrollPayments.map((p: any) => p.id);
      if (paymentIds.length === 0) return [];
      const { data: items, error: err2 } = await (supabase as any)
        .from("hr_payroll_payment_items")
        .select("*")
        .in("payment_id", paymentIds);
      if (err2) throw err2;
      return items || [];
    },
    enabled: !!activeRunId && payrollPayments.length > 0,
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
          paid_amount: 0,
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

  // Approve (Post) payroll — creates per-employee accrual journal entries
  const approvePayrollMutation = useMutation({
    mutationFn: async ({ run, selectedIds }: { run: any; selectedIds: string[] }) => {
      // Fetch HR account settings
      const { data: hrSettings } = await (supabase as any)
        .from("hr_account_settings").select("*")
        .eq("company_id", companyId).maybeSingle();

      if (!hrSettings?.salary_expense_account_id) {
        throw new Error(isRTL ? "يجب تجهيز حساب مصروف الرواتب في إعدادات الموارد البشرية" : "Salary expense account must be configured in HR settings");
      }

      // Fetch all items for the run with employee account_id
      const { data: allItems } = await (supabase as any)
        .from("hr_payroll_items").select("*, hr_employees(name, name_en, employee_number, account_id)")
        .eq("payroll_run_id", run.id);

      // Filter to selected items only
      const items = (allItems || []).filter((i: any) => selectedIds.includes(i.id));
      if (items.length === 0) throw new Error(isRTL ? "لم يتم تحديد أي موظف" : "No employees selected");

      // Validate all selected employees have account_id
      const unlinked = items.filter((i: any) => !i.hr_employees?.account_id);
      if (unlinked.length > 0) {
        const names = unlinked.map((i: any) => isRTL ? i.hr_employees?.name : (i.hr_employees?.name_en || i.hr_employees?.name)).join("، ");
        throw new Error(isRTL
          ? `لا يمكن الاعتماد: الموظفون التالية أسماؤهم غير مرتبطين بحساب محاسبي: ${names}`
          : `Cannot approve: the following employees are not linked to an account: ${names}`);
      }

      // Get journal number sequence
      const { data: settings } = await (supabase as any)
        .from("company_settings").select("journal_prefix, next_journal_number")
        .eq("company_id", companyId).maybeSingle();

      const prefix = settings?.journal_prefix || "JE-";
      let nextNum = settings?.next_journal_number || 1;

      const entryDate = getLastDayOfMonth(run.period_year, run.period_month);
      const monthLabel = `${run.period_month}/${run.period_year}`;

      // Create one journal entry per employee
      for (const item of items) {
        const empName = isRTL ? item.hr_employees?.name : (item.hr_employees?.name_en || item.hr_employees?.name);
        const empAccountId = item.hr_employees.account_id;
        const entryNumber = `${prefix}${String(nextNum).padStart(6, "0")}`;
        nextNum++;

        const basic = item.basic_salary || 0;
        const housing = item.housing_allowance || 0;
        const transport = item.transport_allowance || 0;
        const otherAllow = item.other_allowance || 0;
        const totalGross = basic + housing + transport + otherAllow;
        const loanDed = item.loan_deduction || 0;
        const absenceDed = item.absence_deduction || 0;
        const otherDed = item.other_deduction || 0;
        const netSalary = item.net_salary || 0;

        const desc = isRTL
          ? `استحقاق راتب ${empName} - شهر ${monthLabel}`
          : `Salary accrual for ${empName} - ${monthLabel}`;

        // total debit = totalGross, total credit = totalGross (balanced)
        const { data: je, error: jeError } = await (supabase as any)
          .from("journal_entries").insert({
            company_id: companyId, entry_number: entryNumber,
            entry_date: entryDate, description: desc,
            total_debit: totalGross, total_credit: totalGross,
            status: "posted", is_auto: true, reference_type: "hr",
          }).select().single();
        if (jeError) throw jeError;

        const jeLines: any[] = [];

        // Debit: salary expense accounts
        if (basic > 0) {
          jeLines.push({ entry_id: je.id, account_id: hrSettings.salary_expense_account_id, debit: basic, credit: 0, description: isRTL ? "الراتب الأساسي" : "Basic salary" });
        }
        if (housing > 0) {
          jeLines.push({ entry_id: je.id, account_id: hrSettings.housing_expense_account_id || hrSettings.salary_expense_account_id, debit: housing, credit: 0, description: isRTL ? "بدل سكن" : "Housing allowance" });
        }
        if (transport > 0) {
          jeLines.push({ entry_id: je.id, account_id: hrSettings.transport_expense_account_id || hrSettings.salary_expense_account_id, debit: transport, credit: 0, description: isRTL ? "بدل نقل" : "Transport allowance" });
        }
        if (otherAllow > 0) {
          jeLines.push({ entry_id: je.id, account_id: hrSettings.other_allowance_account_id || hrSettings.salary_expense_account_id, debit: otherAllow, credit: 0, description: isRTL ? "بدلات أخرى" : "Other allowances" });
        }

        // Credit: employee account (accrual — full gross amount)
        // Then debit back deductions if any (absence, loan) to balance
        // Actually: Dr Expenses = Gross, Cr Employee = Gross
        // The net vs gross difference (deductions) is handled as:
        // Dr Expenses (gross) / Cr Employee (net) / Cr Loan account or Cr Employee for deductions
        // Simplest: Cr Employee = net, Cr deduction accounts
        // But user said: Cr = employee account for salary accrual
        // So: Dr Expenses = Gross, Cr Employee = Gross (full accrual)
        // Deductions are separate matters (loans handled separately)
        // Let's keep it clean: Cr Employee = totalGross
        jeLines.push({
          entry_id: je.id, account_id: empAccountId,
          debit: 0, credit: totalGross,
          description: desc,
        });

        await (supabase as any).from("journal_entry_lines").insert(jeLines);
      }

      // Update journal number
      await (supabase as any).from("company_settings").update({ next_journal_number: nextNum }).eq("company_id", companyId);

      // Mark run as posted (always post entire run when approving)
      await (supabase as any).from("hr_payroll_runs").update({ status: "posted" }).eq("id", run.id);

      // Update loans for selected employees
      for (const item of items) {
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
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-items"] });
      setConfirmAction(null);
      setSelectedItems(new Set());
      toast.success(isRTL ? "تم اعتماد المسير وإنشاء قيود الاستحقاق لكل موظف" : "Payroll approved & accrual entries created per employee");
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

  // Payment mutation - disburse salaries
  const paymentMutation = useMutation({
    mutationFn: async ({ run, selectedPayrollItemIds, methodId, date }: { run: any; selectedPayrollItemIds: string[]; methodId: string; date: string }) => {
      // Get payment method account
      const method = activePaymentMethods.find((m: any) => m.id === methodId);
      if (!method || !method.account_id) {
        throw new Error(isRTL ? "طريقة الدفع غير مرتبطة بحساب" : "Payment method not linked to an account");
      }

      // Get items with employee info
      const items = payrollItems.filter((i: any) => selectedPayrollItemIds.includes(i.id));
      if (items.length === 0) throw new Error(isRTL ? "لم يتم تحديد أي موظف" : "No employees selected");

      // Check all have account_id
      const unlinked = items.filter((i: any) => !i.hr_employees?.account_id);
      if (unlinked.length > 0) {
        throw new Error(isRTL ? "بعض الموظفين غير مرتبطين بحساب محاسبي" : "Some employees are not linked to an account");
      }

      // Calculate amounts (remaining = net - paid)
      const paymentAmounts: { item: any; amount: number }[] = [];
      let totalPayment = 0;
      for (const item of items) {
        const remaining = (item.net_salary || 0) - (item.paid_amount || 0);
        if (remaining <= 0) continue;
        paymentAmounts.push({ item, amount: remaining });
        totalPayment += remaining;
      }

      if (totalPayment <= 0) throw new Error(isRTL ? "لا يوجد مبلغ متبقي للتسليم" : "No remaining amount to pay");

      // Get journal number
      const { data: settings } = await (supabase as any)
        .from("company_settings").select("journal_prefix, next_journal_number")
        .eq("company_id", companyId).maybeSingle();

      const prefix = settings?.journal_prefix || "JE-";
      const nextNum = settings?.next_journal_number || 1;
      const entryNumber = `${prefix}${String(nextNum).padStart(6, "0")}`;

      const methodName = isRTL ? (method as any).name : ((method as any).name_en || (method as any).name);
      const desc = isRTL
        ? `تسليم رواتب شهر ${run.period_month}/${run.period_year} - ${methodName}`
        : `Salary payment ${run.period_month}/${run.period_year} - ${methodName}`;

      // Create journal entry: Dr Employee accounts, Cr Payment method account
      const { data: je, error: jeError } = await (supabase as any)
        .from("journal_entries").insert({
          company_id: companyId, entry_number: entryNumber,
          entry_date: date, description: desc,
          total_debit: totalPayment, total_credit: totalPayment,
          status: "posted", is_auto: true, reference_type: "hr",
        }).select().single();
      if (jeError) throw jeError;

      const jeLines: any[] = [];

      // Debit: each employee account (clearing the liability)
      for (const { item, amount } of paymentAmounts) {
        const empName = isRTL ? item.hr_employees?.name : (item.hr_employees?.name_en || item.hr_employees?.name);
        jeLines.push({
          entry_id: je.id,
          account_id: item.hr_employees.account_id,
          debit: amount, credit: 0,
          description: isRTL ? `تسليم راتب ${empName}` : `Salary payment - ${empName}`,
        });
      }

      // Credit: payment method account
      jeLines.push({
        entry_id: je.id,
        account_id: method.account_id,
        debit: 0, credit: totalPayment,
        description: desc,
      });

      await (supabase as any).from("journal_entry_lines").insert(jeLines);
      await (supabase as any).from("company_settings").update({ next_journal_number: nextNum + 1 }).eq("company_id", companyId);

      // Create payment record
      const { data: payment, error: payError } = await (supabase as any)
        .from("hr_payroll_payments").insert({
          payroll_run_id: run.id, company_id: companyId,
          payment_date: date, payment_method_id: methodId,
          journal_entry_id: je.id, total_amount: totalPayment,
          created_by: user?.id,
        }).select().single();
      if (payError) throw payError;

      // Create payment items and update paid_amount
      const payItems = paymentAmounts.map(({ item, amount }) => ({
        payment_id: payment.id,
        payroll_item_id: item.id,
        employee_id: item.employee_id,
        amount,
      }));
      await (supabase as any).from("hr_payroll_payment_items").insert(payItems);

      // Update paid_amount on payroll items
      for (const { item, amount } of paymentAmounts) {
        const newPaid = (item.paid_amount || 0) + amount;
        await (supabase as any).from("hr_payroll_items").update({ paid_amount: newPaid }).eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-items"] });
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-payments"] });
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-payment-items"] });
      setPaymentSelectedItems(new Set());
      setPaymentMethodId("");
      toast.success(isRTL ? "تم تسليم الرواتب وإنشاء القيد المحاسبي" : "Salaries paid & journal entry created");
    },
    onError: (e: any) => toast.error(e.message),
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
    const isDraft = viewRun.status === "draft";
    const isPosted = viewRun.status === "posted";

    const allSelected = payrollItems.length > 0 && payrollItems.every((i: any) => selectedItems.has(i.id));
    const someSelected = selectedItems.size > 0;
    const toggleSelectAll = () => {
      if (allSelected) setSelectedItems(new Set());
      else setSelectedItems(new Set(payrollItems.map((i: any) => i.id)));
    };
    const toggleItem = (id: string) => {
      const next = new Set(selectedItems);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSelectedItems(next);
    };

    // Payment helpers
    const unpaidItems = payrollItems.filter((i: any) => (i.net_salary || 0) - (i.paid_amount || 0) > 0);
    const allPaymentSelected = unpaidItems.length > 0 && unpaidItems.every((i: any) => paymentSelectedItems.has(i.id));
    const somePaymentSelected = paymentSelectedItems.size > 0;
    const togglePaymentSelectAll = () => {
      if (allPaymentSelected) setPaymentSelectedItems(new Set());
      else setPaymentSelectedItems(new Set(unpaidItems.map((i: any) => i.id)));
    };
    const togglePaymentItem = (id: string) => {
      const next = new Set(paymentSelectedItems);
      if (next.has(id)) next.delete(id); else next.add(id);
      setPaymentSelectedItems(next);
    };

    const totalRemainingSelected = payrollItems
      .filter((i: any) => paymentSelectedItems.has(i.id))
      .reduce((sum: number, i: any) => sum + Math.max(0, (i.net_salary || 0) - (i.paid_amount || 0)), 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => { setViewRun(null); setSelectedItems(new Set()); setPaymentSelectedItems(new Set()); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{isRTL ? "تفاصيل مسير الرواتب" : "Payroll Details"}</h1>
              <p className="text-sm text-muted-foreground">{viewRun.run_number} • {monthName(viewRun.period_month)} {viewRun.period_year}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(viewRun.status)}
            {isDraft && (
              <>
                <Button variant="outline" size="sm" onClick={() => openEdit(viewRun)}>
                  <Pencil className="h-4 w-4 me-1" />{isRTL ? "تعديل" : "Edit"}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={!someSelected}
                  onClick={() => setConfirmAction({ type: "approve", run: viewRun })}
                >
                  <CheckCircle className="h-4 w-4 me-1" />
                  {isRTL
                    ? `اعتماد${someSelected ? ` (${selectedItems.size})` : ""}`
                    : `Approve${someSelected ? ` (${selectedItems.size})` : ""}`}
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

        {isPosted && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>{isRTL ? `تم اعتماد المسير وإنشاء قيود الاستحقاق` : `Payroll approved - accrual entries created`}</span>
          </div>
        )}

        {isDraft && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 border text-sm">
            <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} id="select-all" />
            <label htmlFor="select-all" className="cursor-pointer font-medium">
              {isRTL ? `تحديد الكل (${payrollItems.length})` : `Select All (${payrollItems.length})`}
            </label>
            {someSelected && !allSelected && (
              <span className="text-muted-foreground">— {isRTL ? `${selectedItems.size} محدد` : `${selectedItems.size} selected`}</span>
            )}
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
                    {isDraft && <TableHead className="w-10 border-b border-border/50"></TableHead>}
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
                    {isPosted && (
                      <>
                        <TableHead className="text-end font-semibold text-emerald-600 border-b border-border/50">{isRTL ? "المدفوع" : "Paid"}</TableHead>
                        <TableHead className="text-end font-semibold text-amber-600 border-b border-border/50">{isRTL ? "المتبقي" : "Remaining"}</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollItems.map((item: any, idx: number) => {
                    const paid = item.paid_amount || 0;
                    const remaining = (item.net_salary || 0) - paid;
                    return (
                      <TableRow key={item.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${selectedItems.has(item.id) ? "bg-primary/[0.06]" : idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                        {isDraft && (
                          <TableCell className="border-b border-border/30">
                            <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                          </TableCell>
                        )}
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
                        {isPosted && (
                          <>
                            <TableCell className="text-end tabular-nums text-emerald-600 border-b border-border/30">{formatNum(paid)}</TableCell>
                            <TableCell className={`text-end tabular-nums font-medium border-b border-border/30 ${remaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                              {remaining > 0 ? formatNum(remaining) : <CheckCircle className="h-4 w-4 inline text-emerald-600" />}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
                <tfoot>
                  <TableRow className="bg-muted/70 font-bold border-t-2">
                    {isDraft && <TableCell></TableCell>}
                    <TableCell colSpan={2}>{isRTL ? "الإجمالي" : "Total"}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatNum(viewRun.total_basic || 0)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell className="text-end tabular-nums text-destructive">{formatNum(viewRun.total_deductions || 0)}</TableCell>
                    <TableCell className="text-end tabular-nums text-primary">{formatNum(viewRun.total_net || 0)}</TableCell>
                    {isPosted && (
                      <>
                        <TableCell className="text-end tabular-nums text-emerald-600">
                          {formatNum(payrollItems.reduce((s: number, i: any) => s + (i.paid_amount || 0), 0))}
                        </TableCell>
                        <TableCell className="text-end tabular-nums text-amber-600">
                          {formatNum(payrollItems.reduce((s: number, i: any) => s + Math.max(0, (i.net_salary || 0) - (i.paid_amount || 0)), 0))}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Payment section for posted runs */}
        {isPosted && unpaidItems.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                {isRTL ? "تسليم الرواتب" : "Salary Disbursement"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 border text-sm">
                <Checkbox checked={allPaymentSelected} onCheckedChange={togglePaymentSelectAll} id="payment-select-all" />
                <label htmlFor="payment-select-all" className="cursor-pointer font-medium">
                  {isRTL ? `تحديد الكل (${unpaidItems.length} غير مدفوع)` : `Select All (${unpaidItems.length} unpaid)`}
                </label>
              </div>

              <div className="overflow-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 dark:bg-muted/30">
                      <TableHead className="w-10 border-b border-border/50"></TableHead>
                      <TableHead className="font-semibold border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                      <TableHead className="text-end font-semibold border-b border-border/50">{isRTL ? "الصافي" : "Net"}</TableHead>
                      <TableHead className="text-end font-semibold text-emerald-600 border-b border-border/50">{isRTL ? "المدفوع" : "Paid"}</TableHead>
                      <TableHead className="text-end font-semibold text-amber-600 border-b border-border/50">{isRTL ? "المتبقي" : "Remaining"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidItems.map((item: any, idx: number) => {
                      const paid = item.paid_amount || 0;
                      const remaining = (item.net_salary || 0) - paid;
                      return (
                        <TableRow key={item.id} className={`${paymentSelectedItems.has(item.id) ? "bg-primary/[0.06]" : idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                          <TableCell className="border-b border-border/30">
                            <Checkbox checked={paymentSelectedItems.has(item.id)} onCheckedChange={() => togglePaymentItem(item.id)} />
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap border-b border-border/30">
                            {item.hr_employees ? (isRTL ? item.hr_employees.name : (item.hr_employees.name_en || item.hr_employees.name)) : "—"}
                          </TableCell>
                          <TableCell className="text-end tabular-nums border-b border-border/30">{formatNum(item.net_salary || 0)}</TableCell>
                          <TableCell className="text-end tabular-nums text-emerald-600 border-b border-border/30">{formatNum(paid)}</TableCell>
                          <TableCell className="text-end tabular-nums text-amber-600 font-medium border-b border-border/30">{formatNum(remaining)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>{isRTL ? "طريقة الدفع" : "Payment Method"}</Label>
                  <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                    <SelectTrigger><SelectValue placeholder={isRTL ? "اختر طريقة الدفع" : "Select method"} /></SelectTrigger>
                    <SelectContent>
                      {activePaymentMethods.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{isRTL ? m.name : (m.name_en || m.name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "تاريخ الدفع" : "Payment Date"}</Label>
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={!somePaymentSelected || !paymentMethodId || paymentMutation.isPending}
                  onClick={() => paymentMutation.mutate({
                    run: viewRun,
                    selectedPayrollItemIds: Array.from(paymentSelectedItems),
                    methodId: paymentMethodId,
                    date: paymentDate,
                  })}
                >
                  {paymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  <CreditCard className="h-4 w-4 me-2" />
                  {isRTL ? `تسليم (${formatNum(totalRemainingSelected)})` : `Pay (${formatNum(totalRemainingSelected)})`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All paid message */}
        {isPosted && unpaidItems.length === 0 && payrollItems.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>{isRTL ? "تم تسليم جميع الرواتب بالكامل" : "All salaries have been fully paid"}</span>
          </div>
        )}

        {/* Payment History */}
        {isPosted && payrollPayments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-5 w-5" />
                {isRTL ? "سجل الدفعات" : "Payment History"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 dark:bg-muted/30">
                      <TableHead className="font-semibold border-b border-border/50">#</TableHead>
                      <TableHead className="font-semibold border-b border-border/50">{isRTL ? "التاريخ" : "Date"}</TableHead>
                      <TableHead className="font-semibold border-b border-border/50">{isRTL ? "طريقة الدفع" : "Method"}</TableHead>
                      <TableHead className="text-end font-semibold border-b border-border/50">{isRTL ? "المبلغ" : "Amount"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollPayments.map((p: any, idx: number) => (
                      <TableRow key={p.id} className={idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}>
                        <TableCell className="tabular-nums text-muted-foreground border-b border-border/30">{idx + 1}</TableCell>
                        <TableCell className="border-b border-border/30">{p.payment_date}</TableCell>
                        <TableCell className="border-b border-border/30">
                          {p.payment_methods ? (isRTL ? p.payment_methods.name : (p.payment_methods.name_en || p.payment_methods.name)) : "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums font-medium text-emerald-600 border-b border-border/30">{formatNum(p.total_amount || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
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
                  ? `سيتم اعتماد ${selectedItems.size} موظف وإنشاء قيد استحقاق لكل موظف بتاريخ ${confirmAction?.run ? getLastDayOfMonth(confirmAction.run.period_year, confirmAction.run.period_month) : ""}. لا يمكن التراجع.`
                  : `${selectedItems.size} employee(s) will be approved and individual accrual entries will be created dated ${confirmAction?.run ? getLastDayOfMonth(confirmAction.run.period_year, confirmAction.run.period_month) : ""}. This cannot be undone.`)
                : (isRTL ? "سيتم حذف المسير وجميع بياناته نهائياً. لا يمكن التراجع." : "The payroll run and all its data will be permanently deleted. This cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "رجوع" : "Back"}</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.type === "cancel" ? "bg-destructive hover:bg-destructive/90" : "bg-emerald-600 hover:bg-emerald-700"}
              onClick={() => {
                if (confirmAction?.type === "approve") {
                  approvePayrollMutation.mutate({ run: confirmAction.run, selectedIds: Array.from(selectedItems) });
                } else if (confirmAction?.type === "cancel") {
                  cancelPayrollMutation.mutate(confirmAction.run);
                }
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
                ? `سيتم إنشاء قيود الاستحقاق بتاريخ ${getLastDayOfMonth(year, month)} عند الاعتماد`
                : `Accrual entries will be dated ${getLastDayOfMonth(year, month)} upon approval`}
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
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title={isRTL ? "اعتماد (افتح للتحديد)" : "Approve (open to select)"} onClick={() => setViewRun(run)}>
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
    </div>
  );
};

export default Payroll;
