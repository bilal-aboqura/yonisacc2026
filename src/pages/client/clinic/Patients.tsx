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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Eye, Edit, Loader2 } from "lucide-react";

const Patients = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", name_en: "", patient_number: "", date_of_birth: "", gender: "male",
    phone: "", mobile: "", email: "", address: "", blood_type: "",
    allergies: "", chronic_conditions: "", emergency_contact_name: "",
    emergency_contact_phone: "", insurance_provider: "", insurance_number: "", notes: "",
  });

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("patients").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId, updated_at: new Date().toISOString() };
      if (editingPatient?.id) {
        const { error } = await (supabase as any).from("patients").update(payload).eq("id", editingPatient.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("patients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success(isRTL ? "تم الحفظ بنجاح" : "Saved successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const resetForm = () => {
    setEditingPatient(null);
    setForm({
      name: "", name_en: "", patient_number: "", date_of_birth: "", gender: "male",
      phone: "", mobile: "", email: "", address: "", blood_type: "",
      allergies: "", chronic_conditions: "", emergency_contact_name: "",
      emergency_contact_phone: "", insurance_provider: "", insurance_number: "", notes: "",
    });
  };

  const openEdit = (p: any) => {
    setEditingPatient(p);
    setForm({
      name: p.name || "", name_en: p.name_en || "", patient_number: p.patient_number || "",
      date_of_birth: p.date_of_birth || "", gender: p.gender || "male",
      phone: p.phone || "", mobile: p.mobile || "", email: p.email || "",
      address: p.address || "", blood_type: p.blood_type || "",
      allergies: p.allergies || "", chronic_conditions: p.chronic_conditions || "",
      emergency_contact_name: p.emergency_contact_name || "",
      emergency_contact_phone: p.emergency_contact_phone || "",
      insurance_provider: p.insurance_provider || "", insurance_number: p.insurance_number || "",
      notes: p.notes || "",
    });
    setDialogOpen(true);
  };

  const filtered = patients.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          {isRTL ? "سجل المرضى" : "Patient Records"}
        </h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة مريض" : "Add Patient"}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPatient ? (isRTL ? "تعديل بيانات المريض" : "Edit Patient") : (isRTL ? "إضافة مريض جديد" : "New Patient")}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isRTL ? "رقم المريض *" : "Patient Number *"}</Label>
                <Input value={form.patient_number} onChange={e => setForm(f => ({ ...f, patient_number: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "الاسم *" : "Name *"}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "الاسم بالإنجليزية" : "Name (English)"}</Label>
                <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "تاريخ الميلاد" : "Date of Birth"}</Label>
                <Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "الجنس" : "Gender"}</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{isRTL ? "ذكر" : "Male"}</SelectItem>
                    <SelectItem value="female">{isRTL ? "أنثى" : "Female"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "فصيلة الدم" : "Blood Type"}</Label>
                <Select value={form.blood_type || "unknown"} onValueChange={v => setForm(f => ({ ...f, blood_type: v === "unknown" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">{isRTL ? "غير محدد" : "Unknown"}</SelectItem>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "الهاتف" : "Phone"}</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "الجوال" : "Mobile"}</Label>
                <Input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "العنوان" : "Address"}</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "شركة التأمين" : "Insurance Provider"}</Label>
                <Input value={form.insurance_provider} onChange={e => setForm(f => ({ ...f, insurance_provider: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "رقم التأمين" : "Insurance Number"}</Label>
                <Input value={form.insurance_number} onChange={e => setForm(f => ({ ...f, insurance_number: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "اسم جهة الطوارئ" : "Emergency Contact"}</Label>
                <Input value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "هاتف الطوارئ" : "Emergency Phone"}</Label>
                <Input value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>{isRTL ? "الحساسية" : "Allergies"}</Label>
                <Textarea value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>{isRTL ? "الأمراض المزمنة" : "Chronic Conditions"}</Label>
                <Textarea value={form.chronic_conditions} onChange={e => setForm(f => ({ ...f, chronic_conditions: e.target.value }))} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                {isRTL ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.patient_number}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {isRTL ? "حفظ" : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث بالاسم أو الرقم أو الهاتف..." : "Search by name, number or phone..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "الرقم" : "Number"}</TableHead>
                  <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isRTL ? "الهاتف" : "Phone"}</TableHead>
                  <TableHead>{isRTL ? "الجنس" : "Gender"}</TableHead>
                  <TableHead>{isRTL ? "التأمين" : "Insurance"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا يوجد مرضى" : "No patients found"}</TableCell></TableRow>
                ) : filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.patient_number}</TableCell>
                    <TableCell className="font-medium">{isRTL ? p.name : p.name_en || p.name}</TableCell>
                    <TableCell>{p.phone || p.mobile || "-"}</TableCell>
                    <TableCell>{p.gender === "male" ? (isRTL ? "ذكر" : "Male") : (isRTL ? "أنثى" : "Female")}</TableCell>
                    <TableCell>{p.insurance_provider || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedPatient(p); setViewDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Patient Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isRTL ? "بيانات المريض" : "Patient Details"}</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="grid grid-cols-2 gap-4">
              {[
                [isRTL ? "رقم المريض" : "Patient #", selectedPatient.patient_number],
                [isRTL ? "الاسم" : "Name", selectedPatient.name],
                [isRTL ? "تاريخ الميلاد" : "DOB", selectedPatient.date_of_birth || "-"],
                [isRTL ? "الجنس" : "Gender", selectedPatient.gender === "male" ? (isRTL ? "ذكر" : "Male") : (isRTL ? "أنثى" : "Female")],
                [isRTL ? "فصيلة الدم" : "Blood Type", selectedPatient.blood_type || "-"],
                [isRTL ? "الهاتف" : "Phone", selectedPatient.phone || "-"],
                [isRTL ? "الجوال" : "Mobile", selectedPatient.mobile || "-"],
                [isRTL ? "البريد" : "Email", selectedPatient.email || "-"],
                [isRTL ? "التأمين" : "Insurance", selectedPatient.insurance_provider || "-"],
                [isRTL ? "رقم التأمين" : "Insurance #", selectedPatient.insurance_number || "-"],
              ].map(([label, val], i) => (
                <div key={i}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium">{val}</p>
                </div>
              ))}
              {selectedPatient.allergies && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">{isRTL ? "الحساسية" : "Allergies"}</p>
                  <p className="text-destructive font-medium">{selectedPatient.allergies}</p>
                </div>
              )}
              {selectedPatient.chronic_conditions && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">{isRTL ? "الأمراض المزمنة" : "Chronic Conditions"}</p>
                  <p className="font-medium">{selectedPatient.chronic_conditions}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Patients;
