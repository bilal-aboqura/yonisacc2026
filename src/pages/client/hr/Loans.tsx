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
import { Plus, Banknote, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const Loans = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_id: "", loan_type: "advance", amount: 0, monthly_deduction: 0, start_date: new Date().toISOString().split("T")[0], notes: "" });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-active", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_employees").select("id, name, name_en, employee_number")
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const remaining = form.amount;
      const { error } = await (supabase as any).from("hr_loans").insert({
        ...form, company_id: companyId, remaining, total_paid: 0,
      });
      if (error) throw error;

      // Create journal entry for loan
      const { data: accounts } = await (supabase as any)
        .from("accounts").select("id, code")
        .eq("company_id", companyId)
        .in("code", ["117", "111"]);
      
      if (accounts && accounts.length === 2) {
        const advanceAcc = accounts.find((a: any) => a.code === "117");
        const cashAcc = accounts.find((a: any) => a.code === "111");
        if (advanceAcc && cashAcc) {
          const { data: settings } = await (supabase as any)
            .from("company_settings").select("journal_prefix, next_journal_number")
            .eq("company_id", companyId).maybeSingle();
          
          const prefix = settings?.journal_prefix || "JE-";
          const nextNum = settings?.next_journal_number || 1;
          const entryNumber = `${prefix}${String(nextNum).padStart(6, "0")}`;

          const emp = employees.find((e: any) => e.id === form.employee_id);
          const desc = isRTL ? `سلفة موظف: ${emp?.name || ""}` : `Employee advance: ${emp?.name_en || emp?.name || ""}`;

          const { data: je, error: jeError } = await (supabase as any)
            .from("journal_entries").insert({
              company_id: companyId, entry_number: entryNumber,
              entry_date: form.start_date, description: desc,
              total_debit: form.amount, total_credit: form.amount,
              status: "posted", source: "hr_loan", created_by: null,
            }).select().single();

          if (!jeError && je) {
            await (supabase as any).from("journal_entry_lines").insert([
              { entry_id: je.id, account_id: advanceAcc.id, debit: form.amount, credit: 0, description: desc },
              { entry_id: je.id, account_id: cashAcc.id, debit: 0, credit: form.amount, description: desc },
            ]);
            await (supabase as any).from("company_settings").update({ next_journal_number: nextNum + 1 }).eq("company_id", companyId);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-loans"] });
      setShowForm(false);
      toast.success(isRTL ? "تم تسجيل السلفة مع القيد المحاسبي" : "Loan recorded with journal entry");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalActive = loans.filter((l: any) => l.status === "active").reduce((s: number, l: any) => s + (l.remaining || 0), 0);

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isRTL ? "إضافة سلفة" : "Add Advance"}</h1>
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
              <Button variant="outline" onClick={() => setShowForm(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.employee_id || !form.amount}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}{isRTL ? "حفظ مع قيد محاسبي" : "Save with Journal Entry"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isRTL ? "السلف والقروض" : "Loans & Advances"}</h1>
        <Button onClick={() => { setForm({ employee_id: "", loan_type: "advance", amount: 0, monthly_deduction: 0, start_date: new Date().toISOString().split("T")[0], notes: "" }); setShowForm(true); }}>
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
          <p className="text-2xl font-bold text-amber-600">{totalActive.toLocaleString()}</p>
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
          <Table>
            <TableHeader><TableRow>
              <TableHead>{isRTL ? "الموظف" : "Employee"}</TableHead>
              <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
              <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
              <TableHead>{isRTL ? "الاستقطاع الشهري" : "Monthly Deduction"}</TableHead>
              <TableHead>{isRTL ? "المتبقي" : "Remaining"}</TableHead>
              <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loans.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.hr_employees ? (isRTL ? l.hr_employees.name : (l.hr_employees.name_en || l.hr_employees.name)) : "—"}</TableCell>
                  <TableCell>{l.loan_type === "advance" ? (isRTL ? "سلفة" : "Advance") : (isRTL ? "قرض" : "Loan")}</TableCell>
                  <TableCell>{(l.amount || 0).toLocaleString()}</TableCell>
                  <TableCell>{(l.monthly_deduction || 0).toLocaleString()}</TableCell>
                  <TableCell>{(l.remaining || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={l.status === "active" ? "default" : "secondary"}>
                      {l.status === "active" ? (isRTL ? "نشطة" : "Active") : (isRTL ? "مسددة" : "Paid")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>
    </div>
  );
};

export default Loans;
