import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Target } from "lucide-react";

const POSTargets = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    target_type: "amount", target_value: 0, period_start: "", period_end: "", is_active: true,
  });

  const { data: targets } = useQuery({
    queryKey: ["pos-targets", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("pos_sales_targets" as any).select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId } as any;
      if (editing) {
        const { error } = await supabase.from("pos_sales_targets" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pos_sales_targets" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      setDialog(false); setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["pos-targets"] });
    },
    onError: () => toast.error(isRTL ? "خطأ" : "Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_sales_targets" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isRTL ? "تم الحذف" : "Deleted"); queryClient.invalidateQueries({ queryKey: ["pos-targets"] }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "أهداف المبيعات" : "Sales Targets"}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? "تعيين أهداف مبيعات للكاشير" : "Set sales targets for cashiers"}</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ target_type: "amount", target_value: 0, period_start: "", period_end: "", is_active: true }); setDialog(true); }}>
          <Plus className="h-4 w-4 me-2" /> {isRTL ? "إضافة هدف" : "Add Target"}
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
              <TableHead>{isRTL ? "الهدف" : "Target"}</TableHead>
              <TableHead>{isRTL ? "المحقق" : "Achieved"}</TableHead>
              <TableHead>{isRTL ? "التقدم" : "Progress"}</TableHead>
              <TableHead>{isRTL ? "الفترة" : "Period"}</TableHead>
              <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
              <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(targets || []).map((target: any) => {
              const progress = target.target_value > 0 ? Math.min(100, (target.achieved_value / target.target_value) * 100) : 0;
              return (
                <TableRow key={target.id}>
                  <TableCell><Badge variant="outline">{target.target_type === "amount" ? (isRTL ? "قيمة" : "Amount") : (isRTL ? "كمية" : "Quantity")}</Badge></TableCell>
                  <TableCell className="font-medium">{target.target_value.toLocaleString()}</TableCell>
                  <TableCell>{target.achieved_value.toLocaleString()}</TableCell>
                  <TableCell className="min-w-[120px]"><Progress value={progress} className="h-2" /><span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span></TableCell>
                  <TableCell className="text-xs">{target.period_start} → {target.period_end}</TableCell>
                  <TableCell><Badge variant={target.is_active ? "default" : "secondary"}>{target.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(target); setForm({ target_type: target.target_type, target_value: target.target_value, period_start: target.period_start, period_end: target.period_end, is_active: target.is_active }); setDialog(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(target.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {(targets || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {isRTL ? "لا توجد أهداف" : "No targets found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{editing ? (isRTL ? "تعديل هدف" : "Edit Target") : (isRTL ? "إضافة هدف" : "Add Target")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{isRTL ? "نوع الهدف" : "Target Type"}</Label>
              <Select value={form.target_type} onValueChange={(v) => setForm(f => ({ ...f, target_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">{isRTL ? "قيمة مالية" : "Amount"}</SelectItem>
                  <SelectItem value="quantity">{isRTL ? "كمية" : "Quantity"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{isRTL ? "القيمة المستهدفة" : "Target Value"}</Label><Input type="number" value={form.target_value} onChange={(e) => setForm(f => ({ ...f, target_value: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{isRTL ? "من تاريخ" : "Start Date"}</Label><Input type="date" value={form.period_start} onChange={(e) => setForm(f => ({ ...f, period_start: e.target.value }))} /></div>
              <div><Label>{isRTL ? "إلى تاريخ" : "End Date"}</Label><Input type="date" value={form.period_end} onChange={(e) => setForm(f => ({ ...f, period_end: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <Label>{isRTL ? "نشط" : "Active"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.period_start || !form.period_end}>{saveMutation.isPending ? "..." : (isRTL ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSTargets;
