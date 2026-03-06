import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

const Employees = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    employee_number: "", name: "", name_en: "", national_id: "", phone: "", email: "",
    hire_date: new Date().toISOString().split("T")[0], job_title: "", job_title_en: "",
    basic_salary: 0, housing_allowance: 0, transport_allowance: 0, other_allowance: 0,
    bank_name: "", bank_iban: "", department_id: "", status: "active",
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["hr-employees", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_employees").select("*, hr_departments(name, name_en)")
        .eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["hr-departments", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_departments").select("*").eq("company_id", companyId).eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId, department_id: form.department_id || null };
      if (editId) {
        const { error } = await (supabase as any).from("hr_employees").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("hr_employees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      setDialogOpen(false);
      resetForm();
      toast.success(isRTL ? "تم الحفظ" : "Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("hr_employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      toast.success(isRTL ? "تم الحذف" : "Deleted");
    },
  });

  const resetForm = () => {
    setEditId(null);
    setForm({
      employee_number: "", name: "", name_en: "", national_id: "", phone: "", email: "",
      hire_date: new Date().toISOString().split("T")[0], job_title: "", job_title_en: "",
      basic_salary: 0, housing_allowance: 0, transport_allowance: 0, other_allowance: 0,
      bank_name: "", bank_iban: "", department_id: "", status: "active",
    });
  };

  const openEdit = (emp: any) => {
    setEditId(emp.id);
    setForm({
      employee_number: emp.employee_number, name: emp.name, name_en: emp.name_en || "",
      national_id: emp.national_id || "", phone: emp.phone || "", email: emp.email || "",
      hire_date: emp.hire_date, job_title: emp.job_title || "", job_title_en: emp.job_title_en || "",
      basic_salary: emp.basic_salary, housing_allowance: emp.housing_allowance || 0,
      transport_allowance: emp.transport_allowance || 0, other_allowance: emp.other_allowance || 0,
      bank_name: emp.bank_name || "", bank_iban: emp.bank_iban || "",
      department_id: emp.department_id || "", status: emp.status || "active",
    });
    setDialogOpen(true);
  };

  const totalSalary = (emp: any) =>
    (emp.basic_salary || 0) + (emp.housing_allowance || 0) + (emp.transport_allowance || 0) + (emp.other_allowance || 0);

  const filtered = employees.filter((e: any) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isRTL ? "الموظفين" : "Employees"}</h1>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة موظف" : "Add Employee"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الموظفين" : "Total Employees"}</p>
          <p className="text-2xl font-bold">{employees.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "نشط" : "Active"}</p>
          <p className="text-2xl font-bold text-emerald-600">{employees.filter((e: any) => e.status === "active").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الرواتب" : "Total Salaries"}</p>
          <p className="text-2xl font-bold">{employees.reduce((s: number, e: any) => s + totalSalary(e), 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "الأقسام" : "Departments"}</p>
          <p className="text-2xl font-bold">{departments.length}</p>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="ps-10" placeholder={isRTL ? "بحث..." : "Search..."} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{isRTL ? "قائمة الموظفين" : "Employees List"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{isRTL ? "لا يوجد موظفين" : "No employees"}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{isRTL ? "رقم" : "#"}</TableHead>
                  <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isRTL ? "القسم" : "Department"}</TableHead>
                  <TableHead>{isRTL ? "المسمى" : "Title"}</TableHead>
                  <TableHead>{isRTL ? "الراتب الإجمالي" : "Total Salary"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono">{emp.employee_number}</TableCell>
                      <TableCell className="font-medium">{isRTL ? emp.name : (emp.name_en || emp.name)}</TableCell>
                      <TableCell>{emp.hr_departments ? (isRTL ? emp.hr_departments.name : (emp.hr_departments.name_en || emp.hr_departments.name)) : "—"}</TableCell>
                      <TableCell>{isRTL ? emp.job_title : (emp.job_title_en || emp.job_title) || "—"}</TableCell>
                      <TableCell>{totalSalary(emp).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={emp.status === "active" ? "default" : "destructive"}>
                          {emp.status === "active" ? (isRTL ? "نشط" : "Active") : (isRTL ? "منتهي" : "Terminated")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(emp.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? (isRTL ? "تعديل موظف" : "Edit Employee") : (isRTL ? "إضافة موظف" : "Add Employee")}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "رقم الموظف" : "Employee #"}</Label>
              <Input value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "القسم" : "Department"}</Label>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{isRTL ? d.name : (d.name_en || d.name)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{isRTL ? "الاسم بالعربي" : "Name (AR)"}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "الاسم بالإنجليزي" : "Name (EN)"}</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "رقم الهوية" : "National ID"}</Label><Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "الجوال" : "Phone"}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "البريد" : "Email"}</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "تاريخ التعيين" : "Hire Date"}</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "المسمى الوظيفي" : "Job Title"}</Label><Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "الراتب الأساسي" : "Basic Salary"}</Label><Input type="number" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: +e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "بدل سكن" : "Housing"}</Label><Input type="number" value={form.housing_allowance} onChange={(e) => setForm({ ...form, housing_allowance: +e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "بدل نقل" : "Transport"}</Label><Input type="number" value={form.transport_allowance} onChange={(e) => setForm({ ...form, transport_allowance: +e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "بدلات أخرى" : "Other"}</Label><Input type="number" value={form.other_allowance} onChange={(e) => setForm({ ...form, other_allowance: +e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "البنك" : "Bank"}</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isRTL ? "آيبان" : "IBAN"}</Label><Input value={form.bank_iban} onChange={(e) => setForm({ ...form, bank_iban: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>{isRTL ? "الحالة" : "Status"}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{isRTL ? "نشط" : "Active"}</SelectItem>
                  <SelectItem value="terminated">{isRTL ? "منتهي" : "Terminated"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{isRTL ? "إلغاء" : "Cancel"}</Button></DialogClose>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.employee_number}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
