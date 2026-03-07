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
import { ArrowLeft, ArrowRight, Save, Loader2, Pill, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreatePrescription = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ patient_id: "", doctor_id: "", prescription_date: new Date().toISOString().split("T")[0], notes: "" });
  const [items, setItems] = useState([{ medicine_name: "", dosage: "", frequency: "", duration: "", instructions: "", quantity: 1 }]);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list", companyId],
    queryFn: async () => { const { data } = await (supabase as any).from("patients").select("id, name, name_en, patient_number").eq("company_id", companyId).eq("is_active", true); return data || []; },
    enabled: !!companyId,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-list", companyId],
    queryFn: async () => { const { data } = await (supabase as any).from("doctors").select("id, name, name_en").eq("company_id", companyId).eq("is_active", true); return data || []; },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validItems = items.filter(i => i.medicine_name.trim());
      if (!validItems.length) throw new Error(isRTL ? "أضف دواء واحد على الأقل" : "Add at least one medicine");
      const { data: rx, error } = await (supabase as any).from("prescriptions").insert({
        company_id: companyId, patient_id: form.patient_id, doctor_id: form.doctor_id,
        prescription_date: form.prescription_date, notes: form.notes || null,
      }).select("id").single();
      if (error) throw error;
      const itemsPayload = validItems.map(i => ({ ...i, prescription_id: rx.id }));
      const { error: itemsError } = await (supabase as any).from("prescription_items").insert(itemsPayload);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast.success(isRTL ? "تم حفظ الوصفة" : "Prescription saved");
      navigate("/client/clinic/prescriptions");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const addItem = () => setItems([...items, { medicine_name: "", dosage: "", frequency: "", duration: "", instructions: "", quantity: 1 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: string, val: any) => setItems(items.map((item, i) => i === idx ? { ...item, [key]: val } : item));

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/clinic/prescriptions")}>
          <BackIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Pill className="h-6 w-6 text-primary" />
          {isRTL ? "وصفة طبية جديدة" : "New Prescription"}
        </h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{isRTL ? "بيانات الوصفة" : "Prescription Info"}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="space-y-1.5"><Label>{isRTL ? "التاريخ" : "Date"}</Label><Input type="date" value={form.prescription_date} onChange={e => setForm(f => ({ ...f, prescription_date: e.target.value }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{isRTL ? "الأدوية" : "Medicines"}</CardTitle>
            <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 me-1" />{isRTL ? "إضافة" : "Add"}</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-2 items-end p-3 border rounded-lg">
              <div className="col-span-2 space-y-1"><Label className="text-xs">{isRTL ? "اسم الدواء *" : "Medicine *"}</Label><Input value={item.medicine_name} onChange={e => updateItem(idx, "medicine_name", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">{isRTL ? "الجرعة" : "Dosage"}</Label><Input value={item.dosage} onChange={e => updateItem(idx, "dosage", e.target.value)} placeholder="500mg" /></div>
              <div className="space-y-1"><Label className="text-xs">{isRTL ? "التكرار" : "Frequency"}</Label><Input value={item.frequency} onChange={e => updateItem(idx, "frequency", e.target.value)} placeholder="3x/day" /></div>
              <div className="space-y-1"><Label className="text-xs">{isRTL ? "المدة" : "Duration"}</Label><Input value={item.duration} onChange={e => updateItem(idx, "duration", e.target.value)} placeholder="7 days" /></div>
              <div className="flex items-end">
                <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={items.length === 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-1.5"><Label>{isRTL ? "ملاحظات" : "Notes"}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/client/clinic/prescriptions")}>{isRTL ? "إلغاء" : "Cancel"}</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.patient_id || !form.doctor_id}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {isRTL ? "حفظ الوصفة" : "Save Prescription"}
        </Button>
      </div>
    </div>
  );
};

export default CreatePrescription;
