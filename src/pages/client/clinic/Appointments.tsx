import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Calendar, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "default", confirmed: "default", completed: "secondary", cancelled: "destructive", "no-show": "outline",
};

const Appointments = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    patient_id: "", doctor_id: "", appointment_date: "", appointment_time: "",
    duration_minutes: "30", status: "scheduled", visit_type: "consultation",
    chief_complaint: "", diagnosis: "", treatment_notes: "", notes: "",
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("appointments")
        .select("*, patients(name, name_en, patient_number), doctors(name, name_en)")
        .eq("company_id", companyId)
        .order("appointment_date", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("patients").select("id, name, name_en, patient_number").eq("company_id", companyId).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-list", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("doctors").select("id, name, name_en").eq("company_id", companyId).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        company_id: companyId,
        patient_id: form.patient_id,
        doctor_id: form.doctor_id,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        duration_minutes: parseInt(form.duration_minutes),
        status: form.status,
        visit_type: form.visit_type,
        chief_complaint: form.chief_complaint || null,
        diagnosis: form.diagnosis || null,
        treatment_notes: form.treatment_notes || null,
        notes: form.notes || null,
      };
      const { error } = await (supabase as any).from("appointments").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(isRTL ? "تم حجز الموعد" : "Appointment booked");
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    toast.success(isRTL ? "تم التحديث" : "Updated");
  };

  const statusLabel = (s: string) => {
    const map: Record<string, [string, string]> = {
      scheduled: ["مجدول", "Scheduled"], confirmed: ["مؤكد", "Confirmed"],
      completed: ["مكتمل", "Completed"], cancelled: ["ملغي", "Cancelled"], "no-show": ["لم يحضر", "No Show"],
    };
    return isRTL ? map[s]?.[0] || s : map[s]?.[1] || s;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          {isRTL ? "المواعيد" : "Appointments"}
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 me-2" />{isRTL ? "حجز موعد" : "Book Appointment"}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{isRTL ? "حجز موعد جديد" : "New Appointment"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isRTL ? "المريض *" : "Patient *"}</Label>
                <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.patient_number} - {isRTL ? p.name : p.name_en || p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "الطبيب *" : "Doctor *"}</Label>
                <Select value={form.doctor_id} onValueChange={v => setForm(f => ({ ...f, doctor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>{doctors.map((d: any) => <SelectItem key={d.id} value={d.id}>{isRTL ? d.name : d.name_en || d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{isRTL ? "التاريخ *" : "Date *"}</Label><Input type="date" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{isRTL ? "الوقت *" : "Time *"}</Label><Input type="time" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "المدة (دقائق)" : "Duration (min)"}</Label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "نوع الزيارة" : "Visit Type"}</Label>
                <Select value={form.visit_type} onValueChange={v => setForm(f => ({ ...f, visit_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">{isRTL ? "استشارة" : "Consultation"}</SelectItem>
                    <SelectItem value="follow-up">{isRTL ? "متابعة" : "Follow-up"}</SelectItem>
                    <SelectItem value="emergency">{isRTL ? "طوارئ" : "Emergency"}</SelectItem>
                    <SelectItem value="procedure">{isRTL ? "إجراء طبي" : "Procedure"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5"><Label>{isRTL ? "الشكوى الرئيسية" : "Chief Complaint"}</Label><Textarea value={form.chief_complaint} onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))} /></div>
              <div className="col-span-2 space-y-1.5"><Label>{isRTL ? "ملاحظات" : "Notes"}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.patient_id || !form.doctor_id || !form.appointment_date || !form.appointment_time}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {isRTL ? "حجز" : "Book"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRTL ? "الوقت" : "Time"}</TableHead>
                  <TableHead>{isRTL ? "المريض" : "Patient"}</TableHead>
                  <TableHead>{isRTL ? "الطبيب" : "Doctor"}</TableHead>
                  <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا يوجد مواعيد" : "No appointments"}</TableCell></TableRow>
                ) : appointments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.appointment_date}</TableCell>
                    <TableCell className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.appointment_time?.slice(0, 5)}</TableCell>
                    <TableCell>{a.patients?.patient_number} - {isRTL ? a.patients?.name : a.patients?.name_en || a.patients?.name}</TableCell>
                    <TableCell>{isRTL ? a.doctors?.name : a.doctors?.name_en || a.doctors?.name}</TableCell>
                    <TableCell>{a.visit_type}</TableCell>
                    <TableCell><Badge variant={STATUS_COLORS[a.status] as any || "default"}>{statusLabel(a.status)}</Badge></TableCell>
                    <TableCell>
                      <Select value={a.status} onValueChange={v => updateStatus(a.id, v)}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["scheduled","confirmed","completed","cancelled","no-show"].map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Appointments;
