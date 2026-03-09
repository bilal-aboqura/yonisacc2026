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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MinusCircle, Loader2, ArrowLeft, MoreHorizontal, Eye, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

const DEDUCTION_TYPES: Record<string, [string, string]> = {
  penalty: ["جزاء / مخالفة", "Penalty / Violation"],
  absence: ["غياب", "Absence"],
  late: ["تأخير", "Lateness"],
  other: ["أخرى", "Other"],
};

const MONTHS = [
  ["يناير", "January"], ["فبراير", "February"], ["مارس", "March"],
  ["أبريل", "April"], ["مايو", "May"], ["يونيو", "June"],
  ["يوليو", "July"], ["أغسطس", "August"], ["سبتمبر", "September"],
  ["أكتوبر", "October"], ["نوفمبر", "November"], ["ديسمبر", "December"],
];

const emptyForm = {
  employee_id: "", deduction_type: "penalty", penalty_rule_id: "", occurrence_number: 1,
  amount: 0, deduction_date: new Date().toISOString().split("T")[0],
  description: "", description_en: "", notes: "",
  target_month: new Date().getMonth() + 1, target_year: new Date().getFullYear(),
  total_installments: 1,
};

const Deductions = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [form, setForm] = useState(emptyForm);
  const [viewDeduction, setViewDeduction] = useState<any>(null);
  const [deleteDeduction, setDeleteDeduction] = useState<any>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-active-deductions", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_employees").select("id, name, name_en, employee_number, account_id")
        .eq("company_id", companyId).eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: penaltyRules = [] } = useQuery({
    queryKey: ["hr-penalty-rules-active", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_penalty_rules").select("*")
        .eq("company_id", companyId).eq("is_active", true).order("violation_code");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: deductions = [], isLoading } = useQuery({
    queryKey: ["hr-deductions", companyId, filterMonth],
    queryFn: async () => {
      const startDate = `${filterMonth}-01`;
      const endDate = new Date(parseInt(filterMonth.split("-")[0]), parseInt(filterMonth.split("-")[1]), 0).toISOString().split("T")[0];
      const { data, error } = await (supabase as any)
        .from("hr_deductions")
        .select("*, hr_employees(name, name_en, employee_number), hr_penalty_rules(violation_name, violation_name_en, violation_code)")
        .eq("company_id", companyId)
        .gte("deduction_date", startDate)
        .lte("deduction_date", endDate)
        .order("deduction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  const createJournalEntry = async (emp: any, amount: number, date: string) => {
    const { data: hrSettings } = await (supabase as any)
      .from("hr_account_settings").select("penalties_revenue_account_id")
      .eq("company_id", companyId).maybeSingle();
    const penaltiesAccountId = hrSettings?.penalties_revenue_account_id;
    if (!penaltiesAccountId) {
      throw new Error(isRTL ? "يجب تجهيز حساب إيرادات الجزاءات في إعدادات الموارد البشرية" : "Penalties revenue account must be configured in HR settings");
    }
    if (!emp?.account_id) {
      throw new Error(isRTL ? "يجب ربط الموظف بحساب في دليل الحسابات أولاً" : "Employee must be linked to a ledger account first");
    }

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
    const desc = isRTL ? `خصم موظف: ${emp.name}` : `Employee deduction: ${emp.name_en || emp.name}`;

    const { data: je, error: jeError } = await (supabase as any)
      .from("journal_entries").insert({
        company_id: companyId, entry_number: entryNumber, entry_date: date,
        description: desc, total_debit: amount, total_credit: amount,
        status: "posted", reference_type: "hr_deduction", is_auto: true, created_by: null,
      }).select().single();
    if (jeError) throw jeError;

    await (supabase as any).from("journal_entry_lines").insert([
      { entry_id: je.id, account_id: emp.account_id, debit: amount, credit: 0, description: desc },
      { entry_id: je.id, account_id: penaltiesAccountId, debit: 0, credit: amount, description: desc },
    ]);
    await (supabase as any).from("company_settings").update({ next_journal_number: nextNum + 1 }).eq("company_id", companyId);
    return je.id;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const emp = employees.find((e: any) => e.id === form.employee_id);
      if (!emp) throw new Error(isRTL ? "يجب اختيار الموظف" : "Employee required");

      const totalInstallments = form.total_installments || 1;
      const installmentAmount = Math.round((form.amount / totalInstallments) * 100) / 100;

      // Create journal entry for full amount
      const journalEntryId = await createJournalEntry(emp, form.amount, form.deduction_date);

      // Create deduction records (one per installment)
      const records = [];
      for (let i = 0; i < totalInstallments; i++) {
        let month = form.target_month + i;
        let year = form.target_year;
        while (month > 12) { month -= 12; year += 1; }
        const isLast = i === totalInstallments - 1;
        const amt = isLast ? form.amount - installmentAmount * (totalInstallments - 1) : installmentAmount;
        records.push({
          company_id: companyId,
          employee_id: form.employee_id,
          deduction_type: form.deduction_type,
          penalty_rule_id: form.penalty_rule_id || null,
          occurrence_number: form.occurrence_number,
          amount: amt,
          deduction_date: form.deduction_date,
          description: form.description || null,
          description_en: form.description_en || null,
          notes: form.notes || null,
          target_month: month,
          target_year: year,
          installment_number: i + 1,
          total_installments: totalInstallments,
          journal_entry_id: journalEntryId,
        });
      }
      const { error } = await (supabase as any).from("hr_deductions").insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-deductions"] });
      resetForm();
      toast.success(isRTL ? "تم إضافة الخصم مع القيد المحاسبي" : "Deduction added with journal entry");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await (supabase as any).from("hr_deductions").update({
        employee_id: form.employee_id,
        deduction_type: form.deduction_type,
        penalty_rule_id: form.penalty_rule_id || null,
        occurrence_number: form.occurrence_number,
        amount: form.amount,
        deduction_date: form.deduction_date,
        description: form.description || null,
        description_en: form.description_en || null,
        notes: form.notes || null,
        target_month: form.target_month,
        target_year: form.target_year,
      }).eq("id", editingId).eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-deductions"] });
      resetForm();
      toast.success(isRTL ? "تم تحديث الخصم" : "Deduction updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ded: any) => {
      if (ded.is_applied) {
        throw new Error(isRTL ? "لا يمكن حذف خصم تم تنفيذه في مسير رواتب" : "Cannot delete a deduction applied in payroll");
      }
      if (ded.journal_entry_id) {
        await (supabase as any).from("journal_entry_lines").delete().eq("entry_id", ded.journal_entry_id);
        await (supabase as any).from("journal_entries").delete().eq("id", ded.journal_entry_id);
      }
      const { error } = await (supabase as any).from("hr_deductions").delete().eq("id", ded.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-deductions"] });
      setDeleteDeduction(null);
      toast.success(isRTL ? "تم حذف الخصم والقيد المرتبط" : "Deduction and journal entry deleted");
    },
    onError: (e: any) => { setDeleteDeduction(null); toast.error(e.message); },
  });

  const handleRuleSelect = (ruleId: string) => {
    const rule = penaltyRules.find((r: any) => r.id === ruleId);
    if (rule) {
      setForm({ ...form, penalty_rule_id: ruleId, description: rule.violation_name, description_en: rule.violation_name_en || "" });
    }
  };

  const handleEdit = (d: any) => {
    setForm({
      employee_id: d.employee_id, deduction_type: d.deduction_type,
      penalty_rule_id: d.penalty_rule_id || "", occurrence_number: d.occurrence_number || 1,
      amount: d.amount, deduction_date: d.deduction_date,
      description: d.description || "", description_en: d.description_en || "",
      notes: d.notes || "", target_month: d.target_month || new Date().getMonth() + 1,
      target_year: d.target_year || new Date().getFullYear(), total_installments: d.total_installments || 1,
    });
    setEditingId(d.id);
    setShowForm(true);
  };

  const filteredDeductions = deductions.filter((d: any) => {
    const matchType = filterType === "all" || d.deduction_type === filterType;
    const empName = d.hr_employees?.name || "";
    const empNum = d.hr_employees?.employee_number || "";
    const matchSearch = !search || empName.includes(search) || empNum.includes(search);
    return matchType && matchSearch;
  });

  const totalAmount = filteredDeductions.reduce((s: number, d: any) => s + (d.amount || 0), 0);
  const appliedCount = filteredDeductions.filter((d: any) => d.is_applied).length;

  // ======= FORM VIEW =======
  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={resetForm}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold">{editingId ? (isRTL ? "تعديل خصم" : "Edit Deduction") : (isRTL ? "إضافة خصم" : "Add Deduction")}</h1>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الموظف" : "Employee"} <span className="text-destructive">*</span></Label>
                <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الموظف" : "Select Employee"} /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.employee_number} - {isRTL ? e.name : (e.name_en || e.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "نوع الخصم" : "Deduction Type"}</Label>
                <Select value={form.deduction_type} onValueChange={(v) => setForm({ ...form, deduction_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEDUCTION_TYPES).map(([key, [ar, en]]) => (
                      <SelectItem key={key} value={key}>{isRTL ? ar : en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.deduction_type === "penalty" && (
                <div className="space-y-2 md:col-span-2">
                  <Label>{isRTL ? "المخالفة (من جدول الجزاءات)" : "Violation (from penalty rules)"}</Label>
                  <Select value={form.penalty_rule_id} onValueChange={handleRuleSelect}>
                    <SelectTrigger><SelectValue placeholder={isRTL ? "اختر المخالفة" : "Select violation"} /></SelectTrigger>
                    <SelectContent>
                      {penaltyRules.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.violation_code} - {isRTL ? r.violation_name : (r.violation_name_en || r.violation_name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.deduction_type === "penalty" && (
                <div className="space-y-2">
                  <Label>{isRTL ? "رقم المرة (التكرار)" : "Occurrence #"}</Label>
                  <Select value={String(form.occurrence_number)} onValueChange={(v) => setForm({ ...form, occurrence_number: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {isRTL ? `المرة ${n}` : `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{isRTL ? "المبلغ الإجمالي" : "Total Amount"} <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "تاريخ الخصم" : "Deduction Date"}</Label>
                <Input type="date" value={form.deduction_date} onChange={(e) => setForm({ ...form, deduction_date: e.target.value })} />
              </div>

              {/* Target Month/Year */}
              <div className="space-y-2">
                <Label>{isRTL ? "شهر التطبيق" : "Target Month"}</Label>
                <Select value={String(form.target_month)} onValueChange={(v) => setForm({ ...form, target_month: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(([ar, en], i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{isRTL ? ar : en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "سنة التطبيق" : "Target Year"}</Label>
                <Input type="number" min={2020} max={2050} value={form.target_year} onChange={(e) => setForm({ ...form, target_year: +e.target.value })} dir="ltr" />
              </div>

              {/* Installments - only for new */}
              {!editingId && (
                <div className="space-y-2">
                  <Label>{isRTL ? "عدد الأقساط" : "Installments"}</Label>
                  <Select value={String(form.total_installments)} onValueChange={(v) => setForm({ ...form, total_installments: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.total_installments > 1 && form.amount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {isRTL
                        ? `سيتم تقسيم ${form.amount.toLocaleString()} على ${form.total_installments} أشهر ≈ ${Math.round(form.amount / form.total_installments).toLocaleString()} / شهر`
                        : `${form.amount.toLocaleString()} split over ${form.total_installments} months ≈ ${Math.round(form.amount / form.total_installments).toLocaleString()} / month`}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>{isRTL ? "الوصف" : "Description"}</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={resetForm}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button
                onClick={() => editingId ? updateMutation.mutate() : saveMutation.mutate()}
                disabled={(editingId ? updateMutation.isPending : saveMutation.isPending) || !form.employee_id || !form.amount}
              >
                {(editingId ? updateMutation.isPending : saveMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {editingId ? (isRTL ? "تحديث" : "Update") : (isRTL ? "حفظ" : "Save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ======= LIST VIEW =======
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">{isRTL ? "الخصومات" : "Deductions"}</h1>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة خصم" : "Add Deduction"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الخصومات" : "Total Deductions"}</p>
          <p className="text-2xl font-bold">{filteredDeductions.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المبالغ" : "Total Amount"}</p>
          <p className="text-2xl font-bold tabular-nums">{totalAmount.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "مطبقة على الرواتب" : "Applied to Payroll"}</p>
          <p className="text-2xl font-bold text-emerald-600">{appliedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "معلقة" : "Pending"}</p>
          <p className="text-2xl font-bold text-amber-600">{filteredDeductions.length - appliedCount}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-xs">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="ps-10" placeholder={isRTL ? "بحث بالاسم أو الرقم..." : "Search..."} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-44" dir="ltr" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
            {Object.entries(DEDUCTION_TYPES).map(([key, [ar, en]]) => (
              <SelectItem key={key} value={key}>{isRTL ? ar : en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MinusCircle className="h-5 w-5" />{isRTL ? "سجل الخصومات" : "Deductions Log"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          filteredDeductions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MinusCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{isRTL ? "لا توجد خصومات لهذا الشهر" : "No deductions for this month"}</p>
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                  <TableHead className="border-b border-border/50">{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "النوع" : "Type"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الوصف" : "Description"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "شهر التطبيق" : "Target"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "القسط" : "Inst."}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredDeductions.map((d: any, idx: number) => (
                    <TableRow key={d.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                      <TableCell className="border-b border-border/30 tabular-nums">{d.deduction_date}</TableCell>
                      <TableCell className="border-b border-border/30 font-medium">
                        {d.hr_employees ? `${d.hr_employees.employee_number} - ${isRTL ? d.hr_employees.name : (d.hr_employees.name_en || d.hr_employees.name)}` : "—"}
                      </TableCell>
                      <TableCell className="border-b border-border/30">
                        <Badge variant="outline" className="text-xs">
                          {isRTL ? (DEDUCTION_TYPES[d.deduction_type]?.[0] || d.deduction_type) : (DEDUCTION_TYPES[d.deduction_type]?.[1] || d.deduction_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="border-b border-border/30 text-sm max-w-[200px] truncate">
                        {d.hr_penalty_rules ? `${d.hr_penalty_rules.violation_code} - ` : ""}
                        {isRTL ? d.description : (d.description_en || d.description) || "—"}
                      </TableCell>
                      <TableCell className="border-b border-border/30 tabular-nums font-medium">{(d.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="border-b border-border/30 tabular-nums text-sm">
                        {d.target_month && d.target_year
                          ? `${isRTL ? MONTHS[d.target_month - 1]?.[0] : MONTHS[d.target_month - 1]?.[1]} ${d.target_year}`
                          : "—"}
                      </TableCell>
                      <TableCell className="border-b border-border/30 tabular-nums text-sm">
                        {(d.total_installments || 1) > 1 ? `${d.installment_number}/${d.total_installments}` : "—"}
                      </TableCell>
                      <TableCell className="border-b border-border/30">
                        <Badge variant={d.is_applied ? "default" : "secondary"}>
                          {d.is_applied ? (isRTL ? "مطبق" : "Applied") : (isRTL ? "معلق" : "Pending")}
                        </Badge>
                      </TableCell>
                      <TableCell className="border-b border-border/30">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewDeduction(d)}>
                              <Eye className="h-4 w-4 me-2" />{isRTL ? "عرض" : "View"}
                            </DropdownMenuItem>
                            {!d.is_applied && (
                              <DropdownMenuItem onClick={() => handleEdit(d)}>
                                <Pencil className="h-4 w-4 me-2" />{isRTL ? "تعديل" : "Edit"}
                              </DropdownMenuItem>
                            )}
                            {!d.is_applied ? (
                              <DropdownMenuItem onClick={() => setDeleteDeduction(d)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 me-2" />{isRTL ? "حذف" : "Delete"}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled className="text-muted-foreground">
                                <Trash2 className="h-4 w-4 me-2" />{isRTL ? "لا يمكن الحذف" : "Cannot delete"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewDeduction} onOpenChange={() => setViewDeduction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isRTL ? "تفاصيل الخصم" : "Deduction Details"}</DialogTitle></DialogHeader>
          {viewDeduction && (
            <div className="space-y-3 text-sm">
              <Row label={isRTL ? "الموظف" : "Employee"} value={viewDeduction.hr_employees ? `${viewDeduction.hr_employees.employee_number} - ${isRTL ? viewDeduction.hr_employees.name : (viewDeduction.hr_employees.name_en || viewDeduction.hr_employees.name)}` : "—"} />
              <Row label={isRTL ? "النوع" : "Type"} value={isRTL ? (DEDUCTION_TYPES[viewDeduction.deduction_type]?.[0] || viewDeduction.deduction_type) : (DEDUCTION_TYPES[viewDeduction.deduction_type]?.[1] || viewDeduction.deduction_type)} />
              <Row label={isRTL ? "المبلغ" : "Amount"} value={(viewDeduction.amount || 0).toLocaleString()} />
              <Row label={isRTL ? "تاريخ الخصم" : "Date"} value={viewDeduction.deduction_date} />
              <Row label={isRTL ? "شهر التطبيق" : "Target Month"} value={viewDeduction.target_month ? `${isRTL ? MONTHS[viewDeduction.target_month - 1]?.[0] : MONTHS[viewDeduction.target_month - 1]?.[1]} ${viewDeduction.target_year}` : "—"} />
              {(viewDeduction.total_installments || 1) > 1 && (
                <Row label={isRTL ? "القسط" : "Installment"} value={`${viewDeduction.installment_number} / ${viewDeduction.total_installments}`} />
              )}
              <Row label={isRTL ? "الوصف" : "Description"} value={viewDeduction.description || "—"} />
              <Row label={isRTL ? "ملاحظات" : "Notes"} value={viewDeduction.notes || "—"} />
              <Row label={isRTL ? "الحالة" : "Status"} value={viewDeduction.is_applied ? (isRTL ? "مطبق في مسير رواتب" : "Applied in payroll") : (isRTL ? "معلق" : "Pending")} />
              <Row label={isRTL ? "قيد يومية" : "Journal Entry"} value={viewDeduction.journal_entry_id ? "✓" : "—"} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDeduction} onOpenChange={() => setDeleteDeduction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "حذف الخصم" : "Delete Deduction"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? "سيتم حذف الخصم والقيد المحاسبي المرتبط به. هل أنت متأكد؟" : "The deduction and its linked journal entry will be deleted. Are you sure?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDeduction && deleteMutation.mutate(deleteDeduction)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isRTL ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between border-b border-border/30 pb-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default Deductions;
