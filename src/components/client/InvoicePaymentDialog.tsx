import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyId } from "@/hooks/useCompanyId";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface InvoicePaymentDialogProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InvoicePaymentDialog = ({ invoice, open, onOpenChange }: InvoicePaymentDialogProps) => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [newPayment, setNewPayment] = useState({
    amount: "",
    payment_method: "cash",
    payment_date: new Date().toISOString().split("T")[0],
    reference_number: "",
    notes: "",
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["invoice-payments", invoice?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_payments")
        .select("*")
        .eq("invoice_id", invoice.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!invoice?.id && open,
  });

  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const remaining = (invoice?.total ?? 0) - totalPaid;

  const handleAddPayment = async () => {
    const amount = parseFloat(newPayment.amount);
    if (!amount || amount <= 0) {
      toast.error(isRTL ? "أدخل مبلغ صحيح" : "Enter a valid amount");
      return;
    }
    if (amount > remaining + 0.01) {
      toast.error(isRTL ? "المبلغ أكبر من الرصيد المتبقي" : "Amount exceeds remaining balance");
      return;
    }

    setSaving(true);
    try {
      const { error: payError } = await supabase.from("invoice_payments").insert({
        invoice_id: invoice.id,
        company_id: companyId!,
        amount,
        payment_method: newPayment.payment_method,
        payment_date: newPayment.payment_date,
        reference_number: newPayment.reference_number || null,
        notes: newPayment.notes || null,
        created_by: user?.id,
      });
      if (payError) throw payError;

      const newPaidTotal = totalPaid + amount;
      const newPaymentStatus = newPaidTotal >= (invoice.total ?? 0) ? "paid" : "partial";

      const { error: invError } = await supabase
        .from("invoices")
        .update({ paid_amount: newPaidTotal, payment_status: newPaymentStatus })
        .eq("id", invoice.id);
      if (invError) throw invError;

      toast.success(isRTL ? "تم تسجيل الدفعة بنجاح" : "Payment recorded");
      setNewPayment({ amount: "", payment_method: "cash", payment_date: new Date().toISOString().split("T")[0], reference_number: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (payment: any) => {
    try {
      const { error } = await supabase.from("invoice_payments").delete().eq("id", payment.id);
      if (error) throw error;

      const newPaidTotal = totalPaid - Number(payment.amount);
      const newPaymentStatus = newPaidTotal <= 0 ? "unpaid" : newPaidTotal >= (invoice.total ?? 0) ? "paid" : "partial";

      await supabase.from("invoices").update({ paid_amount: Math.max(0, newPaidTotal), payment_status: newPaymentStatus }).eq("id", invoice.id);

      toast.success(isRTL ? "تم حذف الدفعة" : "Payment deleted");
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const methodLabel = (m: string) => {
    const map: Record<string, string> = {
      cash: isRTL ? "نقدي" : "Cash",
      bank_transfer: isRTL ? "تحويل بنكي" : "Bank Transfer",
      check: isRTL ? "شيك" : "Check",
      card: isRTL ? "بطاقة" : "Card",
    };
    return map[m] || m;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${isRTL ? "rtl" : "ltr"}`}>
        <DialogHeader>
          <DialogTitle>
            {isRTL ? `تحصيل دفعات - ${invoice?.invoice_number}` : `Payments - ${invoice?.invoice_number}`}
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
          <div className="text-center">
            <p className="text-muted-foreground">{isRTL ? "إجمالي الفاتورة" : "Invoice Total"}</p>
            <p className="font-bold text-lg">{(invoice?.total ?? 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">{isRTL ? "المدفوع" : "Paid"}</p>
            <p className="font-bold text-lg text-green-600">{totalPaid.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">{isRTL ? "المتبقي" : "Remaining"}</p>
            <p className="font-bold text-lg text-destructive">{remaining.toLocaleString()}</p>
          </div>
        </div>

        {/* Existing payments */}
        {payments.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <p className="text-sm font-semibold text-muted-foreground">{isRTL ? "الدفعات السابقة" : "Previous Payments"}</p>
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold">{Number(p.amount).toLocaleString()}</span>
                  <span className="text-muted-foreground">{methodLabel(p.payment_method)}</span>
                  <span className="text-muted-foreground">{p.payment_date}</span>
                  {p.reference_number && <span className="text-xs text-muted-foreground">#{p.reference_number}</span>}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeletePayment(p)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Add new payment */}
        {remaining > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">{isRTL ? "إضافة دفعة جديدة" : "Add New Payment"}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isRTL ? "المبلغ" : "Amount"}</Label>
                <Input type="number" step="0.01" max={remaining} value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  placeholder={remaining.toLocaleString()} />
              </div>
              <div>
                <Label>{isRTL ? "طريقة الدفع" : "Method"}</Label>
                <Select value={newPayment.payment_method} onValueChange={(v) => setNewPayment({ ...newPayment, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{isRTL ? "نقدي" : "Cash"}</SelectItem>
                    <SelectItem value="bank_transfer">{isRTL ? "تحويل بنكي" : "Bank Transfer"}</SelectItem>
                    <SelectItem value="check">{isRTL ? "شيك" : "Check"}</SelectItem>
                    <SelectItem value="card">{isRTL ? "بطاقة" : "Card"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isRTL ? "التاريخ" : "Date"}</Label>
                <Input type="date" value={newPayment.payment_date}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })} />
              </div>
              <div>
                <Label>{isRTL ? "رقم المرجع" : "Reference #"}</Label>
                <Input value={newPayment.reference_number}
                  onChange={(e) => setNewPayment({ ...newPayment, reference_number: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
              <Textarea rows={2} value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })} />
            </div>
            <Button onClick={handleAddPayment} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="mr-2">{isRTL ? "تسجيل الدفعة" : "Record Payment"}</span>
            </Button>
          </div>
        )}

        {remaining <= 0 && (
          <p className="text-center text-green-600 font-semibold py-4">
            {isRTL ? "✅ تم سداد الفاتورة بالكامل" : "✅ Invoice fully paid"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePaymentDialog;
