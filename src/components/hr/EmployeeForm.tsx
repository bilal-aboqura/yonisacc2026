import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AccountCombobox from "@/components/client/AccountCombobox";

interface AccountOption {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
}

interface EmployeeFormProps {
  editId: string | null;
  editData: any;
  companyId: string | null;
  departments: any[];
  workShifts?: any[];
  costCenters?: any[];
  accounts?: AccountOption[];
  onClose: () => void;
}

const NATIONALITIES = [
  { code: "SA", ar: "سعودي", en: "Saudi" },
  { code: "AE", ar: "إماراتي", en: "Emirati" },
  { code: "BH", ar: "بحريني", en: "Bahraini" },
  { code: "KW", ar: "كويتي", en: "Kuwaiti" },
  { code: "OM", ar: "عماني", en: "Omani" },
  { code: "QA", ar: "قطري", en: "Qatari" },
  { code: "YE", ar: "يمني", en: "Yemeni" },
  { code: "IQ", ar: "عراقي", en: "Iraqi" },
  { code: "JO", ar: "أردني", en: "Jordanian" },
  { code: "SY", ar: "سوري", en: "Syrian" },
  { code: "LB", ar: "لبناني", en: "Lebanese" },
  { code: "PS", ar: "فلسطيني", en: "Palestinian" },
  { code: "EG", ar: "مصري", en: "Egyptian" },
  { code: "SD", ar: "سوداني", en: "Sudanese" },
  { code: "LY", ar: "ليبي", en: "Libyan" },
  { code: "TN", ar: "تونسي", en: "Tunisian" },
  { code: "DZ", ar: "جزائري", en: "Algerian" },
  { code: "MA", ar: "مغربي", en: "Moroccan" },
  { code: "MR", ar: "موريتاني", en: "Mauritanian" },
  { code: "PK", ar: "باكستاني", en: "Pakistani" },
  { code: "IN", ar: "هندي", en: "Indian" },
  { code: "BD", ar: "بنغلاديشي", en: "Bangladeshi" },
  { code: "LK", ar: "سريلانكي", en: "Sri Lankan" },
  { code: "NP", ar: "نيبالي", en: "Nepali" },
  { code: "PH", ar: "فلبيني", en: "Filipino" },
  { code: "ID", ar: "إندونيسي", en: "Indonesian" },
  { code: "ET", ar: "إثيوبي", en: "Ethiopian" },
  { code: "ER", ar: "إريتري", en: "Eritrean" },
  { code: "NG", ar: "نيجيري", en: "Nigerian" },
  { code: "KE", ar: "كيني", en: "Kenyan" },
  { code: "GH", ar: "غاني", en: "Ghanaian" },
  { code: "TR", ar: "تركي", en: "Turkish" },
  { code: "AF", ar: "أفغاني", en: "Afghan" },
  { code: "MM", ar: "ميانماري", en: "Myanmar" },
  { code: "US", ar: "أمريكي", en: "American" },
  { code: "GB", ar: "بريطاني", en: "British" },
  { code: "FR", ar: "فرنسي", en: "French" },
  { code: "DE", ar: "ألماني", en: "German" },
  { code: "OTHER", ar: "أخرى", en: "Other" },
];

const defaultForm = {
  employee_number: "", name: "", name_en: "", national_id: "", phone: "", email: "",
  hire_date: new Date().toISOString().split("T")[0],
  start_date: "",
  contract_end_date: "",
  contract_duration_months: 0,
  job_title: "", job_title_en: "",
  basic_salary: 0, housing_allowance: 0, transport_allowance: 0, other_allowance: 0,
  bank_name: "", bank_iban: "", department_id: "", status: "active",
  account_id: "",
  gender: "", nationality: "",
  health_card_number: "", health_card_expiry: "",
  passport_number: "", passport_expiry: "",
  border_number: "", visa_expiry: "",
  has_iqama: false, iqama_number: "", iqama_expiry: "",
  gosi_registration_date: "", gosi_amount: 0,
  work_shift_id: "",
  cost_center_id: "",
};

