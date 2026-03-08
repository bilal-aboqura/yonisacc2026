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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Shield, Loader2, ArrowLeft, Pencil, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Saudi Labor Law standard penalty rules (نظام العمل السعودي - جدول المخالفات والجزاءات)
const SAUDI_STANDARD_RULES = [
  // التأخير والحضور
  { code: "ATT-01", name: "التأخر عن موعد العمل حتى 15 دقيقة", name_en: "Late arrival up to 15 minutes", category: "attendance", first: "إنذار كتابي", second: "خصم 5% من الراتب اليومي", third: "خصم 10% من الراتب اليومي", fourth: "خصم 20% من الراتب اليومي", fifth: "خصم 50% من الراتب اليومي" },
  { code: "ATT-02", name: "التأخر عن موعد العمل من 15 إلى 30 دقيقة", name_en: "Late arrival 15-30 minutes", category: "attendance", first: "خصم 5% من الراتب اليومي", second: "خصم 10% من الراتب اليومي", third: "خصم 20% من الراتب اليومي", fourth: "خصم 50% من الراتب اليومي", fifth: "خصم يوم كامل" },
  { code: "ATT-03", name: "التأخر عن موعد العمل أكثر من 30 دقيقة", name_en: "Late arrival over 30 minutes", category: "attendance", first: "خصم 10% من الراتب اليومي", second: "خصم 20% من الراتب اليومي", third: "خصم 50% من الراتب اليومي", fourth: "خصم يوم كامل", fifth: "خصم يومين" },
  { code: "ATT-04", name: "الانصراف قبل موعد نهاية العمل بدون إذن", name_en: "Early departure without permission", category: "attendance", first: "إنذار كتابي", second: "خصم 25% من الراتب اليومي", third: "خصم 50% من الراتب اليومي", fourth: "خصم يوم كامل", fifth: "خصم يومين" },
  // الغياب
  { code: "ABS-01", name: "الغياب بدون عذر مقبول يوم واحد", name_en: "Absence without excuse (1 day)", category: "absence", first: "خصم يوم واحد", second: "خصم يومين", third: "خصم 3 أيام", fourth: "إنذار نهائي + خصم 5 أيام", fifth: "فصل حسب المادة 80" },
  { code: "ABS-02", name: "الغياب بدون عذر يومين متتاليين", name_en: "Absence without excuse (2 consecutive days)", category: "absence", first: "خصم يومين", second: "خصم 4 أيام", third: "إنذار نهائي + خصم 5 أيام", fourth: "فصل حسب المادة 80", fifth: null },
  { code: "ABS-03", name: "الغياب بدون عذر 3 أيام فأكثر", name_en: "Absence without excuse (3+ days)", category: "absence", first: "خصم 3 أيام + إنذار", second: "خصم 5 أيام + إنذار نهائي", third: "فصل حسب المادة 80", fourth: null, fifth: null },
  { code: "ABS-04", name: "الغياب 20 يوم متفرقة أو 10 أيام متتالية في السنة", name_en: "20 scattered or 10 consecutive absence days/year", category: "absence", first: "إنذار كتابي بعد 10 أيام", second: "فصل بعد استيفاء المدة حسب المادة 80", third: null, fourth: null, fifth: null },
  // السلوك الوظيفي
  { code: "BHV-01", name: "عدم الالتزام بتعليمات السلامة المهنية", name_en: "Non-compliance with safety instructions", category: "behavior", first: "إنذار كتابي", second: "خصم يوم", third: "خصم 3 أيام", fourth: "خصم 5 أيام", fifth: "فصل" },
  { code: "BHV-02", name: "ترك العمل أثناء الدوام بدون إذن", name_en: "Leaving work during shift without permission", category: "behavior", first: "إنذار كتابي", second: "خصم يوم", third: "خصم يومين", fourth: "خصم 5 أيام", fifth: "فصل" },
  { code: "BHV-03", name: "النوم أثناء ساعات العمل", name_en: "Sleeping during work hours", category: "behavior", first: "إنذار كتابي", second: "خصم يوم", third: "خصم 3 أيام", fourth: "خصم 5 أيام", fifth: "فصل" },
  { code: "BHV-04", name: "الإهمال في أداء العمل", name_en: "Negligence in work duties", category: "behavior", first: "إنذار كتابي", second: "خصم يوم", third: "خصم 3 أيام", fourth: "خصم 5 أيام + إنذار نهائي", fifth: "فصل" },
  { code: "BHV-05", name: "استخدام الهاتف الشخصي أثناء العمل بشكل مخل", name_en: "Excessive personal phone use during work", category: "behavior", first: "إنذار شفهي", second: "إنذار كتابي", third: "خصم يوم", fourth: "خصم 3 أيام", fifth: "خصم 5 أيام" },
];

