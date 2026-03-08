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
import { Plus, Calendar, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const LEAVE_TYPES = [
  { value: "annual", ar: "سنوية", en: "Annual" },
  { value: "sick", ar: "مرضية", en: "Sick" },
  { value: "unpaid", ar: "بدون راتب", en: "Unpaid" },
  { value: "emergency", ar: "اضطرارية", en: "Emergency" },
];

const Leaves = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_id: "", leave_type: "annual", start_date: "", end_date: "", days_count: 1, notes: "" });

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

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["hr-leaves", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_leaves").select("*, hr_employees(name, name_en, employee_number)")
        .eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("hr_leaves").insert({ ...form, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-leaves"] });
      setShowForm(false);
      toast.success(isRTL ? "تم تسجيل الإجازة" : "Leave recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("hr_leaves").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-leaves"] });
      toast.success(isRTL ? "تم التحديث" : "Updated");
    },
  });

  const statusBadge = (s: string) => {
    const map: Record<string, { v: "default" | "secondary" | "destructive"; ar: string; en: string }> = {
      pending: { v: "secondary", ar: "معلقة", en: "Pending" },
      approved: { v: "default", ar: "موافق عليها", en: "Approved" },
      rejected: { v: "destructive", ar: "مرفوضة", en: "Rejected" },
    };
    const c = map[s] || map.pending;
    return <Badge variant={c.v}>{isRTL ? c.ar : c.en}</Badge>;
  };

  const leaveLabel = (t: string) => {
    const lt = LEAVE_TYPES.find((l) => l.value === t);
    return lt ? (isRTL ? lt.ar : lt.en) : t;
  };

  const updateDays = (start: string, end: string) => {
    if (start && end) {
      const diff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
      setForm((f) => ({ ...f, start_date: start, end_date: end, days_count: Math.max(1, diff) }));
    }
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isRTL ? "طلب إجازة" : "Request Leave"}</h1>
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
                <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEAVE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{isRTL ? t.ar : t.en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>{isRTL ? "من" : "From"}</Label><Input type="date" value={form.start_date} onChange={(e) => updateDays(e.target.value, form.end_date)} /></div>
              <div className="space-y-2"><Label>{isRTL ? "إلى" : "To"}</Label><Input type="date" value={form.end_date} onChange={(e) => updateDays(form.start_date, e.target.value)} /></div>
              <div className="space-y-2"><Label>{isRTL ? "عدد الأيام" : "Days"}</Label><Input type="number" value={form.days_count} readOnly /></div>
              <div className="space-y-2"><Label>{isRTL ? "ملاحظات" : "Notes"}</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowForm(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.employee_id || !form.start_date || !form.end_date}>
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isRTL ? "الإجازات" : "Leaves"}</h1>
        <Button onClick={() => { setForm({ employee_id: "", leave_type: "annual", start_date: "", end_date: "", days_count: 1, notes: "" }); setShowForm(true); }}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "طلب إجازة" : "Request Leave"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الطلبات" : "Total Requests"}</p>
          <p className="text-2xl font-bold">{leaves.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "معلقة" : "Pending"}</p>
          <p className="text-2xl font-bold text-amber-600">{leaves.filter((l: any) => l.status === "pending").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "موافق عليها" : "Approved"}</p>
          <p className="text-2xl font-bold text-emerald-600">{leaves.filter((l: any) => l.status === "approved").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الأيام" : "Total Days"}</p>
          <p className="text-2xl font-bold">{leaves.filter((l: any) => l.status === "approved").reduce((s: number, l: any) => s + (l.days_count || 0), 0)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />{isRTL ? "سجل الإجازات" : "Leaves Record"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          leaves.length === 0 ? <div className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد إجازات" : "No leaves"}</div> :
          <div className="overflow-auto rounded-lg border border-border/50">
            <Table>
              <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                <TableHead className="border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "النوع" : "Type"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "من" : "From"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "إلى" : "To"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "الأيام" : "Days"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {leaves.map((l: any, idx: number) => (
                  <TableRow key={l.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                    <TableCell className="font-medium border-b border-border/30">{l.hr_employees ? (isRTL ? l.hr_employees.name : (l.hr_employees.name_en || l.hr_employees.name)) : "—"}</TableCell>
                    <TableCell className="border-b border-border/30">{leaveLabel(l.leave_type)}</TableCell>
                    <TableCell className="border-b border-border/30">{l.start_date}</TableCell>
                    <TableCell className="border-b border-border/30">{l.end_date}</TableCell>
                    <TableCell className="border-b border-border/30">{l.days_count}</TableCell>
                    <TableCell className="border-b border-border/30">{statusBadge(l.status)}</TableCell>
                    <TableCell className="border-b border-border/30">
                      {l.status === "pending" && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => updateStatus.mutate({ id: l.id, status: "approved" })}><CheckCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateStatus.mutate({ id: l.id, status: "rejected" })}><XCircle className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaves;
