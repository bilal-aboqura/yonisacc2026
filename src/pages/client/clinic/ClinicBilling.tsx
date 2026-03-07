import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Receipt, Trash2, DollarSign } from "lucide-react";

const ClinicBilling = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [form, setForm] = useState({
    patient_id: "", doctor_id: "", invoice_number: "", invoice_date: new Date().toISOString().split("T")[0],
    insurance_amount: "0", notes: "",
  });
  const [lineItems, setLineItems] = useState([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["clinic-invoices", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("clinic_invoices")
        .select("*, patients(name, name_en, patient_number), doctors(name, name_en)")
        .eq("company_id", companyId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list", companyId],
    queryFn: async () => { const { data } = await (supabase as any).from("patients").select("id, name, name_en, patient_number").eq("company_id", companyId).eq("is_active", true); return data || []; },
    enabled: !!companyId,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-list", companyId],
    queryFn: async () => { const { data } = await (supabase as any).from("doctors").select("id, name, name_en").eq("company_id", companyId).eq("is_active", true); return data || []; },
    enabled: !!companyId,
  });

  const subtotal = lineItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
  const taxAmount = subtotal * 0.15;
  const totalAmount = subtotal + taxAmount;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validItems = lineItems.filter(i => i.description.trim());
      if (!validItems.length) throw new Error(isRTL ? "أضف بند واحد على الأقل" : "Add at least one item");
      const insAmount = parseFloat(form.insurance_amount) || 0;
      const { data: inv, error } = await (supabase as any).from("clinic_invoices").insert({
        company_id: companyId, patient_id: form.patient_id, doctor_id: form.doctor_id || null,
        invoice_number: form.invoice_number, invoice_date: form.invoice_date,
        subtotal, tax_amount: taxAmount, total_amount: totalAmount,
        insurance_amount: insAmount,
        insurance_status: insAmount > 0 ? "pending" : "none",
        notes: form.notes || null,
      }).select("id").single();
      if (error) throw error;
      const itemsPayload = validItems.map(i => ({ invoice_id: inv.id, description: i.description, quantity: i.quantity, unit_price: i.unit_price, total: i.quantity * i.unit_price }));
      const { error: itemsError } = await (supabase as any).from("clinic_invoice_items").insert(itemsPayload);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-invoices"] });
      toast.success(isRTL ? "تم إنشاء الفاتورة" : "Invoice created");
      setDialogOpen(false);
      setLineItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(payAmount);
      if (!amount || amount <= 0) throw new Error("Invalid amount");
      const newPaid = (selectedInvoice.paid_amount || 0) + amount;
      const status = newPaid >= selectedInvoice.total_amount ? "paid" : "partial";
      const { error } = await (supabase as any).from("clinic_invoices").update({ paid_amount: newPaid, payment_status: status, payment_method: payMethod }).eq("id", selectedInvoice.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-invoices"] });
      toast.success(isRTL ? "تم تسجيل الدفعة" : "Payment recorded");
      setPayDialogOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const addItem = () => setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  const removeItem = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: string, val: any) => setLineItems(lineItems.map((item, i) => i === idx ? { ...item, [key]: val } : item));

  const statusBadge = (s: string) => {
    const map: Record<string, [string, string, any]> = {
      unpaid: ["غير مدفوعة", "Unpaid", "destructive"],
      partial: ["مدفوعة جزئياً", "Partial", "outline"],
      paid: ["مدفوعة", "Paid", "default"],
    };
    const [ar, en, variant] = map[s] || [s, s, "secondary"];
    return <Badge variant={variant}>{isRTL ? ar : en}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" />{isRTL ? "الفوترة" : "Billing"}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 me-2" />{isRTL ? "فاتورة جديدة" : "New Invoice"}</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{isRTL ? "فاتورة مريض جديدة" : "New Patient Invoice"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isRTL ? "رقم الفاتورة *" : "Invoice # *"}</Label>
                <Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
              </div>
              <div className="space-y-1.5"><Label>{isRTL ? "التاريخ" : "Date"}</Label><Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "المريض *" : "Patient *"}</Label>
                <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.patient_number} - {isRTL ? p.name : p.name_en || p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "الطبيب" : "Doctor"}</Label>
                <Select value={form.doctor_id} onValueChange={v => setForm(f => ({ ...f, doctor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>{doctors.map((d: any) => <SelectItem key={d.id} value={d.id}>{isRTL ? d.name : d.name_en || d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "مبلغ التأمين" : "Insurance Amount"}</Label>
                <Input type="number" value={form.insurance_amount} onChange={e => setForm(f => ({ ...f, insurance_amount: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{isRTL ? "البنود" : "Line Items"}</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 me-1" />{isRTL ? "إضافة" : "Add"}</Button>
              </div>
              {lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2 items-end p-3 border rounded-lg">
                  <div className="col-span-2 space-y-1"><Label className="text-xs">{isRTL ? "الوصف" : "Description"}</Label><Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">{isRTL ? "الكمية" : "Qty"}</Label><Input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 0)} /></div>
                  <div className="space-y-1"><Label className="text-xs">{isRTL ? "السعر" : "Price"}</Label><Input type="number" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} /></div>
                  <div className="flex items-end gap-1">
                    <span className="text-sm font-mono pb-2">{(item.quantity * item.unit_price).toFixed(2)}</span>
                    <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={lineItems.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              <div className="text-end space-y-1 text-sm">
                <p>{isRTL ? "المجموع الفرعي" : "Subtotal"}: {subtotal.toFixed(2)}</p>
                <p>{isRTL ? "ضريبة 15%" : "VAT 15%"}: {taxAmount.toFixed(2)}</p>
                <p className="font-bold text-base">{isRTL ? "الإجمالي" : "Total"}: {totalAmount.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.patient_id || !form.invoice_number}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}{isRTL ? "حفظ" : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRTL ? "المريض" : "Patient"}</TableHead>
                  <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                  <TableHead>{isRTL ? "المدفوع" : "Paid"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد فواتير" : "No invoices"}</TableCell></TableRow>
                ) : invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.invoice_date}</TableCell>
                    <TableCell>{inv.patients?.patient_number} - {isRTL ? inv.patients?.name : inv.patients?.name_en || inv.patients?.name}</TableCell>
                    <TableCell className="font-mono">{parseFloat(inv.total_amount).toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{parseFloat(inv.paid_amount || 0).toFixed(2)}</TableCell>
                    <TableCell>{statusBadge(inv.payment_status)}</TableCell>
                    <TableCell>
                      {inv.payment_status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedInvoice(inv); setPayAmount(""); setPayDialogOpen(true); }}>
                          <DollarSign className="h-3 w-3 me-1" />{isRTL ? "دفع" : "Pay"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isRTL ? "تسجيل دفعة" : "Record Payment"}</DialogTitle></DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {isRTL ? "المتبقي:" : "Remaining:"} {(selectedInvoice.total_amount - (selectedInvoice.paid_amount || 0)).toFixed(2)}
              </p>
              <div className="space-y-1.5"><Label>{isRTL ? "المبلغ" : "Amount"}</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayDialogOpen(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
                <Button onClick={() => payMutation.mutate()} disabled={payMutation.isPending}>
                  {payMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}{isRTL ? "تأكيد" : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClinicBilling;