const CATEGORY_MAP: Record<string, [string, string]> = {
  attendance: ["التأخير والحضور", "Attendance & Lateness"],
  absence: ["الغياب", "Absence"],
  behavior: ["السلوك الوظيفي", "Work Behavior"],
};

const PenaltyRules = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [form, setForm] = useState({
    violation_code: "", violation_name: "", violation_name_en: "", category: "attendance",
    first_offense: "", second_offense: "", third_offense: "", fourth_offense: "", fifth_offense: "",
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["hr-penalty-rules", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_penalty_rules").select("*")
        .eq("company_id", companyId).order("sort_order").order("violation_code");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const resetForm = () => {
    setForm({ violation_code: "", violation_name: "", violation_name_en: "", category: "attendance", first_offense: "", second_offense: "", third_offense: "", fourth_offense: "", fifth_offense: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        violation_code: form.violation_code,
        violation_name: form.violation_name,
        violation_name_en: form.violation_name_en || null,
        category: form.category,
        first_offense: form.first_offense,
        second_offense: form.second_offense,
        third_offense: form.third_offense,
        fourth_offense: form.fourth_offense || null,
        fifth_offense: form.fifth_offense || null,
        company_id: companyId,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await (supabase as any).from("hr_penalty_rules").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("hr_penalty_rules").insert({ ...payload, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-penalty-rules"] });
      resetForm();
      toast.success(isRTL ? "تم الحفظ" : "Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("hr_penalty_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-penalty-rules"] });
      toast.success(isRTL ? "تم الحذف" : "Deleted");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("hr_penalty_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-penalty-rules"] });
    },
  });

  const loadDefaultsMutation = useMutation({
    mutationFn: async () => {
      const inserts = SAUDI_STANDARD_RULES.map((r, idx) => ({
        company_id: companyId,
        violation_code: r.code,
        violation_name: r.name,
        violation_name_en: r.name_en,
        category: r.category,
        first_offense: r.first,
        second_offense: r.second,
        third_offense: r.third,
        fourth_offense: r.fourth,
        fifth_offense: r.fifth,
        is_active: true,
        sort_order: idx,
      }));
      const { error } = await (supabase as any).from("hr_penalty_rules").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-penalty-rules"] });
      toast.success(isRTL ? "تم تحميل البيانات الافتراضية حسب نظام العمل السعودي" : "Default Saudi labor law rules loaded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (rule: any) => {
    setForm({
      violation_code: rule.violation_code || "",
      violation_name: rule.violation_name || "",
      violation_name_en: rule.violation_name_en || "",
      category: rule.category || "attendance",
      first_offense: rule.first_offense || "",
      second_offense: rule.second_offense || "",
      third_offense: rule.third_offense || "",
      fourth_offense: rule.fourth_offense || "",
      fifth_offense: rule.fifth_offense || "",
    });
    setEditingId(rule.id);
    setShowForm(true);
  };

  const filteredRules = filterCategory === "all" ? rules : rules.filter((r: any) => r.category === filterCategory);

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={resetForm}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isRTL ? (editingId ? "تعديل مخالفة" : "إضافة مخالفة") : (editingId ? "Edit Violation" : "Add Violation")}</h1>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "رمز المخالفة" : "Violation Code"}</Label>
                <Input value={form.violation_code} onChange={(e) => setForm({ ...form, violation_code: e.target.value })} placeholder="ATT-01" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "التصنيف" : "Category"}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_MAP).map(([key, [ar, en]]) => (
                      <SelectItem key={key} value={key}>{isRTL ? ar : en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{isRTL ? "وصف المخالفة" : "Violation Description"}</Label>
                <Input value={form.violation_name} onChange={(e) => setForm({ ...form, violation_name: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{isRTL ? "الوصف بالإنجليزي" : "Description (EN)"}</Label>
                <Input value={form.violation_name_en} onChange={(e) => setForm({ ...form, violation_name_en: e.target.value })} dir="ltr" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-base font-semibold mb-3">{isRTL ? "الجزاءات حسب التكرار" : "Penalties by Occurrence"}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "المرة الأولى" : "1st Offense"} <span className="text-destructive">*</span></Label>
                  <Input value={form.first_offense} onChange={(e) => setForm({ ...form, first_offense: e.target.value })} placeholder={isRTL ? "مثال: إنذار كتابي" : "e.g. Written warning"} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "المرة الثانية" : "2nd Offense"} <span className="text-destructive">*</span></Label>
                  <Input value={form.second_offense} onChange={(e) => setForm({ ...form, second_offense: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "المرة الثالثة" : "3rd Offense"} <span className="text-destructive">*</span></Label>
                  <Input value={form.third_offense} onChange={(e) => setForm({ ...form, third_offense: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "المرة الرابعة" : "4th Offense"}</Label>
                  <Input value={form.fourth_offense} onChange={(e) => setForm({ ...form, fourth_offense: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "المرة الخامسة" : "5th Offense"}</Label>
                  <Input value={form.fifth_offense} onChange={(e) => setForm({ ...form, fifth_offense: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={resetForm}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.violation_code || !form.violation_name || !form.first_offense}>
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "تجهيز الخصومات والجزاءات" : "Penalty & Deduction Rules"}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? "إعدادات المخالفات والجزاءات حسب نظام العمل السعودي" : "Violation & penalty settings based on Saudi labor law"}</p>
        </div>
        <div className="flex gap-2">
          {rules.length === 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <RotateCcw className="h-4 w-4 me-2" />{isRTL ? "تحميل الافتراضي" : "Load Defaults"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isRTL ? "تحميل البيانات الافتراضية" : "Load Default Rules"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isRTL ? "سيتم إضافة جدول المخالفات والجزاءات الافتراضي حسب نظام العمل السعودي. يمكنك تعديل أي بند بعد التحميل." : "This will add the standard Saudi labor law violation & penalty schedule. You can edit any rule after loading."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => loadDefaultsMutation.mutate()}>
                    {loadDefaultsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                    {isRTL ? "تحميل" : "Load"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة مخالفة" : "Add Violation"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المخالفات" : "Total Rules"}</p>
          <p className="text-2xl font-bold">{rules.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "التأخير" : "Attendance"}</p>
          <p className="text-2xl font-bold">{rules.filter((r: any) => r.category === "attendance").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "الغياب" : "Absence"}</p>
          <p className="text-2xl font-bold">{rules.filter((r: any) => r.category === "absence").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "السلوك" : "Behavior"}</p>
          <p className="text-2xl font-bold">{rules.filter((r: any) => r.category === "behavior").length}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
            {Object.entries(CATEGORY_MAP).map(([key, [ar, en]]) => (
              <SelectItem key={key} value={key}>{isRTL ? ar : en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{isRTL ? "جدول المخالفات والجزاءات" : "Violations & Penalties Schedule"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          filteredRules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{isRTL ? "لا توجد مخالفات مسجلة" : "No violation rules yet"}</p>
              {rules.length === 0 && <p className="text-sm mt-1">{isRTL ? "اضغط 'تحميل الافتراضي' لإضافة جدول مكتب العمل" : "Click 'Load Defaults' to add Saudi labor law schedule"}</p>}
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-muted/60 dark:bg-muted/30">
                  <TableHead className="border-b border-border/50 w-20">{isRTL ? "الرمز" : "Code"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المخالفة" : "Violation"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "التصنيف" : "Category"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المرة 1" : "1st"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المرة 2" : "2nd"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المرة 3" : "3rd"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المرة 4" : "4th"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "المرة 5" : "5th"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "فعال" : "Active"}</TableHead>
                  <TableHead className="border-b border-border/50">{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredRules.map((r: any, idx: number) => (
                    <TableRow key={r.id} className={`transition-colors duration-150 hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}`}>
                      <TableCell className="font-mono text-xs border-b border-border/30">{r.violation_code}</TableCell>
                      <TableCell className="border-b border-border/30 text-sm max-w-[250px]">
                        {isRTL ? r.violation_name : (r.violation_name_en || r.violation_name)}
                      </TableCell>
                      <TableCell className="border-b border-border/30">
                        <Badge variant="outline" className="text-xs">
                          {isRTL ? (CATEGORY_MAP[r.category]?.[0] || r.category) : (CATEGORY_MAP[r.category]?.[1] || r.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="border-b border-border/30 text-xs">{r.first_offense || "—"}</TableCell>
                      <TableCell className="border-b border-border/30 text-xs">{r.second_offense || "—"}</TableCell>
                      <TableCell className="border-b border-border/30 text-xs">{r.third_offense || "—"}</TableCell>
                      <TableCell className="border-b border-border/30 text-xs">{r.fourth_offense || "—"}</TableCell>
                      <TableCell className="border-b border-border/30 text-xs">{r.fifth_offense || "—"}</TableCell>
                      <TableCell className="border-b border-border/30">
                        <Switch checked={r.is_active} onCheckedChange={(v) => toggleActiveMutation.mutate({ id: r.id, is_active: v })} />
                      </TableCell>
                      <TableCell className="border-b border-border/30">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{isRTL ? "حذف المخالفة" : "Delete Violation"}</AlertDialogTitle>
                                <AlertDialogDescription>{isRTL ? "هل أنت متأكد؟" : "Are you sure?"}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isRTL ? "حذف" : "Delete"}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
    </div>
  );
};

export default PenaltyRules;
