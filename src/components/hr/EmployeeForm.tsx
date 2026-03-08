import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EmployeeFormProps {
  editId: string | null;
  editData: any;
  companyId: string | null;
  departments: any[];
  onClose: () => void;
}

const defaultForm = {
  employee_number: "", name: "", name_en: "", national_id: "", phone: "", email: "",
  hire_date: new Date().toISOString().split("T")[0],
  start_date: "",
  contract_end_date: "",
  contract_duration_months: 0,
  job_title: "", job_title_en: "",
  basic_salary: 0, housing_allowance: 0, transport_allowance: 0, other_allowance: 0,
  bank_name: "", bank_iban: "", department_id: "", status: "active",
};

const EmployeeForm = ({ editId, editData, companyId, departments, onClose }: EmployeeFormProps) => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(() => {
    if (editData) {
      return {
        employee_number: editData.employee_number || "",
        name: editData.name || "",
        name_en: editData.name_en || "",
        national_id: editData.national_id || "",
        phone: editData.phone || "",
        email: editData.email || "",
        hire_date: editData.hire_date || "",
        start_date: editData.start_date || "",
        contract_end_date: editData.contract_end_date || "",
        contract_duration_months: editData.contract_duration_months || 0,
        job_title: editData.job_title || "",
        job_title_en: editData.job_title_en || "",
        basic_salary: editData.basic_salary || 0,
        housing_allowance: editData.housing_allowance || 0,
        transport_allowance: editData.transport_allowance || 0,
        other_allowance: editData.other_allowance || 0,
        bank_name: editData.bank_name || "",
        bank_iban: editData.bank_iban || "",
        department_id: editData.department_id || "",
        status: editData.status || "active",
      };
    }
    return { ...defaultForm };
  });

  // Auto-calculate contract_end_date when start_date and duration change
  const handleStartDateChange = (val: string) => {
    const updated = { ...form, start_date: val };
    if (val && form.contract_duration_months > 0) {
      const d = new Date(val);
      d.setMonth(d.getMonth() + form.contract_duration_months);
      updated.contract_end_date = d.toISOString().split("T")[0];
    }
    setForm(updated);
  };

  const handleDurationChange = (val: number) => {
    const updated = { ...form, contract_duration_months: val };
    if (form.start_date && val > 0) {
      const d = new Date(form.start_date);
      d.setMonth(d.getMonth() + val);
      updated.contract_end_date = d.toISOString().split("T")[0];
    }
    setForm(updated);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        company_id: companyId,
        department_id: form.department_id || null,
        start_date: form.start_date || null,
        contract_end_date: form.contract_end_date || null,
        contract_duration_months: form.contract_duration_months || null,
      };
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
      onClose();
      toast.success(isRTL ? "تم الحفظ" : "Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {editId ? (isRTL ? "تعديل موظف" : "Edit Employee") : (isRTL ? "إضافة موظف" : "Add Employee")}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">{isRTL ? "البيانات الأساسية" : "Basic Info"}</h3>
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
              <div className="space-y-2"><Label>{isRTL ? "المسمى الوظيفي" : "Job Title"}</Label><Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "المسمى بالإنجليزي" : "Job Title (EN)"}</Label><Input value={form.job_title_en} onChange={(e) => setForm({ ...form, job_title_en: e.target.value })} /></div>
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
          </div>

          {/* Contract Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">{isRTL ? "بيانات العقد" : "Contract Info"}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "تاريخ التعيين" : "Hire Date"}</Label>
                <Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "تاريخ المباشرة" : "Start Date"}</Label>
                <Input type="date" value={form.start_date} onChange={(e) => handleStartDateChange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "مدة العقد (بالأشهر)" : "Contract Duration (months)"}</Label>
                <Input type="number" min={0} value={form.contract_duration_months} onChange={(e) => handleDurationChange(+e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "تاريخ انتهاء العقد" : "Contract End Date"}</Label>
                <Input type="date" value={form.contract_end_date} onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Salary */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">{isRTL ? "الراتب والبدلات" : "Salary & Allowances"}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "الراتب الأساسي" : "Basic Salary"}</Label><Input type="number" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: +e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "بدل سكن" : "Housing"}</Label><Input type="number" value={form.housing_allowance} onChange={(e) => setForm({ ...form, housing_allowance: +e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "بدل نقل" : "Transport"}</Label><Input type="number" value={form.transport_allowance} onChange={(e) => setForm({ ...form, transport_allowance: +e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "بدلات أخرى" : "Other"}</Label><Input type="number" value={form.other_allowance} onChange={(e) => setForm({ ...form, other_allowance: +e.target.value })} /></div>
            </div>
          </div>

          {/* Bank */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">{isRTL ? "البيانات البنكية" : "Bank Info"}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "البنك" : "Bank"}</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "آيبان" : "IBAN"}</Label><Input value={form.bank_iban} onChange={(e) => setForm({ ...form, bank_iban: e.target.value })} /></div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.employee_number}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeForm;
