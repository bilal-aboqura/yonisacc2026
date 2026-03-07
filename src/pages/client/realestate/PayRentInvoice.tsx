import { useState } from "react";
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

const PayRentInvoice = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    amount: "", payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash", reference: "", notes: "",
  });

  const { data: invoice } = useQuery({
    queryKey: ["re-rent-invoice", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("re_rent_invoices")
        .select("*, re_tenants(name, name_en)")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const remaining = invoice ? (invoice.total_amount + (invoice.late_fee || 0)) - (invoice.paid_amount || 0) : 0;

  const mutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(form.amount) || 0;
      // Insert payment
      const { error: payErr } = await (supabase as any).from("re_rent_payments").insert({
        invoice_id: id, tenant_id: invoice.tenant_id, amount: amt,
        payment_date: form.payment_date, payment_method: form.payment_method,
        reference: form.reference, notes: form.notes, company_id: companyId,
      });
      if (payErr) throw payErr;

      // Update invoice
      const newPaid = (invoice.paid_amount || 0) + amt;
      const total = invoice.total_amount + (invoice.late_fee || 0);
      const status = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "unpaid";
      const { error: updErr } = await (supabase as any).from("re_rent_invoices")
        .update({ paid_amount: newPaid, payment_status: status }).eq("id", id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم تسجيل الدفعة" : "Payment recorded");
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
        <h1 className="text-2xl font-bold">{isRTL ? "تسجيل دفعة إيجار" : "Record Rent Payment"}</h1>
      </div>

      {invoice && (
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "بيانات الفاتورة" : "Invoice Info"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">{isRTL ? "الفاتورة:" : "Invoice:"}</span> <span className="font-medium tabular-nums">{invoice.invoice_number}</span></div>
              <div><span className="text-muted-foreground">{isRTL ? "المستأجر:" : "Tenant:"}</span> <span className="font-medium">{isRTL ? invoice.re_tenants?.name : (invoice.re_tenants?.name_en || invoice.re_tenants?.name)}</span></div>
              <div><span className="text-muted-foreground">{isRTL ? "الإجمالي:" : "Total:"}</span> <span className="font-medium tabular-nums">{Number(invoice.total_amount || 0).toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">{isRTL ? "المتبقي:" : "Remaining:"}</span> <span className="font-bold text-destructive tabular-nums">{remaining.toLocaleString()}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{isRTL ? "بيانات الدفعة" : "Payment Details"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "المبلغ" : "Amount"}</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder={remaining.toString()} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "تاريخ الدفع" : "Payment Date"}</Label>
              <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "طريقة الدفع" : "Payment Method"}</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{isRTL ? "نقداً" : "Cash"}</SelectItem>
                  <SelectItem value="bank">{isRTL ? "تحويل بنكي" : "Bank Transfer"}</SelectItem>
                  <SelectItem value="check">{isRTL ? "شيك" : "Check"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "المرجع" : "Reference"}</Label>
              <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.amount}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
            {isRTL ? "تسجيل الدفعة" : "Record Payment"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayRentInvoice;
