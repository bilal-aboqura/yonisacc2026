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

const CreateLease = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    lease_number: "", tenant_id: "", unit_id: "", start_date: "", end_date: "",
    monthly_rent: "", security_deposit: "", payment_frequency: "monthly", status: "active", notes: "",
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
      const { data } = await (supabase as any).from("re_units").select("id, unit_number, re_properties(name, name_en)").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: existing } = useQuery({
    queryKey: ["re-lease", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("re_leases").select("*").eq("id", id!).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) setForm({
      lease_number: existing.lease_number || "", tenant_id: existing.tenant_id || "",
      unit_id: existing.unit_id || "", start_date: existing.start_date || "",
      end_date: existing.end_date || "", monthly_rent: existing.monthly_rent?.toString() || "",
      security_deposit: existing.security_deposit?.toString() || "",
      payment_frequency: existing.payment_frequency || "monthly",
      status: existing.status || "active", notes: existing.notes || "",
    });
  }, [existing]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        lease_number: form.lease_number, tenant_id: form.tenant_id, unit_id: form.unit_id,
        start_date: form.start_date, end_date: form.end_date,
        monthly_rent: parseFloat(form.monthly_rent) || 0,
        security_deposit: parseFloat(form.security_deposit) || 0,
        payment_frequency: form.payment_frequency, status: form.status,
        notes: form.notes, company_id: companyId,
      };
      if (isEdit) {
        const { error } = await (supabase as any).from("re_leases").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("re_leases").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      queryClient.invalidateQueries({ queryKey: ["re-leases"] });
      navigate("/client/realestate/leases");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/realestate/leases")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? (isRTL ? "تعديل عقد" : "Edit Lease") : (isRTL ? "إضافة عقد جديد" : "New Lease")}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>{isRTL ? "بيانات العقد" : "Lease Details"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "رقم العقد" : "Lease Number"}</Label>
              <Input value={form.lease_number} onChange={e => setForm(f => ({ ...f, lease_number: e.target.value }))} />
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
              <Label>{isRTL ? "الوحدة" : "Unit"}</Label>
              <Select value={form.unit_id} onValueChange={v => setForm(f => ({ ...f, unit_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الوحدة" : "Select Unit"} /></SelectTrigger>
                <SelectContent>
                  {units.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.unit_number} - {isRTL ? u.re_properties?.name : (u.re_properties?.name_en || u.re_properties?.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "تاريخ البداية" : "Start Date"}</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "تاريخ النهاية" : "End Date"}</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الإيجار الشهري" : "Monthly Rent"}</Label>
              <Input type="number" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "مبلغ التأمين" : "Security Deposit"}</Label>
              <Input type="number" value={form.security_deposit} onChange={e => setForm(f => ({ ...f, security_deposit: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "دورة الدفع" : "Payment Frequency"}</Label>
              <Select value={form.payment_frequency} onValueChange={v => setForm(f => ({ ...f, payment_frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{isRTL ? "شهري" : "Monthly"}</SelectItem>
                  <SelectItem value="quarterly">{isRTL ? "ربع سنوي" : "Quarterly"}</SelectItem>
                  <SelectItem value="semi_annual">{isRTL ? "نصف سنوي" : "Semi-Annual"}</SelectItem>
                  <SelectItem value="annual">{isRTL ? "سنوي" : "Annual"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الحالة" : "Status"}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{isRTL ? "ساري" : "Active"}</SelectItem>
                  <SelectItem value="expired">{isRTL ? "منتهي" : "Expired"}</SelectItem>
                  <SelectItem value="terminated">{isRTL ? "ملغي" : "Terminated"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.lease_number || !form.tenant_id || !form.unit_id}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
            {isRTL ? "حفظ" : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateLease;
