import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building, Pencil, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const Departments = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", name_en: "", manager_name: "" });

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["hr-departments", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_departments").select("*").eq("company_id", companyId).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: empCounts = {} } = useQuery({
    queryKey: ["hr-emp-counts", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_employees").select("department_id").eq("company_id", companyId).eq("status", "active");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((e: any) => { if (e.department_id) counts[e.department_id] = (counts[e.department_id] || 0) + 1; });
      return counts;
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId };
      if (editId) {
        const { error } = await (supabase as any).from("hr_departments").update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("hr_departments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-departments"] });
      setShowForm(false);
      setEditId(null);
      setForm({ name: "", name_en: "", manager_name: "" });
      toast.success(isRTL ? "تم الحفظ" : "Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("hr_departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-departments"] });
      toast.success(isRTL ? "تم الحذف" : "Deleted");
    },
  });

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditId(null); setForm({ name: "", name_en: "", manager_name: "" }); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {editId ? (isRTL ? "تعديل قسم" : "Edit Department") : (isRTL ? "إضافة قسم" : "Add Department")}
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "اسم القسم" : "Name (AR)"}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "الاسم بالإنجليزي" : "Name (EN)"}</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "اسم المدير" : "Manager Name"}</Label><Input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}{isRTL ? "حفظ" : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isRTL ? "الأقسام" : "Departments"}</h1>
        <Button onClick={() => { setEditId(null); setForm({ name: "", name_en: "", manager_name: "" }); setShowForm(true); }}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة قسم" : "Add Department"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />{isRTL ? "قائمة الأقسام" : "Departments"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          departments.length === 0 ? <div className="text-center py-12 text-muted-foreground">{isRTL ? "لا يوجد أقسام" : "No departments"}</div> :
          <div className="overflow-auto rounded-lg border border-border/50">
            <Table>
              <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                <TableHead className="border-b border-border/50">{isRTL ? "القسم" : "Department"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "المدير" : "Manager"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "عدد الموظفين" : "Employees"}</TableHead>
                <TableHead className="border-b border-border/50">{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {departments.map((d: any, idx: number) => (
                  <TableRow key={d.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                    <TableCell className="font-medium border-b border-border/30">{isRTL ? d.name : (d.name_en || d.name)}</TableCell>
                    <TableCell className="border-b border-border/30">{d.manager_name || "—"}</TableCell>
                    <TableCell className="border-b border-border/30">{(empCounts as any)[d.id] || 0}</TableCell>
                    <TableCell className="border-b border-border/30">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setEditId(d.id);
                          setForm({ name: d.name, name_en: d.name_en || "", manager_name: d.manager_name || "" });
                          setShowForm(true);
                        }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default Departments;
