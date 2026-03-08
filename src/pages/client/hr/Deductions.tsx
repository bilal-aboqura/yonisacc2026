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
import { Plus, MinusCircle, Loader2, ArrowLeft, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const DEDUCTION_TYPES: Record<string, [string, string]> = {
  penalty: ["جزاء / مخالفة", "Penalty / Violation"],
  absence: ["غياب", "Absence"],
  late: ["تأخير", "Lateness"],
  other: ["أخرى", "Other"],
};

const Deductions = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [form, setForm] = useState({
    employee_id: "", deduction_type: "penalty", penalty_rule_id: "", occurrence_number: 1,
    amount: 0, deduction_date: new Date().toISOString().split("T")[0],
    description: "", description_en: "", notes: "",
  });

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
    setForm({ employee_id: "", deduction_type: "penalty", penalty_rule_id: "", occurrence_number: 1, amount: 0, deduction_date: new Date().toISOString().split("T")[0], description: "", description_en: "", notes: "" });
    setShowForm(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        company_id: companyId,
        employee_id: form.employee_id,
        deduction_type: form.deduction_type,
        penalty_rule_id: form.penalty_rule_id || null,
        occurrence_number: form.occurrence_number,
        amount: form.amount,
        deduction_date: form.deduction_date,
        description: form.description || null,
        description_en: form.description_en || null,
        notes: form.notes || null,
      };
      const { error } = await (supabase as any).from("hr_deductions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-deductions"] });
      resetForm();
      toast.success(isRTL ? "تم إضافة الخصم" : "Deduction added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("hr_deductions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-deductions"] });
      toast.success(isRTL ? "تم الحذف" : "Deleted");
    },
  });

  const handleRuleSelect = (ruleId: string) => {
    const rule = penaltyRules.find((r: any) => r.id === ruleId);
    if (rule) {
      setForm({
        ...form,
        penalty_rule_id: ruleId,
        description: rule.violation_name,
        description_en: rule.violation_name_en || "",
      });
    }
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

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={resetForm}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isRTL ? "إضافة خصم" : "Add Deduction"}</h1>
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
                <Label>{isRTL ? "المبلغ" : "Amount"} <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "التاريخ" : "Date"}</Label>
                <Input type="date" value={form.deduction_date} onChange={(e) => setForm({ ...form, deduction_date: e.target.value })} />
              </div>
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
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.employee_id || !form.amount}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}{isRTL ? "حفظ" : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">{isRTL ? "الخصومات" : "Deductions"}</h1>
        <Button onClick={() => setShowForm(true)}>
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
                      <TableCell className="border-b border-border/30">
                        <Badge variant={d.is_applied ? "default" : "secondary"}>
                          {d.is_applied ? (isRTL ? "مطبق" : "Applied") : (isRTL ? "معلق" : "Pending")}
                        </Badge>
                      </TableCell>
                      <TableCell className="border-b border-border/30">
                        {!d.is_applied && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{isRTL ? "حذف الخصم" : "Delete Deduction"}</AlertDialogTitle>
                                <AlertDialogDescription>{isRTL ? "هل أنت متأكد؟" : "Are you sure?"}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(d.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isRTL ? "حذف" : "Delete"}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
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

export default Deductions;
