import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Loader2, DollarSign } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const PayClinicInvoice = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["clinic-invoice", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("clinic_invoices")
        .select("*, patients(name, name_en, patient_number)")
        .eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(payAmount);
      if (!amount || amount <= 0) throw new Error(isRTL ? "أدخل مبلغ صحيح" : "Enter valid amount");
      const newPaid = (invoice.paid_amount || 0) + amount;
      const status = newPaid >= invoice.total_amount ? "paid" : "partial";
      const { error } = await (supabase as any).from("clinic_invoices").update({ paid_amount: newPaid, payment_status: status, payment_method: payMethod }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-invoices"] });
      toast.success(isRTL ? "تم تسجيل الدفعة" : "Payment recorded");
      navigate("/client/clinic/billing");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const remaining = invoice ? (invoice.total_amount - (invoice.paid_amount || 0)) : 0;

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!invoice) return <div className="text-center py-16 text-muted-foreground">{isRTL ? "غير موجود" : "Not found"}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/clinic/billing")}>
          <BackIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          {isRTL ? "تسجيل دفعة" : "Record Payment"}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "بيانات الفاتورة" : "Invoice Details"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted-foreground">{isRTL ? "رقم الفاتورة" : "Invoice #"}</p><p className="font-mono font-medium tabular-nums">{invoice.invoice_number}</p></div>
              <div><p className="text-xs text-muted-foreground">{isRTL ? "المريض" : "Patient"}</p><p className="font-medium">{invoice.patients?.patient_number} - {isRTL ? invoice.patients?.name : invoice.patients?.name_en || invoice.patients?.name}</p></div>
              <div><p className="text-xs text-muted-foreground">{isRTL ? "الإجمالي" : "Total"}</p><p className="font-mono font-bold text-lg tabular-nums">{parseFloat(invoice.total_amount).toFixed(2)}</p></div>
              <div><p className="text-xs text-muted-foreground">{isRTL ? "المدفوع سابقاً" : "Previously Paid"}</p><p className="font-mono tabular-nums">{parseFloat(invoice.paid_amount || 0).toFixed(2)}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground">{isRTL ? "المتبقي" : "Remaining"}</p><p className="font-mono text-destructive font-bold text-xl tabular-nums">{remaining.toFixed(2)}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "بيانات الدفعة" : "Payment Info"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "المبلغ *" : "Amount *"}</Label>
              <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={remaining.toFixed(2)} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "طريقة الدفع" : "Payment Method"}</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{isRTL ? "نقداً" : "Cash"}</SelectItem>
                  <SelectItem value="bank">{isRTL ? "تحويل بنكي" : "Bank Transfer"}</SelectItem>
                  <SelectItem value="card">{isRTL ? "بطاقة" : "Card"}</SelectItem>
                  <SelectItem value="insurance">{isRTL ? "تأمين" : "Insurance"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate("/client/clinic/billing")}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => payMutation.mutate()} disabled={payMutation.isPending || !payAmount}>
                {payMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <DollarSign className="h-4 w-4 me-2" />}
                {isRTL ? "تأكيد الدفع" : "Confirm Payment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayClinicInvoice;
