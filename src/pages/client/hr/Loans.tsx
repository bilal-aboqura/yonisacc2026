import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Banknote, Loader2, ArrowLeft, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const emptyForm = { employee_id: "", loan_type: "advance", amount: 0, monthly_deduction: 0, start_date: new Date().toISOString().split("T")[0], notes: "" };

const Loans = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [viewLoan, setViewLoan] = useState<any>(null);
  const [deleteLoan, setDeleteLoan] = useState<any>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-active", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_employees").select("id, name, name_en, employee_number, account_id")
        .eq("company_id", companyId).eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["hr-loans", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_loans").select("*, hr_employees(name, name_en, employee_number)")
        .eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // --- Save (create new) ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      const emp = employees.find((e: any) => e.id === form.employee_id);
      if (!emp?.account_id) {
        throw new Error(isRTL ? "يجب ربط الموظف بحساب في دليل الحسابات أولاً" : "Employee must be linked to a ledger account first");
      }
      const { data: hrSettings } = await (supabase as any)
        .from("hr_account_settings").select("cash_account_id, bank_account_id")
        .eq("company_id", companyId).maybeSingle();
      const cashAccountId = hrSettings?.cash_account_id || hrSettings?.bank_account_id;
      if (!cashAccountId) {
        throw new Error(isRTL ? "يجب تجهيز حساب الصندوق أو البنك في إعدادات الموارد البشرية" : "Cash or bank account must be configured in HR settings");
      }

      const { error } = await (supabase as any).from("hr_loans").insert({
        ...form, company_id: companyId, remaining: form.amount, total_paid: 0,
      });
      if (error) throw error;

      // Journal entry
      const { data: settings } = await (supabase as any)
        .from("company_settings").select("journal_prefix, next_journal_number")
        .eq("company_id", companyId).maybeSingle();
      const prefix = settings?.journal_prefix || "JE-";
      let nextNum = settings?.next_journal_number || 1;
      const { data: allEntries } = await (supabase as any)
        .from("journal_entries").select("entry_number")
        .eq("company_id", companyId).order("created_at", { ascending: false }).limit(1);
      if (allEntries && allEntries.length > 0) {
        const lastNum = parseInt(allEntries[0].entry_number.replace(/[^0-9]/g, ""), 10) || 0;
        if (lastNum >= nextNum) nextNum = lastNum + 1;
      }
      const entryNumber = `${prefix}${String(nextNum).padStart(6, "0")}`;
      const desc = isRTL ? `سلفة موظف: ${emp?.name || ""}` : `Employee advance: ${emp?.name_en || emp?.name || ""}`;
      const { data: je, error: jeError } = await (supabase as any)
        .from("journal_entries").insert({
          company_id: companyId, entry_number: entryNumber, entry_date: form.start_date,
          description: desc, total_debit: form.amount, total_credit: form.amount,
          status: "posted", reference_type: "hr_loan", is_auto: true, created_by: null,
        }).select().single();
      if (jeError) throw jeError;
      await (supabase as any).from("journal_entry_lines").insert([
        { entry_id: je.id, account_id: emp.account_id, debit: form.amount, credit: 0, description: desc },
        { entry_id: je.id, account_id: cashAccountId, debit: 0, credit: form.amount, description: desc },
      ]);
      await (supabase as any).from("company_settings").update({ next_journal_number: nextNum + 1 }).eq("company_id", companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-loans"] });
      setShowForm(false);
      setEditingId(null);
      toast.success(isRTL ? "تم تسجيل السلفة مع القيد المحاسبي" : "Loan recorded with journal entry");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // --- Update (edit existing) ---
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await (supabase as any).from("hr_loans").update({
        employee_id: form.employee_id,
        loan_type: form.loan_type,
        amount: form.amount,
        monthly_deduction: form.monthly_deduction,
        start_date: form.start_date,
        notes: form.notes,
      }).eq("id", editingId).eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-loans"] });
      setShowForm(false);
      setEditingId(null);
      toast.success(isRTL ? "تم تحديث السلفة" : "Loan updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // --- Delete ---
  const deleteMutation = useMutation({
    mutationFn: async (loan: any) => {
      if ((loan.total_paid || 0) > 0) {
        throw new Error(isRTL ? "لا يمكن حذف السلفة لوجود خصومات مرتبطة بمسيرات رواتب" : "Cannot delete loan: payroll deductions already exist");
      }
      // Find and delete the associated journal entry
      const { data: je } = await (supabase as any)
        .from("journal_entries").select("id")
        .eq("company_id", companyId)
        .eq("reference_type", "hr_loan")
        .eq("is_auto", true)
        .eq("entry_date", loan.start_date)
        .eq("total_debit", loan.amount)
        .maybeSingle();
      if (je) {
        await (supabase as any).from("journal_entry_lines").delete().eq("entry_id", je.id);
        await (supabase as any).from("journal_entries").delete().eq("id", je.id);
      }
      const { error } = await (supabase as any).from("hr_loans").delete().eq("id", loan.id).eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-loans"] });
      setDeleteLoan(null);
      toast.success(isRTL ? "تم حذف السلفة والقيد المرتبط" : "Loan and related journal entry deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (loan: any) => {
    setForm({
      employee_id: loan.employee_id,
      loan_type: loan.loan_type,
      amount: loan.amount,
      monthly_deduction: loan.monthly_deduction,
      start_date: loan.start_date,
      notes: loan.notes || "",
    });
    setEditingId(loan.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  };

  const isSaving = saveMutation.isPending || updateMutation.isPending;

  const totalActive = loans.filter((l: any) => l.status === "active").reduce((s: number, l: any) => s + (l.remaining || 0), 0);

  const getEmployeeName = (loan: any) => {
    if (!loan.hr_employees) return "—";
    return isRTL ? loan.hr_employees.name : (loan.hr_employees.name_en || loan.hr_employees.name);
  };

  // ─── Form View ───
  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingId(null); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {editingId ? (isRTL ? "تعديل السلفة" : "Edit Advance") : (isRTL ? "إضافة سلفة" : "Add Advance")}
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الموظف" : "Employee"}</Label>
                <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employee_number} - {isRTL ? e.name : (e.name_en || e.name)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "النوع" : "Type"}</Label>
                <Select value={form.loan_type} onValueChange={(v) => setForm({ ...form, loan_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">{isRTL ? "سلفة" : "Advance"}</SelectItem>
                    <SelectItem value="loan">{isRTL ? "قرض" : "Loan"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>{isRTL ? "المبلغ" : "Amount"}</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "الاستقطاع الشهري" : "Monthly Deduction"}</Label><Input type="number" value={form.monthly_deduction} onChange={(e) => setForm({ ...form, monthly_deduction: +e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "تاريخ البدء" : "Start Date"}</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "ملاحظات" : "Notes"}</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={handleSave} disabled={isSaving || !form.employee_id || !form.amount}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {editingId ? (isRTL ? "تحديث" : "Update") : (isRTL ? "حفظ مع قيد محاسبي" : "Save with Journal Entry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main List View ───
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isRTL ? "السلف والقروض" : "Loans & Advances"}</h1>
        <Button onClick={() => { setForm({ ...emptyForm, start_date: new Date().toISOString().split("T")[0] }); setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة سلفة" : "Add Advance"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي السلف" : "Total Loans"}</p>
          <p className="text-2xl font-bold">{loans.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "الرصيد المتبقي" : "Remaining Balance"}</p>
          <p className="text-2xl font-bold text-destructive">{totalActive.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "نشطة" : "Active"}</p>
          <p className="text-2xl font-bold">{loans.filter((l: any) => l.status === "active").length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" />{isRTL ? "سجل السلف" : "Loans Record"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          loans.length === 0 ? <div className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد سلف" : "No loans"}</div> :
          <div className="overflow-auto rounded-lg border border-border/50">
            <Table>
              <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                <TableHead className="border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "النوع" : "Type"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "المبلغ" : "Amount"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "الاستقطاع الشهري" : "Monthly Ded."}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "المتبقي" : "Remaining"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead className="border-b border-border/50 w-[60px]">{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loans.map((l: any, idx: number) => (
                  <TableRow key={l.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                    <TableCell className="font-medium border-b border-border/30">{getEmployeeName(l)}</TableCell>
                    <TableCell className="border-b border-border/30">{l.loan_type === "advance" ? (isRTL ? "سلفة" : "Advance") : (isRTL ? "قرض" : "Loan")}</TableCell>
                    <TableCell className="border-b border-border/30 tabular-nums">{(l.amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="border-b border-border/30 tabular-nums">{(l.monthly_deduction || 0).toLocaleString()}</TableCell>
                    <TableCell className="border-b border-border/30 tabular-nums">{(l.remaining || 0).toLocaleString()}</TableCell>
                    <TableCell className="border-b border-border/30">
                      <Badge variant={l.status === "active" ? "default" : "secondary"}>
                        {l.status === "active" ? (isRTL ? "نشطة" : "Active") : (isRTL ? "مسددة" : "Paid")}
                      </Badge>
                    </TableCell>
                    <TableCell className="border-b border-border/30">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRTL ? "start" : "end"}>
                          <DropdownMenuItem onClick={() => setViewLoan(l)}>
                            <Eye className="h-4 w-4 me-2" />{isRTL ? "عرض" : "View"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(l)}>
                            <Pencil className="h-4 w-4 me-2" />{isRTL ? "تعديل" : "Edit"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if ((l.total_paid || 0) > 0) {
                                toast.error(isRTL ? "لا يمكن حذف السلفة لوجود خصومات مرتبطة بمسيرات رواتب" : "Cannot delete: payroll deductions exist");
                                return;
                              }
                              setDeleteLoan(l);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 me-2" />{isRTL ? "حذف" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>}
        </CardContent>
      </Card>

      {/* ─── View Dialog ─── */}
      <Dialog open={!!viewLoan} onOpenChange={(open) => !open && setViewLoan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isRTL ? "تفاصيل السلفة" : "Loan Details"}</DialogTitle>
          </DialogHeader>
          {viewLoan && (
            <div className="space-y-3 text-sm">
              <DetailRow label={isRTL ? "الموظف" : "Employee"} value={getEmployeeName(viewLoan)} />
              <DetailRow label={isRTL ? "النوع" : "Type"} value={viewLoan.loan_type === "advance" ? (isRTL ? "سلفة" : "Advance") : (isRTL ? "قرض" : "Loan")} />
              <DetailRow label={isRTL ? "المبلغ" : "Amount"} value={(viewLoan.amount || 0).toLocaleString()} />
              <DetailRow label={isRTL ? "الاستقطاع الشهري" : "Monthly Deduction"} value={(viewLoan.monthly_deduction || 0).toLocaleString()} />
              <DetailRow label={isRTL ? "المدفوع" : "Total Paid"} value={(viewLoan.total_paid || 0).toLocaleString()} />
              <DetailRow label={isRTL ? "المتبقي" : "Remaining"} value={(viewLoan.remaining || 0).toLocaleString()} />
              <DetailRow label={isRTL ? "تاريخ البدء" : "Start Date"} value={viewLoan.start_date} />
              <DetailRow label={isRTL ? "الحالة" : "Status"} value={
                <Badge variant={viewLoan.status === "active" ? "default" : "secondary"}>
                  {viewLoan.status === "active" ? (isRTL ? "نشطة" : "Active") : (isRTL ? "مسددة" : "Paid")}
                </Badge>
              } />
              {viewLoan.notes && <DetailRow label={isRTL ? "ملاحظات" : "Notes"} value={viewLoan.notes} />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={!!deleteLoan} onOpenChange={(open) => !open && setDeleteLoan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `هل أنت متأكد من حذف سلفة الموظف "${deleteLoan ? getEmployeeName(deleteLoan) : ""}"؟ سيتم حذف القيد المحاسبي المرتبط أيضاً. لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete the loan for "${deleteLoan ? getEmployeeName(deleteLoan) : ""}"? The related journal entry will also be deleted. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLoan && deleteMutation.mutate(deleteLoan.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default Loans;
