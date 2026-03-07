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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CreateUnit = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    unit_number: "", property_id: "", unit_type: "apartment", floor_number: "",
    area_sqm: "", monthly_rent: "", status: "vacant", notes: "",
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["re-properties-list", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("re_properties").select("id, name, name_en").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: existing } = useQuery({
    queryKey: ["re-unit", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("re_units").select("*").eq("id", id!).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) setForm({
      unit_number: existing.unit_number || "", property_id: existing.property_id || "",
      unit_type: existing.unit_type || "apartment", floor_number: existing.floor_number?.toString() || "",
      area_sqm: existing.area_sqm?.toString() || "", monthly_rent: existing.monthly_rent?.toString() || "",
      status: existing.status || "vacant", notes: existing.notes || "",
    });
  }, [existing]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        unit_number: form.unit_number, property_id: form.property_id, unit_type: form.unit_type,
        floor_number: form.floor_number ? parseInt(form.floor_number) : null,
        area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : null,
        monthly_rent: form.monthly_rent ? parseFloat(form.monthly_rent) : 0,
        status: form.status, notes: form.notes, company_id: companyId,
      };
      if (isEdit) {
        const { error } = await (supabase as any).from("re_units").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("re_units").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      queryClient.invalidateQueries({ queryKey: ["re-units"] });
      navigate("/client/realestate/units");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/realestate/units")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? (isRTL ? "تعديل وحدة" : "Edit Unit") : (isRTL ? "إضافة وحدة جديدة" : "New Unit")}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>{isRTL ? "بيانات الوحدة" : "Unit Details"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "رقم الوحدة" : "Unit Number"}</Label>
              <Input value={form.unit_number} onChange={e => setForm(f => ({ ...f, unit_number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "العقار" : "Property"}</Label>
              <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر العقار" : "Select Property"} /></SelectTrigger>
                <SelectContent>
                  {properties.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : (p.name_en || p.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "نوع الوحدة" : "Unit Type"}</Label>
              <Select value={form.unit_type} onValueChange={v => setForm(f => ({ ...f, unit_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">{isRTL ? "شقة" : "Apartment"}</SelectItem>
                  <SelectItem value="office">{isRTL ? "مكتب" : "Office"}</SelectItem>
                  <SelectItem value="shop">{isRTL ? "محل" : "Shop"}</SelectItem>
                  <SelectItem value="warehouse">{isRTL ? "مستودع" : "Warehouse"}</SelectItem>
                  <SelectItem value="villa">{isRTL ? "فيلا" : "Villa"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الطابق" : "Floor"}</Label>
              <Input type="number" value={form.floor_number} onChange={e => setForm(f => ({ ...f, floor_number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "المساحة (م²)" : "Area (m²)"}</Label>
              <Input type="number" value={form.area_sqm} onChange={e => setForm(f => ({ ...f, area_sqm: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الإيجار الشهري" : "Monthly Rent"}</Label>
              <Input type="number" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الحالة" : "Status"}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacant">{isRTL ? "شاغرة" : "Vacant"}</SelectItem>
                  <SelectItem value="occupied">{isRTL ? "مشغولة" : "Occupied"}</SelectItem>
                  <SelectItem value="maintenance">{isRTL ? "صيانة" : "Maintenance"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.unit_number || !form.property_id}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
            {isRTL ? "حفظ" : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateUnit;
