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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, Pencil, Trash2, Loader2, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import EmployeeForm from "@/components/hr/EmployeeForm";

const Employees = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editData, setEditData] = useState<any>(null);

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

  const { data: workShifts = [] } = useQuery({
    queryKey: ["hr-work-shifts", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_work_shifts").select("*").eq("company_id", companyId).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: costCenters = [] } = useQuery({
    queryKey: ["cost-centers-active", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers").select("id, code, name, name_en")
        .eq("company_id", companyId!).eq("is_active", true).order("code");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["hr-employee-accounts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts").select("id, code, name, name_en")
        .eq("company_id", companyId!).eq("is_active", true).eq("is_parent", false).order("code");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
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

  const openEdit = (emp: any) => {
    setEditId(emp.id);
    setEditData(emp);
    setShowForm(true);
  };

  const totalSalary = (emp: any) =>
    (emp.basic_salary || 0) + (emp.housing_allowance || 0) + (emp.transport_allowance || 0) + (emp.other_allowance || 0);

  const filtered = employees.filter((e: any) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_number.toLowerCase().includes(search.toLowerCase())
  );

  if (showForm) {
    return (
      <EmployeeForm
        editId={editId}
        editData={editData}
        companyId={companyId}
        departments={departments}
        workShifts={workShifts}
        costCenters={costCenters}
        accounts={accounts}
        onClose={() => { setShowForm(false); setEditId(null); setEditData(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isRTL ? "الموظفين" : "Employees"}</h1>
        <Button onClick={() => { setEditId(null); setEditData(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة موظف" : "Add Employee"}
        </Button>
      </div>

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
            <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                  <TableHead className="border-b border-border/50">{isRTL ? "رقم" : "#"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الاسم" : "Name"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "القسم" : "Department"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المسمى" : "Title"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "انتهاء العقد" : "Contract End"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الراتب الإجمالي" : "Total Salary"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((emp: any, idx: number) => {
                    const isExpiringSoon = emp.contract_end_date &&
                      new Date(emp.contract_end_date) <= new Date(Date.now() + 30 * 86400000) &&
                      new Date(emp.contract_end_date) >= new Date();
                    const isExpired = emp.contract_end_date && new Date(emp.contract_end_date) < new Date();

                    return (
                      <TableRow key={emp.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                        <TableCell className="font-mono border-b border-border/30">{emp.employee_number}</TableCell>
                        <TableCell className="font-medium border-b border-border/30">{isRTL ? emp.name : (emp.name_en || emp.name)}</TableCell>
                        <TableCell className="border-b border-border/30">{emp.hr_departments ? (isRTL ? emp.hr_departments.name : (emp.hr_departments.name_en || emp.hr_departments.name)) : "—"}</TableCell>
                        <TableCell className="border-b border-border/30">{isRTL ? emp.job_title : (emp.job_title_en || emp.job_title) || "—"}</TableCell>
                        <TableCell className="border-b border-border/30">
                          {emp.contract_end_date ? (
                            <span className={isExpired ? "text-destructive font-medium" : isExpiringSoon ? "text-orange-500 font-medium" : ""}>
                              {emp.contract_end_date}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="border-b border-border/30 tabular-nums">{totalSalary(emp).toLocaleString()}</TableCell>
                        <TableCell className="border-b border-border/30">
                          <Badge variant={emp.status === "active" ? "default" : "destructive"}>
                            {emp.status === "active" ? (isRTL ? "نشط" : "Active") : (isRTL ? "منتهي" : "Terminated")}
                          </Badge>
                        </TableCell>
                        <TableCell className="border-b border-border/30">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(emp.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Employees;
