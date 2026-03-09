import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Settings, Loader2, Trash2, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const DEFAULT_POLICIES = [
  { leave_type: "annual", name: "إجازة سنوية", name_en: "Annual Leave", annual_entitlement: 21, is_paid: true, carry_over_allowed: true, max_carry_over_days: 10 },
  { leave_type: "sick", name: "إجازة مرضية", name_en: "Sick Leave", annual_entitlement: 15, is_paid: true, carry_over_allowed: false, max_carry_over_days: 0 },
  { leave_type: "unpaid", name: "إجازة بدون راتب", name_en: "Unpaid Leave", annual_entitlement: 30, is_paid: false, carry_over_allowed: false, max_carry_over_days: 0 },
  { leave_type: "emergency", name: "إجازة اضطرارية", name_en: "Emergency Leave", annual_entitlement: 5, is_paid: true, carry_over_allowed: false, max_carry_over_days: 0 },
];

interface PolicyForm {
  leave_type: string;
  name: string;
  name_en: string;
  annual_entitlement: number;
  carry_over_allowed: boolean;
  max_carry_over_days: number;
  is_paid: boolean;
}

const LeaveSettings = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [applyYear, setApplyYear] = useState(new Date().getFullYear());
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [form, setForm] = useState<PolicyForm>({
    leave_type: "", name: "", name_en: "", annual_entitlement: 0,
    carry_over_allowed: false, max_carry_over_days: 0, is_paid: true,
  });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["hr-leave-policies", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_leave_policies").select("*")
        .eq("company_id", companyId).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-active-leave", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_employees").select("id, name, name_en, employee_number")
        .eq("company_id", companyId).eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await (supabase as any).from("hr_leave_policies")
          .update({ ...form }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("hr_leave_policies")
          .insert({ ...form, company_id: companyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-leave-policies"] });
      setShowForm(false);
      setEditingId(null);
      toast.success(isRTL ? "تم الحفظ" : "Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("hr_leave_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-leave-policies"] });
      toast.success(isRTL ? "تم الحذف" : "Deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!policies.length || !employees.length) throw new Error(isRTL ? "لا توجد سياسات أو موظفين" : "No policies or employees");
      const rows: any[] = [];
      for (const emp of employees) {
        for (const pol of policies) {
          if (!pol.is_active) continue;
          rows.push({
            company_id: companyId,
            employee_id: emp.id,
            leave_type: pol.leave_type,
            year: applyYear,
            entitlement: pol.annual_entitlement,
            used: 0,
            carried_over: 0,
          });
        }
      }
      const { error } = await (supabase as any).from("hr_leave_balances")
        .upsert(rows, { onConflict: "company_id,employee_id,leave_type,year" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      setShowApplyDialog(false);
      toast.success(isRTL ? `تم تطبيق الأرصدة على ${employees.length} موظف` : `Balances applied to ${employees.length} employees`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const initDefaults = async () => {
    const existing = policies.map((p: any) => p.leave_type);
    const toInsert = DEFAULT_POLICIES.filter(d => !existing.includes(d.leave_type))
      .map(d => ({ ...d, company_id: companyId }));
    if (!toInsert.length) {
      toast.info(isRTL ? "السياسات الافتراضية موجودة بالفعل" : "Default policies already exist");
      return;
    }
    const { error } = await (supabase as any).from("hr_leave_policies").insert(toInsert);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["hr-leave-policies"] });
    toast.success(isRTL ? "تم إضافة السياسات الافتراضية" : "Default policies added");
  };

  const openEdit = (p: any) => {
    setForm({
      leave_type: p.leave_type, name: p.name, name_en: p.name_en || "",
      annual_entitlement: p.annual_entitlement, carry_over_allowed: p.carry_over_allowed,
      max_carry_over_days: p.max_carry_over_days, is_paid: p.is_paid,
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const openNew = () => {
    setForm({ leave_type: "", name: "", name_en: "", annual_entitlement: 0, carry_over_allowed: false, max_carry_over_days: 0, is_paid: true });
    setEditingId(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          {isRTL ? "تجهيز الإجازات" : "Leave Settings"}
        </h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={initDefaults}>
            <CheckCircle className="h-4 w-4 me-2" />{isRTL ? "إضافة الافتراضية" : "Add Defaults"}
          </Button>
          <Button variant="outline" onClick={() => setShowApplyDialog(true)} disabled={!policies.length}>
            <Users className="h-4 w-4 me-2" />{isRTL ? "تطبيق على الموظفين" : "Apply to Employees"}
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة سياسة" : "Add Policy"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "سياسات الإجازات" : "Leave Policies"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : policies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {isRTL ? "لا توجد سياسات. اضغط 'إضافة الافتراضية' للبدء" : "No policies. Click 'Add Defaults' to start"}
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 dark:bg-muted/30">
                    <TableHead className="border-b border-border/50">{isRTL ? "النوع" : "Type"}</TableHead>
                    <TableHead className="border-b border-border/50">{isRTL ? "الاسم" : "Name"}</TableHead>
                    <TableHead className="border-b border-border/50">{isRTL ? "الاستحقاق السنوي" : "Annual Entitlement"}</TableHead>
                    <TableHead className="border-b border-border/50">{isRTL ? "مدفوعة" : "Paid"}</TableHead>
                    <TableHead className="border-b border-border/50">{isRTL ? "ترحيل" : "Carry Over"}</TableHead>
                    <TableHead className="border-b border-border/50">{isRTL ? "أقصى ترحيل" : "Max Carry Over"}</TableHead>
                    <TableHead className="border-b border-border/50">{isRTL ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((p: any, idx: number) => (
                    <TableRow key={p.id} className={`cursor-pointer transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}
                      onClick={() => openEdit(p)}>
                      <TableCell className="font-mono border-b border-border/30">{p.leave_type}</TableCell>
                      <TableCell className="font-medium border-b border-border/30">{isRTL ? p.name : (p.name_en || p.name)}</TableCell>
                      <TableCell className="border-b border-border/30">{p.annual_entitlement} {isRTL ? "يوم" : "days"}</TableCell>
                      <TableCell className="border-b border-border/30">{p.is_paid ? "✓" : "✗"}</TableCell>
                      <TableCell className="border-b border-border/30">{p.carry_over_allowed ? "✓" : "✗"}</TableCell>
                      <TableCell className="border-b border-border/30">{p.max_carry_over_days}</TableCell>
                      <TableCell className="border-b border-border/30">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(p.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Policy Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? (isRTL ? "تعديل سياسة" : "Edit Policy") : (isRTL ? "إضافة سياسة" : "Add Policy")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "رمز النوع" : "Type Key"}</Label>
                <Input value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                  placeholder="annual" disabled={!!editingId} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الاستحقاق السنوي (أيام)" : "Annual Entitlement (days)"}</Label>
                <Input type="number" value={form.annual_entitlement}
                  onChange={(e) => setForm({ ...form, annual_entitlement: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم بالعربي" : "Name (AR)"}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم بالإنجليزي" : "Name (EN)"}</Label>
                <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_paid} onCheckedChange={(v) => setForm({ ...form, is_paid: v })} />
                <Label>{isRTL ? "مدفوعة" : "Paid"}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.carry_over_allowed} onCheckedChange={(v) => setForm({ ...form, carry_over_allowed: v, max_carry_over_days: v ? form.max_carry_over_days : 0 })} />
                <Label>{isRTL ? "السماح بالترحيل" : "Allow Carry Over"}</Label>
              </div>
            </div>
            {form.carry_over_allowed && (
              <div className="space-y-2">
                <Label>{isRTL ? "أقصى أيام ترحيل" : "Max Carry Over Days"}</Label>
                <Input type="number" value={form.max_carry_over_days}
                  onChange={(e) => setForm({ ...form, max_carry_over_days: Number(e.target.value) })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.leave_type || !form.name}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply to Employees Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تطبيق الأرصدة على الموظفين" : "Apply Balances to Employees"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? `سيتم إنشاء أرصدة إجازات لـ ${employees.length} موظف نشط بناءً على ${policies.filter((p: any) => p.is_active).length} سياسة فعالة`
                : `Will create leave balances for ${employees.length} active employees based on ${policies.filter((p: any) => p.is_active).length} active policies`}
            </p>
            <div className="space-y-2">
              <Label>{isRTL ? "السنة" : "Year"}</Label>
              <Input type="number" value={applyYear} onChange={(e) => setApplyYear(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
              {applyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "تطبيق" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveSettings;
