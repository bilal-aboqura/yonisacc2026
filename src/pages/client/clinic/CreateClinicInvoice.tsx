import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Save, Loader2, Receipt, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreateClinicInvoice = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    patient_id: "", doctor_id: "", invoice_number: "", invoice_date: new Date().toISOString().split("T")[0],
    insurance_amount: "0", notes: "",
  });
  const [lineItems, setLineItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);

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
      navigate("/client/clinic/billing");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const addItem = () => setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: string, val: any) => setLineItems(lineItems.map((item, i) => i === idx ? { ...item, [key]: val } : item));

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/clinic/billing")}>
          <BackIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          {isRTL ? "فاتورة مريض جديدة" : "New Patient Invoice"}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "بيانات الفاتورة" : "Invoice Info"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{isRTL ? "رقم الفاتورة *" : "Invoice # *"}</Label><Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{isRTL ? "التاريخ" : "Date"}</Label><Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "المريض *" : "Patient *"}</Label>
              <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر المريض" : "Select Patient"} /></SelectTrigger>
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
            <div className="space-y-1.5"><Label>{isRTL ? "مبلغ التأمين" : "Insurance Amount"}</Label><Input type="number" value={form.insurance_amount} onChange={e => setForm(f => ({ ...f, insurance_amount: e.target.value }))} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "ملخص" : "Summary"}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? "المجموع الفرعي" : "Subtotal"}</span><span className="font-mono tabular-nums">{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? "ضريبة 15%" : "VAT 15%"}</span><span className="font-mono tabular-nums">{taxAmount.toFixed(2)}</span></div>
              <div className="flex justify-between border-t pt-2 text-base font-bold"><span>{isRTL ? "الإجمالي" : "Total"}</span><span className="font-mono tabular-nums">{totalAmount.toFixed(2)}</span></div>
            </div>
            <div className="mt-4 space-y-1.5"><Label>{isRTL ? "ملاحظات" : "Notes"}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{isRTL ? "البنود" : "Line Items"}</CardTitle>
            <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 me-1" />{isRTL ? "إضافة بند" : "Add Item"}</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.map((item, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-3 items-end p-3 border rounded-lg">
              <div className="col-span-2 space-y-1"><Label className="text-xs">{isRTL ? "الوصف" : "Description"}</Label><Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">{isRTL ? "الكمية" : "Qty"}</Label><Input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 0)} /></div>
              <div className="space-y-1"><Label className="text-xs">{isRTL ? "السعر" : "Price"}</Label><Input type="number" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} /></div>
              <div className="flex items-end gap-2">
                <span className="text-sm font-mono tabular-nums pb-2">{(item.quantity * item.unit_price).toFixed(2)}</span>
                <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={lineItems.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/client/clinic/billing")}>{isRTL ? "إلغاء" : "Cancel"}</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.patient_id || !form.invoice_number}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {isRTL ? "حفظ الفاتورة" : "Save Invoice"}
        </Button>
      </div>
    </div>
  );
};

export default CreateClinicInvoice;
