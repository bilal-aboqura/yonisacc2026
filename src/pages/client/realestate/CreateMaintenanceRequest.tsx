import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CreateMaintenanceRequest = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    description: "", tenant_id: "", unit_id: "", priority: "medium",
    request_date: new Date().toISOString().split("T")[0], estimated_cost: "", assigned_to: "", notes: "",
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["re-tenants-list", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("re_tenants").select("id, name, name_en").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["re-units-list", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("re_units").select("id, unit_number").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        description: form.description, tenant_id: form.tenant_id || null,
        unit_id: form.unit_id, priority: form.priority, request_date: form.request_date,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
        assigned_to: form.assigned_to || null, notes: form.notes,
        status: "open", company_id: companyId,
      };
      const { error } = await (supabase as any).from("re_maintenance_requests").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إنشاء الطلب" : "Request created");
      queryClient.invalidateQueries({ queryKey: ["re-maintenance"] });
      navigate("/client/realestate/maintenance");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/realestate/maintenance")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-2xl font-bold">{isRTL ? "طلب صيانة جديد" : "New Maintenance Request"}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>{isRTL ? "بيانات الطلب" : "Request Details"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "الوحدة" : "Unit"}</Label>
              <Select value={form.unit_id} onValueChange={v => setForm(f => ({ ...f, unit_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الوحدة" : "Select Unit"} /></SelectTrigger>
                <SelectContent>
                  {units.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.unit_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "المستأجر" : "Tenant"}</Label>
              <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر المستأجر" : "Select Tenant"} /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{isRTL ? t.name : (t.name_en || t.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الأولوية" : "Priority"}</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{isRTL ? "منخفضة" : "Low"}</SelectItem>
                  <SelectItem value="medium">{isRTL ? "متوسطة" : "Medium"}</SelectItem>
                  <SelectItem value="high">{isRTL ? "عالية" : "High"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "تاريخ الطلب" : "Request Date"}</Label>
              <Input type="date" value={form.request_date} onChange={e => setForm(f => ({ ...f, request_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "التكلفة المقدرة" : "Estimated Cost"}</Label>
              <Input type="number" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "المسؤول" : "Assigned To"}</Label>
              <Input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isRTL ? "الوصف" : "Description"}</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.description || !form.unit_id}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
            {isRTL ? "إنشاء الطلب" : "Create Request"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMaintenanceRequest;
