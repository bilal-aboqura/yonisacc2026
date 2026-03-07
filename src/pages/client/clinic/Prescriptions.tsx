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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Pill, Trash2, Eye } from "lucide-react";

const Prescriptions = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<any>(null);
  const [form, setForm] = useState({ patient_id: "", doctor_id: "", prescription_date: new Date().toISOString().split("T")[0], notes: "" });
  const [items, setItems] = useState([{ medicine_name: "", dosage: "", frequency: "", duration: "", instructions: "", quantity: 1 }]);

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["prescriptions", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("prescriptions")
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validItems = items.filter(i => i.medicine_name.trim());
      if (!validItems.length) throw new Error(isRTL ? "أضف دواء واحد على الأقل" : "Add at least one medicine");
      const { data: rx, error } = await (supabase as any).from("prescriptions").insert({
        company_id: companyId, patient_id: form.patient_id, doctor_id: form.doctor_id,
        prescription_date: form.prescription_date, notes: form.notes || null,
      }).select("id").single();
      if (error) throw error;
      const itemsPayload = validItems.map(i => ({ ...i, prescription_id: rx.id }));
      const { error: itemsError } = await (supabase as any).from("prescription_items").insert(itemsPayload);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast.success(isRTL ? "تم حفظ الوصفة" : "Prescription saved");
      setDialogOpen(false);
      setItems([{ medicine_name: "", dosage: "", frequency: "", duration: "", instructions: "", quantity: 1 }]);
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const viewPrescription = async (rx: any) => {
    const { data } = await (supabase as any).from("prescription_items").select("*").eq("prescription_id", rx.id);
    setSelectedRx({ ...rx, items: data || [] });
    setViewDialogOpen(true);
  };

  const addItem = () => setItems([...items, { medicine_name: "", dosage: "", frequency: "", duration: "", instructions: "", quantity: 1 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: string, val: any) => setItems(items.map((item, i) => i === idx ? { ...item, [key]: val } : item));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Pill className="h-6 w-6 text-primary" />{isRTL ? "الوصفات الطبية" : "Prescriptions"}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 me-2" />{isRTL ? "وصفة جديدة" : "New Prescription"}</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{isRTL ? "وصفة طبية جديدة" : "New Prescription"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>{isRTL ? "المريض *" : "Patient *"}</Label>
                <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.patient_number} - {isRTL ? p.name : p.name_en || p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "الطبيب *" : "Doctor *"}</Label>
                <Select value={form.doctor_id} onValueChange={v => setForm(f => ({ ...f, doctor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>{doctors.map((d: any) => <SelectItem key={d.id} value={d.id}>{isRTL ? d.name : d.name_en || d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{isRTL ? "التاريخ" : "Date"}</Label><Input type="date" value={form.prescription_date} onChange={e => setForm(f => ({ ...f, prescription_date: e.target.value }))} /></div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{isRTL ? "الأدوية" : "Medicines"}</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 me-1" />{isRTL ? "إضافة" : "Add"}</Button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-end p-3 border rounded-lg">
                  <div className="col-span-2 space-y-1"><Label className="text-xs">{isRTL ? "اسم الدواء" : "Medicine"}</Label><Input value={item.medicine_name} onChange={e => updateItem(idx, "medicine_name", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">{isRTL ? "الجرعة" : "Dosage"}</Label><Input value={item.dosage} onChange={e => updateItem(idx, "dosage", e.target.value)} placeholder="500mg" /></div>
                  <div className="space-y-1"><Label className="text-xs">{isRTL ? "التكرار" : "Frequency"}</Label><Input value={item.frequency} onChange={e => updateItem(idx, "frequency", e.target.value)} placeholder="3x/day" /></div>
                  <div className="space-y-1"><Label className="text-xs">{isRTL ? "المدة" : "Duration"}</Label><Input value={item.duration} onChange={e => updateItem(idx, "duration", e.target.value)} placeholder="7 days" /></div>
                  <div className="flex items-end"><Button size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={items.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 mt-4"><Label>{isRTL ? "ملاحظات" : "Notes"}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.patient_id || !form.doctor_id}>
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
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRTL ? "المريض" : "Patient"}</TableHead>
                  <TableHead>{isRTL ? "الطبيب" : "Doctor"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد وصفات" : "No prescriptions"}</TableCell></TableRow>
                ) : prescriptions.map((rx: any) => (
                  <TableRow key={rx.id}>
                    <TableCell>{rx.prescription_date}</TableCell>
                    <TableCell>{rx.patients?.patient_number} - {isRTL ? rx.patients?.name : rx.patients?.name_en || rx.patients?.name}</TableCell>
                    <TableCell>{isRTL ? rx.doctors?.name : rx.doctors?.name_en || rx.doctors?.name}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => viewPrescription(rx)}><Eye className="h-4 w-4 me-1" />{isRTL ? "عرض" : "View"}</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isRTL ? "تفاصيل الوصفة" : "Prescription Details"}</DialogTitle></DialogHeader>
          {selectedRx && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">{isRTL ? "المريض:" : "Patient:"}</span> {selectedRx.patients?.name}</div>
                <div><span className="text-muted-foreground">{isRTL ? "الطبيب:" : "Doctor:"}</span> {selectedRx.doctors?.name}</div>
                <div><span className="text-muted-foreground">{isRTL ? "التاريخ:" : "Date:"}</span> {selectedRx.prescription_date}</div>
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{isRTL ? "الدواء" : "Medicine"}</TableHead>
                  <TableHead>{isRTL ? "الجرعة" : "Dosage"}</TableHead>
                  <TableHead>{isRTL ? "التكرار" : "Frequency"}</TableHead>
                  <TableHead>{isRTL ? "المدة" : "Duration"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {selectedRx.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.medicine_name}</TableCell>
                      <TableCell>{item.dosage || "-"}</TableCell>
                      <TableCell>{item.frequency || "-"}</TableCell>
                      <TableCell>{item.duration || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {selectedRx.notes && <p className="text-sm text-muted-foreground">{selectedRx.notes}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Prescriptions;
