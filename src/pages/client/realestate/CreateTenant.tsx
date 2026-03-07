import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CreateTenant = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: "", name_en: "", phone: "", email: "", id_number: "", address: "", notes: "",
  });

  const { data: existing } = useQuery({
    queryKey: ["re-tenant", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("re_tenants").select("*").eq("id", id!).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) setForm({
      name: existing.name || "", name_en: existing.name_en || "", phone: existing.phone || "",
      email: existing.email || "", id_number: existing.id_number || "",
      address: existing.address || "", notes: existing.notes || "",
    });
  }, [existing]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId };
      if (isEdit) {
        const { error } = await (supabase as any).from("re_tenants").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("re_tenants").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      queryClient.invalidateQueries({ queryKey: ["re-tenants"] });
      navigate("/client/realestate/tenants");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/realestate/tenants")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? (isRTL ? "تعديل مستأجر" : "Edit Tenant") : (isRTL ? "إضافة مستأجر جديد" : "New Tenant")}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>{isRTL ? "بيانات المستأجر" : "Tenant Details"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
              <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الهاتف" : "Phone"}</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "رقم الهوية" : "ID Number"}</Label>
              <Input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isRTL ? "العنوان" : "Address"}</Label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
            {isRTL ? "حفظ" : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTenant;
