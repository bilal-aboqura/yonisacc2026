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
import { Plus, Clock, Loader2, ArrowLeft, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

const Periods = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", name_en: "", period_type: "monthly", start_date: "", end_date: "" });

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["fiscal-periods", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fiscal_periods").select("*")
        .eq("company_id", companyId).order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("fiscal_periods").insert({
        ...form, company_id: companyId, is_closed: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-periods"] });
      setShowForm(false);
      setForm({ name: "", name_en: "", period_type: "monthly", start_date: "", end_date: "" });
      toast.success(isRTL ? "تم إضافة الفترة" : "Period added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCloseMutation = useMutation({
    mutationFn: async ({ id, is_closed }: { id: string; is_closed: boolean }) => {
      const { error } = await (supabase as any).from("fiscal_periods").update({
        is_closed, closed_at: is_closed ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-periods"] });
      toast.success(isRTL ? "تم التحديث" : "Updated");
    },
  });

  const periodTypeLabel = (t: string) => {
    const map: Record<string, [string, string]> = {
      monthly: ["شهرية", "Monthly"],
      quarterly: ["ربع سنوية", "Quarterly"],
      yearly: ["سنوية", "Yearly"],
    };
    return isRTL ? (map[t]?.[0] || t) : (map[t]?.[1] || t);
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isRTL ? "إضافة فترة" : "Add Period"}</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "اسم الفترة" : "Period Name"}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "الاسم بالإنجليزي" : "Name (EN)"}</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>{isRTL ? "نوع الفترة" : "Period Type"}</Label>
                <Select value={form.period_type} onValueChange={(v) => setForm({ ...form, period_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{isRTL ? "شهرية" : "Monthly"}</SelectItem>
                    <SelectItem value="quarterly">{isRTL ? "ربع سنوية" : "Quarterly"}</SelectItem>
                    <SelectItem value="yearly">{isRTL ? "سنوية" : "Yearly"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div />
              <div className="space-y-2"><Label>{isRTL ? "تاريخ البداية" : "Start Date"}</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "تاريخ النهاية" : "End Date"}</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowForm(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.start_date || !form.end_date}>
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
        <h1 className="text-2xl font-bold">{isRTL ? "الفترات المالية" : "Fiscal Periods"}</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة فترة" : "Add Period"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الفترات" : "Total Periods"}</p>
          <p className="text-2xl font-bold">{periods.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "مفتوحة" : "Open"}</p>
          <p className="text-2xl font-bold text-emerald-600">{periods.filter((p: any) => !p.is_closed).length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "مقفلة" : "Closed"}</p>
          <p className="text-2xl font-bold text-muted-foreground">{periods.filter((p: any) => p.is_closed).length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />{isRTL ? "فترات العمل" : "Work Periods"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          periods.length === 0 ? <div className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد فترات حالياً" : "No periods yet"}</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>{isRTL ? "الفترة" : "Period"}</TableHead>
              <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
              <TableHead>{isRTL ? "من" : "From"}</TableHead>
              <TableHead>{isRTL ? "إلى" : "To"}</TableHead>
              <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
              <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {periods.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{isRTL ? p.name : (p.name_en || p.name)}</TableCell>
                  <TableCell>{periodTypeLabel(p.period_type)}</TableCell>
                  <TableCell>{p.start_date}</TableCell>
                  <TableCell>{p.end_date}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_closed ? "secondary" : "default"}>
                      {p.is_closed ? (isRTL ? "مقفلة" : "Closed") : (isRTL ? "مفتوحة" : "Open")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleCloseMutation.mutate({ id: p.id, is_closed: !p.is_closed })}>
                      {p.is_closed ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>
    </div>
  );
};

export default Periods;
