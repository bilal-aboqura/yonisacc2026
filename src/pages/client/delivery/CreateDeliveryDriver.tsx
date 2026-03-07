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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";

const CreateDeliveryDriver = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: "", name_en: "", phone: "", vehicle_type: "", vehicle_plate: "",
    status: "active", branch_id: "", notes: "",
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
    queryKey: ["delivery-driver", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("delivery_drivers").select("*").eq("id", id).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "", name_en: existing.name_en || "",
        phone: existing.phone || "", vehicle_type: existing.vehicle_type || "",
        vehicle_plate: existing.vehicle_plate || "", status: existing.status || "active",
        branch_id: existing.branch_id || "", notes: existing.notes || "",
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, company_id: companyId, updated_at: new Date().toISOString() };
      if (!payload.branch_id) payload.branch_id = null;
      if (isEdit) {
        const { error } = await (supabase as any).from("delivery_drivers").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("delivery_drivers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      queryClient.invalidateQueries({ queryKey: ["delivery-drivers"] });
      navigate("/client/delivery/drivers");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/delivery/drivers")}><BackIcon className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold">{isEdit ? (isRTL ? "تعديل السائق" : "Edit Driver") : (isRTL ? "سائق جديد" : "New Driver")}</h1>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {isRTL ? "حفظ" : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? "بيانات السائق" : "Driver Info"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "اسم السائق (عربي)" : "Driver Name (Arabic)"} *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "اسم السائق (إنجليزي)" : "Driver Name (English)"}</Label>
              <Input value={form.name_en} onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "رقم الهاتف" : "Phone"}</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "نوع المركبة" : "Vehicle Type"}</Label>
              <Input value={form.vehicle_type} onChange={(e) => setForm(f => ({ ...f, vehicle_type: e.target.value }))} placeholder={isRTL ? "سيارة، دراجة نارية..." : "Car, Motorcycle..."} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "رقم اللوحة" : "Vehicle Plate"}</Label>
              <Input value={form.vehicle_plate} onChange={(e) => setForm(f => ({ ...f, vehicle_plate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الفرع" : "Branch"}</Label>
              <Select value={form.branch_id} onValueChange={(v) => setForm(f => ({ ...f, branch_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الفرع" : "Select Branch"} /></SelectTrigger>
                <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الحالة" : "Status"}</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{isRTL ? "نشط" : "Active"}</SelectItem>
                  <SelectItem value="inactive">{isRTL ? "غير نشط" : "Inactive"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateDeliveryDriver;
