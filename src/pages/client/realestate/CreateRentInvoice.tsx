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

const CreateRentInvoice = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    invoice_number: "", tenant_id: "", unit_id: "", lease_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    period_from: "", period_to: "", total_amount: "", late_fee: "0", notes: "",
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
      const { data } = await (supabase as any).from("re_units").select("id, unit_number, monthly_rent, re_properties(name, name_en)").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: leases = [] } = useQuery({
    queryKey: ["re-leases-active", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("re_leases").select("id, lease_number, monthly_rent, tenant_id, unit_id").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const handleLeaseChange = (leaseId: string) => {
    const lease = leases.find((l: any) => l.id === leaseId);
    if (lease) {
      setForm(f => ({
        ...f, lease_id: leaseId, tenant_id: lease.tenant_id, unit_id: lease.unit_id,
        total_amount: lease.monthly_rent?.toString() || "",
      }));
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        invoice_number: form.invoice_number, tenant_id: form.tenant_id, unit_id: form.unit_id,
        lease_id: form.lease_id || null, invoice_date: form.invoice_date,
        period_from: form.period_from, period_to: form.period_to,
        total_amount: parseFloat(form.total_amount) || 0,
        late_fee: parseFloat(form.late_fee) || 0,
        payment_status: "unpaid", paid_amount: 0,
        notes: form.notes, company_id: companyId,
      };
      const { error } = await (supabase as any).from("re_rent_invoices").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إصدار الفاتورة" : "Invoice created");
      queryClient.invalidateQueries({ queryKey: ["re-rent-invoices"] });
      navigate("/client/realestate/invoices");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/realestate/invoices")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-2xl font-bold">{isRTL ? "إصدار فاتورة إيجار" : "Create Rent Invoice"}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>{isRTL ? "بيانات الفاتورة" : "Invoice Details"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "رقم الفاتورة" : "Invoice Number"}</Label>
              <Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "عقد الإيجار" : "Lease Contract"}</Label>
              <Select value={form.lease_id} onValueChange={handleLeaseChange}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر عقد" : "Select Lease"} /></SelectTrigger>
                <SelectContent>
                  {leases.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.lease_number}</SelectItem>
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
              <Label>{isRTL ? "تاريخ الفاتورة" : "Invoice Date"}</Label>
              <Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الفترة من" : "Period From"}</Label>
              <Input type="date" value={form.period_from} onChange={e => setForm(f => ({ ...f, period_from: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الفترة إلى" : "Period To"}</Label>
              <Input type="date" value={form.period_to} onChange={e => setForm(f => ({ ...f, period_to: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "المبلغ الإجمالي" : "Total Amount"}</Label>
              <Input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "غرامة التأخير" : "Late Fee"}</Label>
              <Input type="number" value={form.late_fee} onChange={e => setForm(f => ({ ...f, late_fee: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.invoice_number || !form.tenant_id}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
            {isRTL ? "إصدار الفاتورة" : "Create Invoice"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateRentInvoice;