const EmployeeForm = ({ editId, editData, companyId, departments, workShifts = [], costCenters = [], accounts = [], onClose }: EmployeeFormProps) => {
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
        gender: editData.gender || "",
        nationality: editData.nationality || "",
        health_card_number: editData.health_card_number || "",
        health_card_expiry: editData.health_card_expiry || "",
        passport_number: editData.passport_number || "",
        passport_expiry: editData.passport_expiry || "",
        border_number: editData.border_number || "",
        visa_expiry: editData.visa_expiry || "",
        has_iqama: editData.has_iqama || false,
        iqama_number: editData.iqama_number || "",
        iqama_expiry: editData.iqama_expiry || "",
        gosi_registration_date: editData.gosi_registration_date || "",
        gosi_amount: editData.gosi_amount || 0,
        work_shift_id: editData.work_shift_id || "",
        cost_center_id: editData.cost_center_id || "",
        account_id: editData.account_id || "",
      };
    }
    return { ...defaultForm };
  });

  const isSaudi = form.nationality === "SA";

  // Auto-calculate GOSI for Saudi employees: (basic + housing) * 9.75%
  const gosiAmount = useMemo(() => {
    if (isSaudi) {
      return Math.round(((form.basic_salary || 0) + (form.housing_allowance || 0)) * 0.0975 * 100) / 100;
    }
    return 0;
  }, [isSaudi, form.basic_salary, form.housing_allowance]);

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
        health_card_expiry: form.health_card_expiry || null,
        passport_expiry: form.passport_expiry || null,
        visa_expiry: form.visa_expiry || null,
        iqama_number: form.has_iqama ? form.iqama_number : null,
        iqama_expiry: form.has_iqama ? (form.iqama_expiry || null) : null,
        national_id: form.has_iqama ? form.national_id : (form.national_id || null),
        gosi_registration_date: form.gosi_registration_date || null,
        gosi_amount: isSaudi ? gosiAmount : 0,
        gender: form.gender || null,
        nationality: form.nationality || null,
        work_shift_id: form.work_shift_id || null,
        cost_center_id: form.cost_center_id || null,
        account_id: form.account_id || null,
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

  const canSave = form.name && form.employee_number && (!form.has_iqama || (form.national_id && form.iqama_expiry));

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
              <div className="space-y-2">
                <Label>{isRTL ? "الجنس" : "Gender"}</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{isRTL ? "ذكر" : "Male"}</SelectItem>
                    <SelectItem value="female">{isRTL ? "أنثى" : "Female"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الجنسية" : "Nationality"}</Label>
                <Select value={form.nationality} onValueChange={(v) => setForm({ ...form, nationality: v })}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {NATIONALITIES.map((n) => (
                      <SelectItem key={n.code} value={n.code}>{isRTL ? n.ar : n.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <div className="space-y-2">
                <Label>{isRTL ? "فترة الدوام" : "Work Shift"}</Label>
                <Select value={form.work_shift_id} onValueChange={(v) => setForm({ ...form, work_shift_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRTL ? "-- بدون --" : "-- None --"}</SelectItem>
                    {workShifts.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {isRTL ? s.name : (s.name_en || s.name)} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "مركز التكلفة" : "Cost Center"}</Label>
                <Select value={form.cost_center_id} onValueChange={(v) => setForm({ ...form, cost_center_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRTL ? "-- بدون --" : "-- None --"}</SelectItem>
                    {costCenters.map((cc: any) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} - {isRTL ? cc.name : (cc.name_en || cc.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الحساب بدليل الحسابات" : "Chart of Accounts"}</Label>
                <AccountCombobox
                  accounts={accounts}
                  value={form.account_id || null}
                  onChange={(v) => setForm({ ...form, account_id: v || "" })}
                  isRTL={isRTL}
                  placeholder={isRTL ? "ربط الموظف بحساب" : "Link to account"}
                />
                <p className="text-xs text-muted-foreground">
                  {isRTL ? "يُستخدم للسلف والقروض والجزاءات" : "Used for advances, loans & penalties"}
                </p>
              </div>
            </div>
          </div>

          {/* Documents & IDs */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">{isRTL ? "الوثائق والهويات" : "Documents & IDs"}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "رقم الكرت الصحي" : "Health Card #"}</Label><Input value={form.health_card_number} onChange={(e) => setForm({ ...form, health_card_number: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "تاريخ انتهاء الكرت الصحي" : "Health Card Expiry"}</Label><Input type="date" value={form.health_card_expiry} onChange={(e) => setForm({ ...form, health_card_expiry: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "رقم جواز السفر" : "Passport #"}</Label><Input value={form.passport_number} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "تاريخ انتهاء جواز السفر" : "Passport Expiry"}</Label><Input type="date" value={form.passport_expiry} onChange={(e) => setForm({ ...form, passport_expiry: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "رقم الحدود" : "Border #"}</Label><Input value={form.border_number} onChange={(e) => setForm({ ...form, border_number: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "تاريخ انتهاء تأشيرة الدخول" : "Visa Expiry"}</Label><Input type="date" value={form.visa_expiry} onChange={(e) => setForm({ ...form, visa_expiry: e.target.value })} /></div>

              <div className="md:col-span-2 flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <Checkbox
                  id="has_iqama"
                  checked={form.has_iqama}
                  onCheckedChange={(checked) => setForm({ ...form, has_iqama: !!checked })}
                />
                <Label htmlFor="has_iqama" className="cursor-pointer font-medium">
                  {isRTL ? "تم إصدار الإقامة" : "Iqama Issued"}
                </Label>
              </div>

              {form.has_iqama && (
                <>
                  <div className="space-y-2">
                    <Label>{isRTL ? "رقم الهوية / الإقامة" : "ID / Iqama #"} <span className="text-destructive">*</span></Label>
                    <Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "تاريخ انتهاء الهوية" : "ID Expiry"} <span className="text-destructive">*</span></Label>
                    <Input type="date" value={form.iqama_expiry} onChange={(e) => setForm({ ...form, iqama_expiry: e.target.value })} />
                  </div>
                </>
              )}

              {!form.has_iqama && (
                <div className="space-y-2"><Label>{isRTL ? "رقم الهوية" : "National ID"}</Label><Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} /></div>
              )}
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

          {/* GOSI / Social Insurance */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">{isRTL ? "التأمينات الاجتماعية" : "Social Insurance (GOSI)"}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "تاريخ التسجيل بالتأمينات" : "GOSI Registration Date"}</Label>
                <Input type="date" value={form.gosi_registration_date} onChange={(e) => setForm({ ...form, gosi_registration_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "مبلغ التأمينات (تلقائي)" : "GOSI Amount (auto)"}</Label>
                <Input type="number" value={gosiAmount} readOnly className="bg-muted" />
                {isSaudi && (
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? `(${form.basic_salary} + ${form.housing_allowance}) × 9.75% = ${gosiAmount}`
                      : `(${form.basic_salary} + ${form.housing_allowance}) × 9.75% = ${gosiAmount}`}
                  </p>
                )}
                {!isSaudi && (
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "التأمينات الاجتماعية تُحسب فقط للسعوديين" : "GOSI applies to Saudi nationals only"}
                  </p>
                )}
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
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canSave}>
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
