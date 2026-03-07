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
import { ArrowLeft, ArrowRight, Save, Loader2, Stethoscope } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const CreateDoctor = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({ name: "", name_en: "", specialization: "", specialization_en: "", phone: "", email: "", license_number: "" });

  const { data: existing } = useQuery({
    queryKey: ["doctor", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("doctors").select("*").eq("id", id).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({ name: existing.name || "", name_en: existing.name_en || "", specialization: existing.specialization || "", specialization_en: existing.specialization_en || "", phone: existing.phone || "", email: existing.email || "", license_number: existing.license_number || "" });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId };
      if (isEdit) {
        const { error } = await (supabase as any).from("doctors").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("doctors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      navigate("/client/clinic/doctors");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/clinic/doctors")}>
          <BackIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          {isEdit ? (isRTL ? "تعديل الطبيب" : "Edit Doctor") : (isRTL ? "إضافة طبيب جديد" : "New Doctor")}
        </h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{isRTL ? "بيانات الطبيب" : "Doctor Info"}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>{isRTL ? "الاسم *" : "Name *"}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{isRTL ? "الاسم بالإنجليزية" : "Name (EN)"}</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{isRTL ? "التخصص" : "Specialization"}</Label><Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{isRTL ? "التخصص (EN)" : "Specialization (EN)"}</Label><Input value={form.specialization_en} onChange={e => setForm(f => ({ ...f, specialization_en: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{isRTL ? "الهاتف" : "Phone"}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{isRTL ? "البريد" : "Email"}</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="md:col-span-2 space-y-1.5"><Label>{isRTL ? "رقم الترخيص" : "License Number"}</Label><Input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} /></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/client/clinic/doctors")}>{isRTL ? "إلغاء" : "Cancel"}</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {isRTL ? "حفظ" : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default CreateDoctor;
