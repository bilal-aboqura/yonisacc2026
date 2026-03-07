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
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Stethoscope } from "lucide-react";

const Doctors = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [form, setForm] = useState({ name: "", name_en: "", specialization: "", specialization_en: "", phone: "", email: "", license_number: "" });

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("doctors").select("*").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId };
      if (editingDoctor?.id) {
        const { error } = await (supabase as any).from("doctors").update(payload).eq("id", editingDoctor.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("doctors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      setDialogOpen(false);
      setEditingDoctor(null);
      setForm({ name: "", name_en: "", specialization: "", specialization_en: "", phone: "", email: "", license_number: "" });
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const openEdit = (d: any) => {
    setEditingDoctor(d);
    setForm({ name: d.name || "", name_en: d.name_en || "", specialization: d.specialization || "", specialization_en: d.specialization_en || "", phone: d.phone || "", email: d.email || "", license_number: d.license_number || "" });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          {isRTL ? "الأطباء" : "Doctors"}
        </h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingDoctor(null); setForm({ name: "", name_en: "", specialization: "", specialization_en: "", phone: "", email: "", license_number: "" }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة طبيب" : "Add Doctor"}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingDoctor ? (isRTL ? "تعديل الطبيب" : "Edit Doctor") : (isRTL ? "إضافة طبيب" : "New Doctor")}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{isRTL ? "الاسم *" : "Name *"}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{isRTL ? "الاسم بالإنجليزية" : "Name (EN)"}</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{isRTL ? "التخصص" : "Specialization"}</Label><Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{isRTL ? "التخصص (EN)" : "Specialization (EN)"}</Label><Input value={form.specialization_en} onChange={e => setForm(f => ({ ...f, specialization_en: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{isRTL ? "الهاتف" : "Phone"}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{isRTL ? "البريد" : "Email"}</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="col-span-2 space-y-1.5"><Label>{isRTL ? "رقم الترخيص" : "License Number"}</Label><Input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {isRTL ? "حفظ" : "Save"}
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
                  <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isRTL ? "التخصص" : "Specialization"}</TableHead>
                  <TableHead>{isRTL ? "الهاتف" : "Phone"}</TableHead>
                  <TableHead>{isRTL ? "الترخيص" : "License"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا يوجد أطباء" : "No doctors"}</TableCell></TableRow>
                ) : doctors.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{isRTL ? d.name : d.name_en || d.name}</TableCell>
                    <TableCell>{isRTL ? d.specialization : d.specialization_en || d.specialization || "-"}</TableCell>
                    <TableCell>{d.phone || "-"}</TableCell>
                    <TableCell>{d.license_number || "-"}</TableCell>
                    <TableCell><Badge variant={d.is_active ? "default" : "secondary"}>{d.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(d)}>{isRTL ? "تعديل" : "Edit"}</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Doctors;
