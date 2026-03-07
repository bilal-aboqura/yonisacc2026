import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Save, Loader2, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const CreatePatient = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: "", name_en: "", patient_number: "", date_of_birth: "", gender: "male",
    phone: "", mobile: "", email: "", address: "", blood_type: "",
    allergies: "", chronic_conditions: "", emergency_contact_name: "",
    emergency_contact_phone: "", insurance_provider: "", insurance_number: "", notes: "",
  });

  const { data: existing } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("patients").select("*").eq("id", id).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "", name_en: existing.name_en || "", patient_number: existing.patient_number || "",
        date_of_birth: existing.date_of_birth || "", gender: existing.gender || "male",
        phone: existing.phone || "", mobile: existing.mobile || "", email: existing.email || "",
        address: existing.address || "", blood_type: existing.blood_type || "",
        allergies: existing.allergies || "", chronic_conditions: existing.chronic_conditions || "",
        emergency_contact_name: existing.emergency_contact_name || "",
        emergency_contact_phone: existing.emergency_contact_phone || "",
        insurance_provider: existing.insurance_provider || "", insurance_number: existing.insurance_number || "",
        notes: existing.notes || "",
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId, updated_at: new Date().toISOString() };
      if (isEdit) {
        const { error } = await (supabase as any).from("patients").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("patients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success(isRTL ? "تم الحفظ بنجاح" : "Saved successfully");
      navigate("/client/clinic/patients");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/clinic/patients")}>
          <BackIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          {isEdit ? (isRTL ? "تعديل بيانات المريض" : "Edit Patient") : (isRTL ? "إضافة مريض جديد" : "New Patient")}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "البيانات الأساسية" : "Basic Info"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isRTL ? "رقم المريض *" : "Patient Number *"}</Label>
                <Input value={form.patient_number} onChange={e => setForm(f => ({ ...f, patient_number: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "الجنس" : "Gender"}</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{isRTL ? "ذكر" : "Male"}</SelectItem>
                    <SelectItem value="female">{isRTL ? "أنثى" : "Female"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>{isRTL ? "الاسم *" : "Name *"}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{isRTL ? "الاسم بالإنجليزية" : "Name (English)"}</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{isRTL ? "تاريخ الميلاد" : "Date of Birth"}</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "فصيلة الدم" : "Blood Type"}</Label>
                <Select value={form.blood_type || "unknown"} onValueChange={v => setForm(f => ({ ...f, blood_type: v === "unknown" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">{isRTL ? "غير محدد" : "Unknown"}</SelectItem>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "معلومات الاتصال" : "Contact Info"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{isRTL ? "الهاتف" : "Phone"}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{isRTL ? "الجوال" : "Mobile"}</Label><Input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{isRTL ? "العنوان" : "Address"}</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{isRTL ? "اسم جهة الطوارئ" : "Emergency Contact"}</Label><Input value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{isRTL ? "هاتف الطوارئ" : "Emergency Phone"}</Label><Input value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "التأمين" : "Insurance"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label>{isRTL ? "شركة التأمين" : "Insurance Provider"}</Label><Input value={form.insurance_provider} onChange={e => setForm(f => ({ ...f, insurance_provider: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{isRTL ? "رقم التأمين" : "Insurance Number"}</Label><Input value={form.insurance_number} onChange={e => setForm(f => ({ ...f, insurance_number: e.target.value }))} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "السجل الطبي" : "Medical History"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label>{isRTL ? "الحساسية" : "Allergies"}</Label><Textarea value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{isRTL ? "الأمراض المزمنة" : "Chronic Conditions"}</Label><Textarea value={form.chronic_conditions} onChange={e => setForm(f => ({ ...f, chronic_conditions: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{isRTL ? "ملاحظات" : "Notes"}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/client/clinic/patients")}>{isRTL ? "إلغاء" : "Cancel"}</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.patient_number}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {isRTL ? "حفظ" : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default CreatePatient;
