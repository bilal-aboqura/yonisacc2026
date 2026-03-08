import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar, Plus, Lock, Unlock, XCircle, RotateCcw, Loader2, ArrowLeft,
  CheckCircle2, AlertTriangle, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import PreClosingValidation from "@/components/fiscal/PreClosingValidation";
import StockCountSession from "@/components/fiscal/StockCountSession";
import YearClosingReport from "@/components/fiscal/YearClosingReport";
import FiscalAuditLog from "@/components/fiscal/FiscalAuditLog";

const FiscalYearManagement = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", name_en: "", period_type: "yearly", start_date: "", end_date: "" });
  const [selectedFY, setSelectedFY] = useState<string | null>(null);
  const [reopenDialog, setReopenDialog] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [closeDialog, setCloseDialog] = useState<string | null>(null);
  const [retainedEarningsId, setRetainedEarningsId] = useState("");
  const [validationPassed, setValidationPassed] = useState(false);

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["fiscal-years", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fiscal_periods").select("*")
        .eq("company_id", companyId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: equityAccounts = [] } = useQuery({
    queryKey: ["equity-accounts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, name_en, code")
        .eq("company_id", companyId!)
        .eq("type", "equity")
        .eq("is_active", true)
        .is("is_parent", false);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("fiscal_periods").insert({
        ...form, company_id: companyId, status: "open", is_closed: false, created_by: user?.id,
      });
      if (error) throw error;
      // Audit log
      await (supabase as any).from("fiscal_year_audit_log").insert({
        company_id: companyId, fiscal_year_id: null, action: "create",
        performed_by: user?.id, notes: `Created fiscal year: ${form.name}`,
      }).then(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-years"] });
      setShowForm(false);
      setForm({ name: "", name_en: "", period_type: "yearly", start_date: "", end_date: "" });
      toast.success(isRTL ? "تم إنشاء السنة المالية" : "Fiscal year created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const lockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("fiscal_periods").update({
        status: "temporarily_locked", locked_by: user?.id, locked_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      await (supabase as any).from("fiscal_year_audit_log").insert({
        company_id: companyId, fiscal_year_id: id, action: "lock", performed_by: user?.id,
        notes: isRTL ? "قفل مؤقت للسنة المالية" : "Temporarily locked fiscal year",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-years"] });
      toast.success(isRTL ? "تم القفل المؤقت" : "Temporarily locked");
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("fiscal_periods").update({
        status: "open", locked_by: null, locked_at: null,
      }).eq("id", id);
      if (error) throw error;
      await (supabase as any).from("fiscal_year_audit_log").insert({
        company_id: companyId, fiscal_year_id: id, action: "unlock", performed_by: user?.id,
        notes: isRTL ? "فك قفل السنة المالية" : "Unlocked fiscal year",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-years"] });
      toast.success(isRTL ? "تم فك القفل" : "Unlocked");
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!closeDialog || !retainedEarningsId) throw new Error("Missing data");
      const { data, error } = await (supabase as any).rpc("close_fiscal_year", {
        p_company_id: companyId,
        p_fiscal_year_id: closeDialog,
        p_retained_earnings_account_id: retainedEarningsId,
        p_user_id: user?.id,
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-years"] });
      setCloseDialog(null);
      setRetainedEarningsId("");
      toast.success(
        isRTL
          ? `تم الإقفال ✅ | صافي الربح: ${Number(data.net_profit).toLocaleString()}`
          : `Closed ✅ | Net Profit: ${Number(data.net_profit).toLocaleString()}`
      );
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!reopenDialog || !reopenReason.trim()) throw new Error("Reason required");
      const { data, error } = await (supabase as any).rpc("reopen_fiscal_year", {
        p_company_id: companyId,
        p_fiscal_year_id: reopenDialog,
        p_user_id: user?.id,
        p_reason: reopenReason,
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-years"] });
      setReopenDialog(null);
      setReopenReason("");
      toast.success(isRTL ? "تم إعادة فتح السنة المالية" : "Fiscal year reopened");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: [string, string]; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      open: { label: ["مفتوحة", "Open"], variant: "default" },
      temporarily_locked: { label: ["مقفلة مؤقتاً", "Temp Locked"], variant: "outline" },
      closed: { label: ["مقفلة", "Closed"], variant: "secondary" },
    };
    const s = map[status] || { label: [status, status], variant: "secondary" as const };
    return <Badge variant={s.variant}>{isRTL ? s.label[0] : s.label[1]}</Badge>;
  };

  const openCount = periods.filter((p: any) => p.status === "open").length;
  const lockedCount = periods.filter((p: any) => p.status === "temporarily_locked").length;
  const closedCount = periods.filter((p: any) => p.status === "closed").length;

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isRTL ? "إنشاء سنة مالية" : "Create Fiscal Year"}</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "اسم السنة المالية" : "Fiscal Year Name"}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={isRTL ? "مثال: السنة المالية 2025" : "e.g. Fiscal Year 2025"} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم بالإنجليزي" : "Name (EN)"}</Label>
                <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "تاريخ البداية" : "Start Date"}</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "تاريخ النهاية" : "End Date"}</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowForm(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.start_date || !form.end_date}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {isRTL ? "حفظ" : "Save"}
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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          {isRTL ? "إدارة السنوات المالية" : "Fiscal Year Management"}
        </h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "سنة مالية جديدة" : "New Fiscal Year"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "مفتوحة" : "Open"}</p>
          <p className="text-2xl font-bold text-emerald-600">{openCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "مقفلة مؤقتاً" : "Temp Locked"}</p>
          <p className="text-2xl font-bold text-amber-600">{lockedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "مقفلة نهائياً" : "Closed"}</p>
          <p className="text-2xl font-bold text-muted-foreground">{closedCount}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="years" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="years">{isRTL ? "السنوات" : "Years"}</TabsTrigger>
          <TabsTrigger value="validation">{isRTL ? "التحقق" : "Validation"}</TabsTrigger>
          <TabsTrigger value="stockcount">{isRTL ? "الجرد" : "Stock Count"}</TabsTrigger>
          <TabsTrigger value="report">{isRTL ? "التقرير" : "Report"}</TabsTrigger>
          <TabsTrigger value="audit">{isRTL ? "التدقيق" : "Audit"}</TabsTrigger>
        </TabsList>

        <TabsContent value="years">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "السنوات المالية" : "Fiscal Years"}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : periods.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد سنوات مالية" : "No fiscal years"}</div>
              ) : (
                <div className="overflow-auto rounded-lg border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/60">
                        <TableHead>{isRTL ? "السنة المالية" : "Fiscal Year"}</TableHead>
                        <TableHead>{isRTL ? "من" : "From"}</TableHead>
                        <TableHead>{isRTL ? "إلى" : "To"}</TableHead>
                        <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                        <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.map((p: any) => (
                        <TableRow key={p.id} className="hover:bg-primary/[0.03]">
                          <TableCell className="font-medium">{isRTL ? p.name : (p.name_en || p.name)}</TableCell>
                          <TableCell>{p.start_date}</TableCell>
                          <TableCell>{p.end_date}</TableCell>
                          <TableCell>{statusBadge(p.status || (p.is_closed ? "closed" : "open"))}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {(p.status === "open" || (!p.status && !p.is_closed)) && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" title={isRTL ? "قفل مؤقت" : "Temp Lock"} onClick={() => lockMutation.mutate(p.id)}>
                                  <Lock className="h-4 w-4 text-amber-600" />
                                </Button>
                              )}
                              {p.status === "temporarily_locked" && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title={isRTL ? "فك القفل" : "Unlock"} onClick={() => unlockMutation.mutate(p.id)}>
                                    <Unlock className="h-4 w-4 text-sky-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title={isRTL ? "إقفال نهائي" : "Final Close"} onClick={() => { setCloseDialog(p.id); setSelectedFY(p.id); }}>
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                              {p.status === "closed" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" title={isRTL ? "إعادة فتح" : "Reopen"} onClick={() => setReopenDialog(p.id)}>
                                  <RotateCcw className="h-4 w-4 text-orange-600" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" title={isRTL ? "اختيار" : "Select"} onClick={() => setSelectedFY(p.id)}>
                                <CheckCircle2 className={`h-4 w-4 ${selectedFY === p.id ? "text-primary" : "text-muted-foreground"}`} />
                              </Button>
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
        </TabsContent>

        <TabsContent value="validation">
          <div className="space-y-2 mb-4">
            <Label>{isRTL ? "اختر السنة المالية" : "Select Fiscal Year"}</Label>
            <Select value={selectedFY || ""} onValueChange={setSelectedFY}>
              <SelectTrigger><SelectValue placeholder={isRTL ? "اختر..." : "Select..."} /></SelectTrigger>
              <SelectContent>
                {periods.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : (p.name_en || p.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <PreClosingValidation fiscalYearId={selectedFY} onValidationComplete={setValidationPassed} />
        </TabsContent>

        <TabsContent value="stockcount">
          <div className="space-y-2 mb-4">
            <Label>{isRTL ? "اختر السنة المالية" : "Select Fiscal Year"}</Label>
            <Select value={selectedFY || ""} onValueChange={setSelectedFY}>
              <SelectTrigger><SelectValue placeholder={isRTL ? "اختر..." : "Select..."} /></SelectTrigger>
              <SelectContent>
                {periods.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : (p.name_en || p.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <StockCountSession fiscalYearId={selectedFY} />
        </TabsContent>

        <TabsContent value="report">
          <div className="space-y-2 mb-4">
            <Label>{isRTL ? "اختر السنة المالية" : "Select Fiscal Year"}</Label>
            <Select value={selectedFY || ""} onValueChange={setSelectedFY}>
              <SelectTrigger><SelectValue placeholder={isRTL ? "اختر..." : "Select..."} /></SelectTrigger>
              <SelectContent>
                {periods.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : (p.name_en || p.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <YearClosingReport fiscalYearId={selectedFY} />
        </TabsContent>

        <TabsContent value="audit">
          <FiscalAuditLog />
        </TabsContent>
      </Tabs>

      {/* Close Dialog */}
      <Dialog open={!!closeDialog} onOpenChange={() => setCloseDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              {isRTL ? "إقفال السنة المالية نهائياً" : "Final Year Closing"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {isRTL
                ? "⚠️ هذا الإجراء سيقوم بإقفال حسابات قائمة الدخل وتحويل صافي الربح/الخسارة إلى الأرباح المبقاة وتوليد أرصدة افتتاحية للسنة الجديدة."
                : "⚠️ This will close income statement accounts, transfer net profit/loss to retained earnings, and generate opening balances."}
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "حساب الأرباح المبقاة" : "Retained Earnings Account"}</Label>
              <Select value={retainedEarningsId} onValueChange={setRetainedEarningsId}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر حساب..." : "Select account..."} /></SelectTrigger>
                <SelectContent>
                  {equityAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} - {isRTL ? a.name : (a.name_en || a.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(null)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending || !retainedEarningsId}>
              {closeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "إقفال نهائي" : "Close Year"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Dialog */}
      <Dialog open={!!reopenDialog} onOpenChange={() => setReopenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              {isRTL ? "إعادة فتح السنة المالية" : "Reopen Fiscal Year"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm">
              {isRTL
                ? "⚠️ سيتم حذف قيود الإقفال والأرصدة الافتتاحية المولدة. يرجى إدخال سبب إعادة الفتح."
                : "⚠️ Closing entries and generated opening balances will be deleted. Please provide a reason."}
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "سبب إعادة الفتح" : "Reason for Reopening"}</Label>
              <Textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder={isRTL ? "اكتب السبب..." : "Enter reason..."} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenDialog(null)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => reopenMutation.mutate()} disabled={reopenMutation.isPending || !reopenReason.trim()}>
              {reopenMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "إعادة فتح" : "Reopen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FiscalYearManagement;
