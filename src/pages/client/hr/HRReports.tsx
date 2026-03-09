import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { BarChart3, Users, Calendar as CalendarIcon, DollarSign, Loader2, Banknote, FileDown, Printer, Search, CalendarDays, CheckCircle, XCircle, Clock, Palmtree, AlertTriangle } from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

/* ─── Shared Filter Bar ─── */
interface FilterBarProps {
  isRTL: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onDateFromChange: (d: Date | undefined) => void;
  onDateToChange: (d: Date | undefined) => void;
  onExport?: () => void;
  onPrint?: () => void;
  exportDisabled?: boolean;
  extraFilters?: React.ReactNode;
}

const FilterBar = ({ isRTL, searchTerm, onSearchChange, dateFrom, dateTo, onDateFromChange, onDateToChange, onExport, onPrint, exportDisabled, extraFilters }: FilterBarProps) => (
  <div className="flex flex-wrap items-end gap-3 mb-4">
    <div className="space-y-1 flex-1 min-w-[200px] max-w-sm">
      <Label className="text-xs">{isRTL ? "بحث (اسم / رقم موظف / هوية)" : "Search (Name / Emp# / ID#)"}</Label>
      <div className="relative">
        <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder={isRTL ? "ابحث..." : "Search..."} value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="ps-8 h-9" />
      </div>
    </div>
    <div className="space-y-1">
      <Label className="text-xs">{isRTL ? "من تاريخ" : "Date From"}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal h-9", !dateFrom && "text-muted-foreground")}>
            <CalendarDays className="h-3.5 w-3.5 me-1.5" />
            {dateFrom ? format(dateFrom, "yyyy-MM-dd") : <span className="text-xs">{isRTL ? "اختر" : "Pick"}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateFrom} onSelect={onDateFromChange} className="p-3 pointer-events-auto" /></PopoverContent>
      </Popover>
    </div>
    <div className="space-y-1">
      <Label className="text-xs">{isRTL ? "إلى تاريخ" : "Date To"}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal h-9", !dateTo && "text-muted-foreground")}>
            <CalendarDays className="h-3.5 w-3.5 me-1.5" />
            {dateTo ? format(dateTo, "yyyy-MM-dd") : <span className="text-xs">{isRTL ? "اختر" : "Pick"}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateTo} onSelect={onDateToChange} className="p-3 pointer-events-auto" /></PopoverContent>
      </Popover>
    </div>
    {extraFilters}
    <div className="flex gap-1.5 ms-auto">
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport} disabled={exportDisabled} className="h-9">
          <FileDown className="h-4 w-4 me-1" />{isRTL ? "تصدير" : "Export"}
        </Button>
      )}
      {onPrint && (
        <Button variant="outline" size="sm" onClick={onPrint} disabled={exportDisabled} className="h-9">
          <Printer className="h-4 w-4 me-1" />{isRTL ? "طباعة" : "Print"}
        </Button>
      )}
    </div>
  </div>
);

