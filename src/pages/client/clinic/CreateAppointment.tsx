import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Save, Loader2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreateAppointment = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    patient_id: "", doctor_id: "", appointment_date: "", appointment_time: "",
    duration_minutes: "30", visit_type: "consultation", chief_complaint: "", notes: "",
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
      const { error } = await (supabase as any).from("appointments").insert({
        company_id: companyId,
        patient_id: form.patient_id,
        doctor_id: form.doctor_id,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        duration_minutes: parseInt(form.duration_minutes),
        visit_type: form.visit_type,
        chief_complaint: form.chief_complaint || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(isRTL ? "تم حجز الموعد" : "Appointment booked");
      navigate("/client/clinic/appointments");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/clinic/appointments")}>
          <BackIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          {isRTL ? "حجز موعد جديد" : "New Appointment"}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "بيانات الموعد" : "Appointment Details"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "المريض *" : "Patient *"}</Label>
              <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر المريض" : "Select Patient"} /></SelectTrigger>
                <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.patient_number} - {isRTL ? p.name : p.name_en || p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الطبيب *" : "Doctor *"}</Label>
              <Select value={form.doctor_id} onValueChange={v => setForm(f => ({ ...f, doctor_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الطبيب" : "Select Doctor"} /></SelectTrigger>
                <SelectContent>{doctors.map((d: any) => <SelectItem key={d.id} value={d.id}>{isRTL ? d.name : d.name_en || d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{isRTL ? "التاريخ *" : "Date *"}</Label><Input type="date" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{isRTL ? "الوقت *" : "Time *"}</Label><Input type="time" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "معلومات إضافية" : "Additional Info"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label>{isRTL ? "الشكوى الرئيسية" : "Chief Complaint"}</Label><Textarea value={form.chief_complaint} onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))} rows={4} /></div>
            <div className="space-y-1.5"><Label>{isRTL ? "ملاحظات" : "Notes"}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={4} /></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/client/clinic/appointments")}>{isRTL ? "إلغاء" : "Cancel"}</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.patient_id || !form.doctor_id || !form.appointment_date || !form.appointment_time}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {isRTL ? "حجز الموعد" : "Book Appointment"}
        </Button>
      </div>
    </div>
  );
};

export default CreateAppointment;
