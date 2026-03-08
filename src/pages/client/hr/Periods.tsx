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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Clock, Loader2, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Periods = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", name_en: "", start_time: "08:00", end_time: "16:00", break_minutes: "60", notes: "" });

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["hr-work-shifts", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_work_shifts").select("*")
        .eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const resetForm = () => {
    setForm({ name: "", name_en: "", start_time: "08:00", end_time: "16:00", break_minutes: "60", notes: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        name_en: form.name_en || null,
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: parseInt(form.break_minutes) || 0,
        notes: form.notes || null,
        company_id: companyId,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await (supabase as any).from("hr_work_shifts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("hr_work_shifts").insert({ ...payload, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-work-shifts"] });
      resetForm();
      toast.success(isRTL ? (editingId ? "تم تحديث الفترة" : "تم إضافة الفترة") : (editingId ? "Shift updated" : "Shift added"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("hr_work_shifts").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-work-shifts"] });
      toast.success(isRTL ? "تم التحديث" : "Updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("hr_work_shifts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-work-shifts"] });
      toast.success(isRTL ? "تم الحذف" : "Deleted");
    },
  });

  const handleEdit = (shift: any) => {
    setForm({
      name: shift.name || "",
      name_en: shift.name_en || "",
      start_time: shift.start_time?.slice(0, 5) || "08:00",
      end_time: shift.end_time?.slice(0, 5) || "16:00",
      break_minutes: String(shift.break_minutes || 0),
      notes: shift.notes || "",
    });
    setEditingId(shift.id);
    setShowForm(true);
  };

  const calcHours = (start: string, end: string, breakMin: string) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let totalMin = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMin < 0) totalMin += 24 * 60; // overnight
    const net = totalMin - (parseInt(breakMin) || 0);
    return Math.max(0, net / 60).toFixed(1);
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={resetForm}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isRTL ? (editingId ? "تعديل فترة دوام" : "إضافة فترة دوام") : (editingId ? "Edit Work Shift" : "Add Work Shift")}</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "اسم الفترة" : "Shift Name"}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={isRTL ? "مثال: فترة صباحية" : "e.g. Morning Shift"} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم بالإنجليزي" : "Name (EN)"}</Label>
                <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="Morning Shift" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "وقت البداية" : "Start Time"}</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "وقت النهاية" : "End Time"}</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "مدة الاستراحة (دقيقة)" : "Break Duration (min)"}</Label>
                <Input type="number" value={form.break_minutes} onChange={(e) => setForm({ ...form, break_minutes: e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "صافي ساعات العمل" : "Net Work Hours"}</Label>
                <div className="h-10 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium tabular-nums">
                  {calcHours(form.start_time, form.end_time, form.break_minutes)} {isRTL ? "ساعة" : "hours"}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={resetForm}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.start_time || !form.end_time}>
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
        <h1 className="text-2xl font-bold">{isRTL ? "فترات الدوام" : "Work Shifts"}</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة فترة" : "Add Shift"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الفترات" : "Total Shifts"}</p>
          <p className="text-2xl font-bold">{shifts.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "نشطة" : "Active"}</p>
          <p className="text-2xl font-bold text-emerald-600">{shifts.filter((s: any) => s.is_active).length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "غير نشطة" : "Inactive"}</p>
          <p className="text-2xl font-bold text-muted-foreground">{shifts.filter((s: any) => !s.is_active).length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />{isRTL ? "فترات الدوام" : "Work Shifts"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          shifts.length === 0 ? <div className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد فترات حالياً" : "No shifts yet"}</div> :
          <div className="overflow-auto rounded-lg border border-border/50">
            <Table>
              <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                <TableHead className="border-b border-border/50">{isRTL ? "الفترة" : "Shift"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "من" : "From"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "إلى" : "To"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "استراحة" : "Break"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "صافي الساعات" : "Net Hours"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {shifts.map((s: any, idx: number) => (
                  <TableRow key={s.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                    <TableCell className="font-medium border-b border-border/30">{isRTL ? s.name : (s.name_en || s.name)}</TableCell>
                    <TableCell className="border-b border-border/30 tabular-nums" dir="ltr">{s.start_time?.slice(0, 5)}</TableCell>
                    <TableCell className="border-b border-border/30 tabular-nums" dir="ltr">{s.end_time?.slice(0, 5)}</TableCell>
                    <TableCell className="border-b border-border/30 tabular-nums">{s.break_minutes} {isRTL ? "د" : "min"}</TableCell>
                    <TableCell className="border-b border-border/30 tabular-nums">{calcHours(s.start_time?.slice(0, 5) || "00:00", s.end_time?.slice(0, 5) || "00:00", String(s.break_minutes || 0))} {isRTL ? "س" : "h"}</TableCell>
                    <TableCell className="border-b border-border/30">
                      <Switch checked={s.is_active} onCheckedChange={(v) => toggleActiveMutation.mutate({ id: s.id, is_active: v })} />
                    </TableCell>
                    <TableCell className="border-b border-border/30">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{isRTL ? "حذف الفترة" : "Delete Shift"}</AlertDialogTitle>
                              <AlertDialogDescription>{isRTL ? "هل أنت متأكد من حذف هذه الفترة؟" : "Are you sure you want to delete this shift?"}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {isRTL ? "حذف" : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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

export default Periods;
