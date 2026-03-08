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
import { Plus, Clock, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  present: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  absent: "bg-red-500/10 text-red-600 border-red-200",
  late: "bg-amber-500/10 text-amber-600 border-amber-200",
  leave: "bg-blue-500/10 text-blue-600 border-blue-200",
};

const Attendance = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState({ employee_id: "", check_in: "08:00", check_out: "17:00", status: "present", notes: "" });

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

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["hr-attendance", companyId, selectedDate],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_attendance").select("*, hr_employees(name, name_en, employee_number)")
        .eq("company_id", companyId).eq("attendance_date", selectedDate)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("hr_attendance").insert({
        ...form, company_id: companyId, attendance_date: selectedDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-attendance"] });
      setShowForm(false);
      setForm({ employee_id: "", check_in: "08:00", check_out: "17:00", status: "present", notes: "" });
      toast.success(isRTL ? "تم التسجيل" : "Recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusLabel = (s: string) => {
    const map: Record<string, [string, string]> = {
      present: ["حاضر", "Present"], absent: ["غائب", "Absent"],
      late: ["متأخر", "Late"], leave: ["إجازة", "Leave"],
    };
    return isRTL ? (map[s]?.[0] || s) : (map[s]?.[1] || s);
  };

  const presentCount = records.filter((r: any) => r.status === "present").length;
  const absentCount = records.filter((r: any) => r.status === "absent").length;

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isRTL ? "تسجيل حضور" : "Record Attendance"}</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الموظف" : "Employee"}</Label>
                <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employee_number} - {isRTL ? e.name : (e.name_en || e.name)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الحالة" : "Status"}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">{isRTL ? "حاضر" : "Present"}</SelectItem>
                    <SelectItem value="absent">{isRTL ? "غائب" : "Absent"}</SelectItem>
                    <SelectItem value="late">{isRTL ? "متأخر" : "Late"}</SelectItem>
                    <SelectItem value="leave">{isRTL ? "إجازة" : "Leave"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>{isRTL ? "وقت الدخول" : "Check In"}</Label><Input type="time" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "وقت الخروج" : "Check Out"}</Label><Input type="time" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} /></div>
              <div className="space-y-2 md:col-span-2"><Label>{isRTL ? "ملاحظات" : "Notes"}</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowForm(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.employee_id}>
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
        <h1 className="text-2xl font-bold">{isRTL ? "الحضور والانصراف" : "Attendance"}</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 me-2" />{isRTL ? "تسجيل حضور" : "Record Attendance"}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "التاريخ" : "Date"}</p>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="mt-1" />
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي السجلات" : "Total Records"}</p>
          <p className="text-2xl font-bold">{records.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "حاضرون" : "Present"}</p>
          <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "غائبون" : "Absent"}</p>
          <p className="text-2xl font-bold text-red-600">{absentCount}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />{isRTL ? "سجل الحضور" : "Attendance Record"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          records.length === 0 ? <div className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد سجلات" : "No records"}</div> :
          <div className="overflow-auto rounded-lg border border-border/50">
            <Table>
              <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                <TableHead className="border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "الدخول" : "Check In"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "الخروج" : "Check Out"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "ملاحظات" : "Notes"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {records.map((r: any, idx: number) => (
                  <TableRow key={r.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                    <TableCell className="font-medium border-b border-border/30">{r.hr_employees ? (isRTL ? r.hr_employees.name : (r.hr_employees.name_en || r.hr_employees.name)) : "—"}</TableCell>
                    <TableCell className="border-b border-border/30">{r.check_in || "—"}</TableCell>
                    <TableCell className="border-b border-border/30">{r.check_out || "—"}</TableCell>
                    <TableCell className="border-b border-border/30"><Badge className={statusColors[r.status] || ""}>{statusLabel(r.status)}</Badge></TableCell>
                    <TableCell className="border-b border-border/30">{r.notes || "—"}</TableCell>
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

export default Attendance;
