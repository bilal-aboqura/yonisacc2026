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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CreateProperty = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: "", name_en: "", property_type: "residential", address: "", city: "", notes: "", is_active: true,
  });

  const { data: existing } = useQuery({
    queryKey: ["re-property", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("re_properties").select("*").eq("id", id!).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) setForm({
      name: existing.name || "", name_en: existing.name_en || "", property_type: existing.property_type || "residential",
      address: existing.address || "", city: existing.city || "", notes: existing.notes || "", is_active: existing.is_active ?? true,
    });
  }, [existing]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId };
      if (isEdit) {
        const { error } = await (supabase as any).from("re_properties").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("re_properties").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ بنجاح" : "Saved successfully");
      queryClient.invalidateQueries({ queryKey: ["re-properties"] });
      navigate("/client/realestate/properties");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/realestate/properties")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? (isRTL ? "تعديل عقار" : "Edit Property") : (isRTL ? "إضافة عقار جديد" : "New Property")}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>{isRTL ? "بيانات العقار" : "Property Details"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "اسم العقار (عربي)" : "Property Name (Arabic)"}</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "اسم العقار (إنجليزي)" : "Property Name (English)"}</Label>
              <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "نوع العقار" : "Property Type"}</Label>
              <Select value={form.property_type} onValueChange={v => setForm(f => ({ ...f, property_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">{isRTL ? "سكني" : "Residential"}</SelectItem>
                  <SelectItem value="commercial">{isRTL ? "تجاري" : "Commercial"}</SelectItem>
                  <SelectItem value="industrial">{isRTL ? "صناعي" : "Industrial"}</SelectItem>
                  <SelectItem value="land">{isRTL ? "أرض" : "Land"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "المدينة" : "City"}</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
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

export default CreateProperty;