/* ─── Summary Card ─── */
const SummaryCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) => (
  <Card className="overflow-hidden">
    <CardContent className="p-3 flex items-center gap-3">
      <div className={cn("rounded-xl p-2.5 shrink-0", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
      </div>
    </CardContent>
  </Card>
);

/* ─── Helper: filter employee match ─── */
const matchEmployee = (emp: any, term: string, isRTL: boolean) => {
  if (!term) return true;
  const t = term.toLowerCase();
  const name = (isRTL ? emp.name : (emp.name_en || emp.name)) || "";
  return name.toLowerCase().includes(t) || (emp.employee_number || "").toLowerCase().includes(t) || (emp.national_id || "").toLowerCase().includes(t);
};

/* ─── Main Component ─── */
const HRReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const today = new Date();

  // Shared filter states per tab
  const [attSearch, setAttSearch] = useState("");
  const [attDateFrom, setAttDateFrom] = useState<Date | undefined>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [attDateTo, setAttDateTo] = useState<Date | undefined>(today);

  const [leaveSearch, setLeaveSearch] = useState("");
  const [leaveDateFrom, setLeaveDateFrom] = useState<Date | undefined>();
  const [leaveDateTo, setLeaveDateTo] = useState<Date | undefined>();

  const [balSearch, setBalSearch] = useState("");
  const [balanceYear, setBalanceYear] = useState(today.getFullYear());
  const [balanceEmployee, setBalanceEmployee] = useState("all");

  const [paySearch, setPaySearch] = useState("");
  const [payDateFrom, setPayDateFrom] = useState<Date | undefined>();
  const [payDateTo, setPayDateTo] = useState<Date | undefined>();

  const [loanSearch, setLoanSearch] = useState("");
  const [loanDateFrom, setLoanDateFrom] = useState<Date | undefined>();
  const [loanDateTo, setLoanDateTo] = useState<Date | undefined>();

  const [dedSearch, setDedSearch] = useState("");
  const [dedDateFrom, setDedDateFrom] = useState<Date | undefined>();
  const [dedDateTo, setDedDateTo] = useState<Date | undefined>();

  const attStart = attDateFrom ? format(attDateFrom, "yyyy-MM-dd") : `${today.getFullYear()}-01-01`;
  const attEnd = attDateTo ? format(attDateTo, "yyyy-MM-dd") : format(today, "yyyy-MM-dd");

  /* ─── Queries ─── */
  const { data: employees = [] } = useQuery({
    queryKey: ["hr-report-employees", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_employees").select("*, hr_departments(name, name_en)")
        .eq("company_id", companyId).order("employee_number");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: attendance = [], isLoading: loadingAtt } = useQuery({
    queryKey: ["hr-report-attendance", companyId, attStart, attEnd],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_attendance").select("employee_id, status, attendance_date")
        .eq("company_id", companyId)
        .gte("attendance_date", attStart).lte("attendance_date", attEnd);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: leaves = [], isLoading: loadingLeaves } = useQuery({
    queryKey: ["hr-report-leaves", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_leaves").select("*, hr_employees(name, name_en, employee_number, national_id)")
        .eq("company_id", companyId).eq("status", "approved")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: payrollRuns = [], isLoading: loadingPayroll } = useQuery({
    queryKey: ["hr-report-payroll", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_payroll_runs").select("*")
        .eq("company_id", companyId).eq("status", "posted")
        .order("period_year", { ascending: false }).order("period_month", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: loans = [], isLoading: loadingLoans } = useQuery({
    queryKey: ["hr-report-loans", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_loans").select("*, hr_employees(name, name_en, employee_number, national_id)")
        .eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: leaveBalances = [], isLoading: loadingBalances } = useQuery({
    queryKey: ["hr-leave-balances-report", companyId, balanceYear, balanceEmployee],
    queryFn: async () => {
      let query = (supabase as any).from("hr_leave_balances")
        .select("*, hr_employees(name, name_en, employee_number, national_id)")
        .eq("company_id", companyId).eq("year", balanceYear);
      if (balanceEmployee !== "all") query = query.eq("employee_id", balanceEmployee);
      const { data, error } = await query.order("leave_type");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: deductions = [], isLoading: loadingDeductions } = useQuery({
    queryKey: ["hr-report-deductions", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_deductions")
        .select("*, hr_employees(name, name_en, employee_number, national_id), hr_penalty_rules(violation_name, violation_name_en)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["hr-leave-policies-report", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_leave_policies").select("*").eq("company_id", companyId);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const policyLabel = (t: string) => {
    const pol = policies.find((p: any) => p.leave_type === t);
    if (pol) return isRTL ? pol.name : (pol.name_en || pol.name);
    return t;
  };

  const empName = (emp: any) => emp ? (isRTL ? emp.name : (emp.name_en || emp.name)) : "—";

  /* ─── ATTENDANCE ─── */
  const attSummary = useMemo(() => {
    return employees
      .filter((emp: any) => matchEmployee(emp, attSearch, isRTL))
      .map((emp: any) => {
        const empAtt = attendance.filter((a: any) => a.employee_id === emp.id);
        return {
          id: emp.id,
          name: empName(emp),
          number: emp.employee_number,
          dept: emp.hr_departments ? (isRTL ? emp.hr_departments.name : (emp.hr_departments.name_en || emp.hr_departments.name)) : "—",
          present: empAtt.filter((a: any) => a.status === "present").length,
          absent: empAtt.filter((a: any) => a.status === "absent").length,
          late: empAtt.filter((a: any) => a.status === "late").length,
          leave: empAtt.filter((a: any) => a.status === "leave").length,
          total: empAtt.length,
        };
      }).filter(e => e.total > 0);
  }, [employees, attendance, attSearch, isRTL]);

  const attTotals = useMemo(() => ({
    present: attSummary.reduce((s, e) => s + e.present, 0),
    absent: attSummary.reduce((s, e) => s + e.absent, 0),
    late: attSummary.reduce((s, e) => s + e.late, 0),
    leave: attSummary.reduce((s, e) => s + e.leave, 0),
  }), [attSummary]);

  /* ─── LEAVES ─── */
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l: any) => {
      if (leaveSearch) {
        const emp = l.hr_employees;
        if (emp && !matchEmployee(emp, leaveSearch, isRTL)) return false;
        if (!emp) return false;
      }
      if (leaveDateFrom && l.start_date < format(leaveDateFrom, "yyyy-MM-dd")) return false;
      if (leaveDateTo && l.start_date > format(leaveDateTo, "yyyy-MM-dd")) return false;
      return true;
    });
  }, [leaves, leaveSearch, leaveDateFrom, leaveDateTo, isRTL]);

  const leaveSummary = useMemo(() => {
    const map: Record<string, { name: string; number: string; annual: number; sick: number; unpaid: number; emergency: number; total: number }> = {};
    filteredLeaves.forEach((l: any) => {
      const empId = l.employee_id;
      if (!map[empId]) {
        map[empId] = { name: empName(l.hr_employees), number: l.hr_employees?.employee_number || "", annual: 0, sick: 0, unpaid: 0, emergency: 0, total: 0 };
      }
      const days = l.days_count || 0;
      map[empId].total += days;
      if (l.leave_type === "annual") map[empId].annual += days;
      else if (l.leave_type === "sick") map[empId].sick += days;
      else if (l.leave_type === "unpaid") map[empId].unpaid += days;
      else if (l.leave_type === "emergency") map[empId].emergency += days;
    });
    return map;
  }, [filteredLeaves, isRTL]);

  const leaveTotals = useMemo(() => {
    const vals = Object.values(leaveSummary);
    return {
      total: vals.reduce((s, v) => s + v.total, 0),
      annual: vals.reduce((s, v) => s + v.annual, 0),
      sick: vals.reduce((s, v) => s + v.sick, 0),
      unpaid: vals.reduce((s, v) => s + v.unpaid, 0),
      emergency: vals.reduce((s, v) => s + v.emergency, 0),
    };
  }, [leaveSummary]);

  /* ─── BALANCES ─── */
  const filteredBalances = useMemo(() => {
    if (!balSearch) return leaveBalances;
    return leaveBalances.filter((b: any) => b.hr_employees && matchEmployee(b.hr_employees, balSearch, isRTL));
  }, [leaveBalances, balSearch, isRTL]);

  const balTotals = useMemo(() => ({
    entitlement: filteredBalances.reduce((s: number, b: any) => s + (b.entitlement || 0), 0),
    used: filteredBalances.reduce((s: number, b: any) => s + (b.used || 0), 0),
    remaining: filteredBalances.reduce((s: number, b: any) => s + (b.entitlement || 0) + (b.carried_over || 0) - (b.used || 0), 0),
  }), [filteredBalances]);

  /* ─── PAYROLL ─── */
  const filteredPayroll = useMemo(() => {
    return payrollRuns.filter((r: any) => {
      if (payDateFrom) {
        const pDate = new Date(r.period_year, r.period_month - 1, 1);
        if (pDate < payDateFrom) return false;
      }
      if (payDateTo) {
        const pDate = new Date(r.period_year, r.period_month - 1, 1);
        if (pDate > payDateTo) return false;
      }
      return true;
    });
  }, [payrollRuns, payDateFrom, payDateTo]);

  const payTotals = useMemo(() => ({
    basic: filteredPayroll.reduce((s: number, r: any) => s + (r.total_basic || 0), 0),
    allowances: filteredPayroll.reduce((s: number, r: any) => s + (r.total_allowances || 0), 0),
    deductions: filteredPayroll.reduce((s: number, r: any) => s + (r.total_deductions || 0), 0),
    net: filteredPayroll.reduce((s: number, r: any) => s + (r.total_net || 0), 0),
  }), [filteredPayroll]);

  /* ─── LOANS ─── */
  const filteredLoans = useMemo(() => {
    return loans.filter((l: any) => {
      if (loanSearch) {
        const emp = l.hr_employees;
        if (emp && !matchEmployee(emp, loanSearch, isRTL)) return false;
        if (!emp) return false;
      }
      if (loanDateFrom && l.created_at < format(loanDateFrom, "yyyy-MM-dd")) return false;
      if (loanDateTo && l.created_at > format(loanDateTo, "yyyy-MM-dd") + "T23:59:59") return false;
      return true;
    });
  }, [loans, loanSearch, loanDateFrom, loanDateTo, isRTL]);

  const loanTotals = useMemo(() => ({
    total: filteredLoans.reduce((s: number, l: any) => s + (l.amount || 0), 0),
    paid: filteredLoans.reduce((s: number, l: any) => s + (l.total_paid || 0), 0),
    remaining: filteredLoans.reduce((s: number, l: any) => s + (l.remaining || 0), 0),
  }), [filteredLoans]);

  /* ─── DEDUCTIONS ─── */
  const filteredDeductions = useMemo(() => {
    return deductions.filter((d: any) => {
      if (dedSearch) {
        const emp = d.hr_employees;
        if (emp && !matchEmployee(emp, dedSearch, isRTL)) return false;
        if (!emp) return false;
      }
      if (dedDateFrom && d.created_at < format(dedDateFrom, "yyyy-MM-dd")) return false;
      if (dedDateTo && d.created_at > format(dedDateTo, "yyyy-MM-dd") + "T23:59:59") return false;
      return true;
    });
  }, [deductions, dedSearch, dedDateFrom, dedDateTo, isRTL]);

  const dedTotals = useMemo(() => ({
    totalAmount: filteredDeductions.reduce((s: number, d: any) => s + (d.amount || 0), 0),
    applied: filteredDeductions.filter((d: any) => d.status === "applied").length,
    pending: filteredDeductions.filter((d: any) => d.status === "pending").length,
    count: filteredDeductions.length,
  }), [filteredDeductions]);

  /* ─── Export Handlers ─── */
  const handleExportAttendance = () => {
    exportToExcel({
      filename: `attendance-report`,
      title: isRTL ? "تقرير الحضور" : "Attendance Report",
      columns: [
        { header: isRTL ? "رقم" : "#", key: "number", format: "text" },
        { header: isRTL ? "الموظف" : "Employee", key: "name", format: "text" },
        { header: isRTL ? "القسم" : "Dept", key: "dept", format: "text" },
        { header: isRTL ? "حضور" : "Present", key: "present", format: "number" },
        { header: isRTL ? "غياب" : "Absent", key: "absent", format: "number" },
        { header: isRTL ? "تأخر" : "Late", key: "late", format: "number" },
        { header: isRTL ? "إجازة" : "Leave", key: "leave", format: "number" },
      ],
      rows: attSummary,
      totals: { number: "", name: isRTL ? "الإجمالي" : "Total", dept: "", ...attTotals },
    });
  };

  const handleExportLeaves = () => {
    exportToExcel({
      filename: `leaves-report`,
      title: isRTL ? "تقرير الإجازات" : "Leaves Report",
      columns: [
        { header: isRTL ? "رقم" : "#", key: "number", format: "text" },
        { header: isRTL ? "الموظف" : "Employee", key: "name", format: "text" },
        { header: isRTL ? "سنوية" : "Annual", key: "annual", format: "number" },
        { header: isRTL ? "مرضية" : "Sick", key: "sick", format: "number" },
        { header: isRTL ? "بدون راتب" : "Unpaid", key: "unpaid", format: "number" },
        { header: isRTL ? "اضطرارية" : "Emergency", key: "emergency", format: "number" },
        { header: isRTL ? "الإجمالي" : "Total", key: "total", format: "number" },
      ],
      rows: Object.values(leaveSummary),
    });
  };

  const handleExportBalances = () => {
    exportToExcel({
      filename: `leave-balances-${balanceYear}`,
      title: isRTL ? "تقرير أرصدة الإجازات" : "Leave Balances Report",
      columns: [
        { header: isRTL ? "رقم الموظف" : "Emp #", key: "number", format: "text" },
        { header: isRTL ? "الموظف" : "Employee", key: "name", format: "text" },
        { header: isRTL ? "نوع الإجازة" : "Leave Type", key: "type", format: "text" },
        { header: isRTL ? "الاستحقاق" : "Entitlement", key: "entitlement", format: "number" },
        { header: isRTL ? "المستخدم" : "Used", key: "used", format: "number" },
        { header: isRTL ? "المرحّل" : "Carried Over", key: "carried", format: "number" },
        { header: isRTL ? "المتبقي" : "Remaining", key: "remaining", format: "number" },
      ],
      rows: filteredBalances.map((b: any) => ({
        number: b.hr_employees?.employee_number || "",
        name: empName(b.hr_employees),
        type: policyLabel(b.leave_type),
        entitlement: b.entitlement || 0,
        used: b.used || 0,
        carried: b.carried_over || 0,
        remaining: (b.entitlement || 0) + (b.carried_over || 0) - (b.used || 0),
      })),
    });
  };

  const handleExportPayroll = () => {
    exportToExcel({
      filename: `payroll-report`,
      title: isRTL ? "تقرير الرواتب" : "Payroll Report",
      columns: [
        { header: isRTL ? "الفترة" : "Period", key: "period", format: "text" },
        { header: isRTL ? "الأساسي" : "Basic", key: "basic", format: "number" },
        { header: isRTL ? "البدلات" : "Allowances", key: "allowances", format: "number" },
        { header: isRTL ? "الاستقطاعات" : "Deductions", key: "deductions", format: "number" },
        { header: isRTL ? "الصافي" : "Net", key: "net", format: "number" },
      ],
      rows: filteredPayroll.map((r: any) => ({
        period: `${r.period_month}/${r.period_year}`,
        basic: r.total_basic || 0,
        allowances: r.total_allowances || 0,
        deductions: r.total_deductions || 0,
        net: r.total_net || 0,
      })),
      totals: { period: isRTL ? "الإجمالي" : "Total", basic: payTotals.basic, allowances: payTotals.allowances, deductions: payTotals.deductions, net: payTotals.net },
    });
  };

  const handleExportLoans = () => {
    exportToExcel({
      filename: `loans-report`,
      title: isRTL ? "تقرير السلف" : "Advances Report",
      columns: [
        { header: isRTL ? "الموظف" : "Employee", key: "name", format: "text" },
        { header: isRTL ? "النوع" : "Type", key: "type", format: "text" },
        { header: isRTL ? "المبلغ" : "Amount", key: "amount", format: "number" },
        { header: isRTL ? "المسدد" : "Paid", key: "paid", format: "number" },
        { header: isRTL ? "المتبقي" : "Remaining", key: "remaining", format: "number" },
        { header: isRTL ? "الحالة" : "Status", key: "status", format: "text" },
      ],
      rows: filteredLoans.map((l: any) => ({
        name: empName(l.hr_employees),
        type: l.loan_type === "advance" ? (isRTL ? "سلفة" : "Advance") : (isRTL ? "قرض" : "Loan"),
        amount: l.amount || 0,
        paid: l.total_paid || 0,
        remaining: l.remaining || 0,
        status: l.status === "active" ? (isRTL ? "نشطة" : "Active") : (isRTL ? "مسددة" : "Paid"),
      })),
    });
  };

  const handleExportDeductions = () => {
    exportToExcel({
      filename: `deductions-report`,
      title: isRTL ? "تقرير الخصومات والجزاءات" : "Deductions Report",
      columns: [
        { header: isRTL ? "الموظف" : "Employee", key: "name", format: "text" },
        { header: isRTL ? "نوع المخالفة" : "Violation", key: "violation", format: "text" },
        { header: isRTL ? "المبلغ" : "Amount", key: "amount", format: "number" },
        { header: isRTL ? "الشهر المستهدف" : "Target Month", key: "month", format: "text" },
        { header: isRTL ? "الحالة" : "Status", key: "status", format: "text" },
        { header: isRTL ? "ملاحظات" : "Notes", key: "notes", format: "text" },
      ],
      rows: filteredDeductions.map((d: any) => ({
        name: empName(d.hr_employees),
        violation: d.hr_penalty_rules ? (isRTL ? d.hr_penalty_rules.violation_name : (d.hr_penalty_rules.violation_name_en || d.hr_penalty_rules.violation_name)) : (d.reason || "—"),
        amount: d.amount || 0,
        month: d.target_month || "—",
        status: d.status === "applied" ? (isRTL ? "مطبق" : "Applied") : (isRTL ? "معلق" : "Pending"),
        notes: d.notes || "",
      })),
      totals: { name: isRTL ? "الإجمالي" : "Total", violation: "", amount: dedTotals.totalAmount, month: "", status: "", notes: "" },
    });
  };

  const handlePrint = () => window.print();

  const rowClass = (idx: number) => `transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`;
  const cellBorder = "border-b border-border/30";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isRTL ? "تقارير الموارد البشرية" : "HR Reports"}</h1>

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="attendance" className="flex items-center gap-1 text-xs"><Users className="h-3.5 w-3.5" />{isRTL ? "الحضور" : "Attendance"}</TabsTrigger>
          <TabsTrigger value="leaves" className="flex items-center gap-1 text-xs"><CalendarIcon className="h-3.5 w-3.5" />{isRTL ? "الإجازات" : "Leaves"}</TabsTrigger>
          <TabsTrigger value="balances" className="flex items-center gap-1 text-xs"><Palmtree className="h-3.5 w-3.5" />{isRTL ? "الأرصدة" : "Balances"}</TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-1 text-xs"><DollarSign className="h-3.5 w-3.5" />{isRTL ? "الرواتب" : "Payroll"}</TabsTrigger>
          <TabsTrigger value="loans" className="flex items-center gap-1 text-xs"><Banknote className="h-3.5 w-3.5" />{isRTL ? "السلف" : "Advances"}</TabsTrigger>
          <TabsTrigger value="deductions" className="flex items-center gap-1 text-xs"><AlertTriangle className="h-3.5 w-3.5" />{isRTL ? "الخصومات" : "Deductions"}</TabsTrigger>
        </TabsList>

        {/* ═══ ATTENDANCE ═══ */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? "تقرير الحضور" : "Attendance Report"}</CardTitle></CardHeader>
            <CardContent>
              <FilterBar isRTL={isRTL} searchTerm={attSearch} onSearchChange={setAttSearch} dateFrom={attDateFrom} dateTo={attDateTo} onDateFromChange={setAttDateFrom} onDateToChange={setAttDateTo} onExport={handleExportAttendance} onPrint={handlePrint} exportDisabled={attSummary.length === 0} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <SummaryCard label={isRTL ? "إجمالي الحضور" : "Total Present"} value={attTotals.present} icon={CheckCircle} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
                <SummaryCard label={isRTL ? "إجمالي الغياب" : "Total Absent"} value={attTotals.absent} icon={XCircle} color="bg-destructive/10 text-destructive" />
                <SummaryCard label={isRTL ? "إجمالي التأخير" : "Total Late"} value={attTotals.late} icon={Clock} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
                <SummaryCard label={isRTL ? "إجمالي الإجازات" : "Total Leaves"} value={attTotals.leave} icon={Palmtree} color="bg-primary/10 text-primary" />
              </div>
              {loadingAtt ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
              <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                  <TableHead className="border-b border-border/50">{isRTL ? "رقم" : "#"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "القسم" : "Dept"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "حضور" : "Present"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "غياب" : "Absent"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "تأخر" : "Late"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "إجازة" : "Leave"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الإجمالي" : "Total"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {attSummary.map((e, idx) => (
                    <TableRow key={e.id} className={rowClass(idx)}>
                      <TableCell className={cn("font-mono", cellBorder)}>{e.number}</TableCell>
                      <TableCell className={cn("font-medium", cellBorder)}>{e.name}</TableCell>
                      <TableCell className={cellBorder}>{e.dept}</TableCell>
                      <TableCell className={cn("text-emerald-600 font-bold", cellBorder)}>{e.present}</TableCell>
                      <TableCell className={cn("text-red-600 font-bold", cellBorder)}>{e.absent}</TableCell>
                      <TableCell className={cn("text-amber-600", cellBorder)}>{e.late}</TableCell>
                      <TableCell className={cn("text-blue-600", cellBorder)}>{e.leave}</TableCell>
                      <TableCell className={cellBorder}>{e.total}</TableCell>
                    </TableRow>
                  ))}
                  {attSummary.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ LEAVES ═══ */}
        <TabsContent value="leaves">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? "تقرير الإجازات" : "Leaves Report"}</CardTitle></CardHeader>
            <CardContent>
              <FilterBar isRTL={isRTL} searchTerm={leaveSearch} onSearchChange={setLeaveSearch} dateFrom={leaveDateFrom} dateTo={leaveDateTo} onDateFromChange={setLeaveDateFrom} onDateToChange={setLeaveDateTo} onExport={handleExportLeaves} onPrint={handlePrint} exportDisabled={Object.keys(leaveSummary).length === 0} />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <SummaryCard label={isRTL ? "إجمالي الأيام" : "Total Days"} value={leaveTotals.total} icon={CalendarIcon} color="bg-primary/10 text-primary" />
                <SummaryCard label={isRTL ? "سنوية" : "Annual"} value={leaveTotals.annual} icon={Palmtree} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
                <SummaryCard label={isRTL ? "مرضية" : "Sick"} value={leaveTotals.sick} icon={XCircle} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
                <SummaryCard label={isRTL ? "بدون راتب" : "Unpaid"} value={leaveTotals.unpaid} icon={DollarSign} color="bg-destructive/10 text-destructive" />
                <SummaryCard label={isRTL ? "اضطرارية" : "Emergency"} value={leaveTotals.emergency} icon={Clock} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
              </div>
              {loadingLeaves ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
              <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                  <TableHead className="border-b border-border/50">{isRTL ? "رقم" : "#"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "سنوية" : "Annual"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "مرضية" : "Sick"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "بدون راتب" : "Unpaid"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "اضطرارية" : "Emergency"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الإجمالي" : "Total"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {Object.entries(leaveSummary).map(([id, s], idx) => (
                    <TableRow key={id} className={rowClass(idx)}>
                      <TableCell className={cn("font-mono", cellBorder)}>{s.number}</TableCell>
                      <TableCell className={cn("font-medium", cellBorder)}>{s.name}</TableCell>
                      <TableCell className={cellBorder}>{s.annual}</TableCell>
                      <TableCell className={cellBorder}>{s.sick}</TableCell>
                      <TableCell className={cellBorder}>{s.unpaid}</TableCell>
                      <TableCell className={cellBorder}>{s.emergency}</TableCell>
                      <TableCell className={cn("font-bold", cellBorder)}>{s.total}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(leaveSummary).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ BALANCES ═══ */}
        <TabsContent value="balances">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? "تقرير أرصدة الإجازات" : "Leave Balances Report"}</CardTitle></CardHeader>
            <CardContent>
              <FilterBar
                isRTL={isRTL} searchTerm={balSearch} onSearchChange={setBalSearch}
                dateFrom={undefined} dateTo={undefined} onDateFromChange={() => {}} onDateToChange={() => {}}
                onExport={handleExportBalances} onPrint={handlePrint} exportDisabled={filteredBalances.length === 0}
                extraFilters={
                  <div className="flex gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{isRTL ? "السنة" : "Year"}</Label>
                      <Input type="number" value={balanceYear} onChange={(e) => setBalanceYear(Number(e.target.value))} className="w-24 h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{isRTL ? "الموظف" : "Employee"}</Label>
                      <Select value={balanceEmployee} onValueChange={setBalanceEmployee}>
                        <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{isRTL ? "جميع الموظفين" : "All Employees"}</SelectItem>
                          {employees.map((e: any) => (
                            <SelectItem key={e.id} value={e.id}>{e.employee_number} - {isRTL ? e.name : (e.name_en || e.name)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                }
              />
              <div className="grid grid-cols-3 gap-3 mb-4">
                <SummaryCard label={isRTL ? "إجمالي الاستحقاق" : "Total Entitlement"} value={balTotals.entitlement} icon={CalendarIcon} color="bg-primary/10 text-primary" />
                <SummaryCard label={isRTL ? "المستخدم" : "Used"} value={balTotals.used} icon={Clock} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
                <SummaryCard label={isRTL ? "المتبقي" : "Remaining"} value={balTotals.remaining} icon={CheckCircle} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
              </div>
              {loadingBalances ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
              filteredBalances.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد أرصدة" : "No balances found"}</div>
              ) : (
                <div className="overflow-auto rounded-lg border border-border/50 print:border-black">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                      <TableHead className="border-b border-border/50">{isRTL ? "رقم" : "#"}</TableHead>
                      <TableHead className="border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                      <TableHead className="border-b border-border/50">{isRTL ? "نوع الإجازة" : "Leave Type"}</TableHead>
                      <TableHead className="border-b border-border/50">{isRTL ? "الاستحقاق" : "Entitlement"}</TableHead>
                      <TableHead className="border-b border-border/50">{isRTL ? "المستخدم" : "Used"}</TableHead>
                      <TableHead className="border-b border-border/50">{isRTL ? "المرحّل" : "Carried Over"}</TableHead>
                      <TableHead className="border-b border-border/50">{isRTL ? "المتبقي" : "Remaining"}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {filteredBalances.map((b: any, idx: number) => {
                        const remaining = (b.entitlement || 0) + (b.carried_over || 0) - (b.used || 0);
                        return (
                          <TableRow key={b.id} className={rowClass(idx)}>
                            <TableCell className={cn("font-mono", cellBorder)}>{b.hr_employees?.employee_number || ""}</TableCell>
                            <TableCell className={cn("font-medium", cellBorder)}>{empName(b.hr_employees)}</TableCell>
                            <TableCell className={cellBorder}>{policyLabel(b.leave_type)}</TableCell>
                            <TableCell className={cellBorder}>{b.entitlement}</TableCell>
                            <TableCell className={cn("text-amber-600 font-semibold", cellBorder)}>{b.used}</TableCell>
                            <TableCell className={cellBorder}>{b.carried_over}</TableCell>
                            <TableCell className={cn("font-bold", cellBorder, remaining <= 0 ? "text-destructive" : "text-emerald-600")}>{remaining}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ PAYROLL ═══ */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? "تقرير الرواتب" : "Payroll Report"}</CardTitle></CardHeader>
            <CardContent>
              <FilterBar isRTL={isRTL} searchTerm={paySearch} onSearchChange={setPaySearch} dateFrom={payDateFrom} dateTo={payDateTo} onDateFromChange={setPayDateFrom} onDateToChange={setPayDateTo} onExport={handleExportPayroll} onPrint={handlePrint} exportDisabled={filteredPayroll.length === 0} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <SummaryCard label={isRTL ? "إجمالي الأساسي" : "Total Basic"} value={payTotals.basic.toLocaleString()} icon={DollarSign} color="bg-primary/10 text-primary" />
                <SummaryCard label={isRTL ? "إجمالي البدلات" : "Total Allowances"} value={payTotals.allowances.toLocaleString()} icon={CheckCircle} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
                <SummaryCard label={isRTL ? "إجمالي الاستقطاعات" : "Total Deductions"} value={payTotals.deductions.toLocaleString()} icon={XCircle} color="bg-destructive/10 text-destructive" />
                <SummaryCard label={isRTL ? "صافي الرواتب" : "Net Salary"} value={payTotals.net.toLocaleString()} icon={Banknote} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
              </div>
              {loadingPayroll ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
              <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                  <TableHead className="border-b border-border/50">{isRTL ? "الفترة" : "Period"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الأساسي" : "Basic"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "البدلات" : "Allowances"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الاستقطاعات" : "Deductions"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الصافي" : "Net"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredPayroll.map((r: any, idx: number) => (
                    <TableRow key={r.id} className={rowClass(idx)}>
                      <TableCell className={cn("font-medium", cellBorder)}>{r.period_month}/{r.period_year}</TableCell>
                      <TableCell className={cn("tabular-nums", cellBorder)}>{(r.total_basic || 0).toLocaleString()}</TableCell>
                      <TableCell className={cn("text-emerald-600 tabular-nums", cellBorder)}>{(r.total_allowances || 0).toLocaleString()}</TableCell>
                      <TableCell className={cn("text-destructive tabular-nums", cellBorder)}>{(r.total_deductions || 0).toLocaleString()}</TableCell>
                      <TableCell className={cn("font-bold tabular-nums", cellBorder)}>{(r.total_net || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {filteredPayroll.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ LOANS ═══ */}
        <TabsContent value="loans">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? "تقرير السلف" : "Advances Report"}</CardTitle></CardHeader>
            <CardContent>
              <FilterBar isRTL={isRTL} searchTerm={loanSearch} onSearchChange={setLoanSearch} dateFrom={loanDateFrom} dateTo={loanDateTo} onDateFromChange={setLoanDateFrom} onDateToChange={setLoanDateTo} onExport={handleExportLoans} onPrint={handlePrint} exportDisabled={filteredLoans.length === 0} />
              <div className="grid grid-cols-3 gap-3 mb-4">
                <SummaryCard label={isRTL ? "إجمالي السلف" : "Total Advances"} value={loanTotals.total.toLocaleString()} icon={Banknote} color="bg-primary/10 text-primary" />
                <SummaryCard label={isRTL ? "المسدد" : "Paid"} value={loanTotals.paid.toLocaleString()} icon={CheckCircle} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
                <SummaryCard label={isRTL ? "المتبقي" : "Remaining"} value={loanTotals.remaining.toLocaleString()} icon={Clock} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
              </div>
              {loadingLoans ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
              <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                  <TableHead className="border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "النوع" : "Type"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المسدد" : "Paid"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المتبقي" : "Remaining"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الحالة" : "Status"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredLoans.map((l: any, idx: number) => (
                    <TableRow key={l.id} className={rowClass(idx)}>
                      <TableCell className={cn("font-medium", cellBorder)}>{empName(l.hr_employees)}</TableCell>
                      <TableCell className={cellBorder}>{l.loan_type === "advance" ? (isRTL ? "سلفة" : "Advance") : (isRTL ? "قرض" : "Loan")}</TableCell>
                      <TableCell className={cn("tabular-nums", cellBorder)}>{(l.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className={cn("text-emerald-600 tabular-nums", cellBorder)}>{(l.total_paid || 0).toLocaleString()}</TableCell>
                      <TableCell className={cn("text-amber-600 tabular-nums", cellBorder)}>{(l.remaining || 0).toLocaleString()}</TableCell>
                      <TableCell className={cellBorder}>{l.status === "active" ? (isRTL ? "نشطة" : "Active") : (isRTL ? "مسددة" : "Paid")}</TableCell>
                    </TableRow>
                  ))}
                  {filteredLoans.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ DEDUCTIONS ═══ */}
        <TabsContent value="deductions">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />{isRTL ? "تقرير الخصومات والجزاءات" : "Deductions Report"}</CardTitle></CardHeader>
            <CardContent>
              <FilterBar isRTL={isRTL} searchTerm={dedSearch} onSearchChange={setDedSearch} dateFrom={dedDateFrom} dateTo={dedDateTo} onDateFromChange={setDedDateFrom} onDateToChange={setDedDateTo} onExport={handleExportDeductions} onPrint={handlePrint} exportDisabled={filteredDeductions.length === 0} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <SummaryCard label={isRTL ? "عدد الخصومات" : "Total Count"} value={dedTotals.count} icon={AlertTriangle} color="bg-primary/10 text-primary" />
                <SummaryCard label={isRTL ? "إجمالي المبالغ" : "Total Amount"} value={dedTotals.totalAmount.toLocaleString()} icon={DollarSign} color="bg-destructive/10 text-destructive" />
                <SummaryCard label={isRTL ? "مطبقة" : "Applied"} value={dedTotals.applied} icon={CheckCircle} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
                <SummaryCard label={isRTL ? "معلقة" : "Pending"} value={dedTotals.pending} icon={Clock} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
              </div>
              {loadingDeductions ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
              <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                  <TableHead className="border-b border-border/50">{isRTL ? "الموظف" : "Employee"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "نوع المخالفة" : "Violation"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الشهر المستهدف" : "Target Month"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "ملاحظات" : "Notes"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredDeductions.map((d: any, idx: number) => (
                    <TableRow key={d.id} className={rowClass(idx)}>
                      <TableCell className={cn("font-medium", cellBorder)}>{empName(d.hr_employees)}</TableCell>
                      <TableCell className={cellBorder}>
                        {d.hr_penalty_rules
                          ? (isRTL ? d.hr_penalty_rules.violation_name : (d.hr_penalty_rules.violation_name_en || d.hr_penalty_rules.violation_name))
                          : (d.reason || "—")}
                      </TableCell>
                      <TableCell className={cn("text-destructive tabular-nums font-semibold", cellBorder)}>{(d.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className={cellBorder}>{d.target_month || "—"}</TableCell>
                      <TableCell className={cellBorder}>
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          d.status === "applied"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}>
                          {d.status === "applied" ? (isRTL ? "مطبق" : "Applied") : (isRTL ? "معلق" : "Pending")}
                        </span>
                      </TableCell>
                      <TableCell className={cn("text-muted-foreground text-xs max-w-[200px] truncate", cellBorder)}>{d.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {filteredDeductions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HRReports;
