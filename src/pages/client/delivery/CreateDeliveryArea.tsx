import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";

const CreateDeliveryArea = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: "", name_en: "", delivery_fee: 0, estimated_time_minutes: 0,
    is_active: true, branch_id: "",
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name, name_en").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: existing } = useQuery({
    queryKey: ["delivery-area", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("delivery_areas").select("*").eq("id", id).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "", name_en: existing.name_en || "",
        delivery_fee: existing.delivery_fee || 0,
        estimated_time_minutes: existing.estimated_time_minutes || 0,
        is_active: existing.is_active ?? true, branch_id: existing.branch_id || "",
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, company_id: companyId };
      if (!payload.branch_id) payload.branch_id = null;
      if (isEdit) {
        const { error } = await (supabase as any).from("delivery_areas").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("delivery_areas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      queryClient.invalidateQueries({ queryKey: ["delivery-areas"] });
      navigate("/client/delivery/areas");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/delivery/areas")}><BackIcon className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold">{isEdit ? (isRTL ? "تعديل المنطقة" : "Edit Area") : (isRTL ? "منطقة جديدة" : "New Area")}</h1>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {isRTL ? "حفظ" : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? "بيانات المنطقة" : "Area Info"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "اسم المنطقة (عربي)" : "Area Name (Arabic)"} *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "اسم المنطقة (إنجليزي)" : "Area Name (English)"}</Label>
              <Input value={form.name_en} onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "رسوم التوصيل" : "Delivery Fee"}</Label>
              <Input type="number" min={0} value={form.delivery_fee} onChange={(e) => setForm(f => ({ ...f, delivery_fee: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الوقت المتوقع (دقيقة)" : "Estimated Time (minutes)"}</Label>
              <Input type="number" min={0} value={form.estimated_time_minutes} onChange={(e) => setForm(f => ({ ...f, estimated_time_minutes: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الفرع" : "Branch"}</Label>
              <Select value={form.branch_id} onValueChange={(v) => setForm(f => ({ ...f, branch_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الفرع" : "Select Branch"} /></SelectTrigger>
                <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <Label>{isRTL ? "نشط" : "Active"}</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateDeliveryArea;
