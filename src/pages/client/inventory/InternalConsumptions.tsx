import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useRBAC } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, PackageMinus, Trash2, ArrowLeft, DollarSign, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import InventoryStatCard from "@/components/inventory/InventoryStatCard";

const InternalConsumptions = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { can } = useRBAC();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: consumptions = [], isLoading } = useQuery({
    queryKey: ["internal_consumptions", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("internal_consumptions" as any) as any)
        .select("*, branches(name, name_en), internal_consumption_items(quantity, unit_cost)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => { const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!).eq("is_active", true); return data || []; },
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-stock", companyId],
    queryFn: async () => { const { data } = await supabase.from("products").select("id, name, name_en").eq("company_id", companyId!).eq("is_active", true).neq("product_type", "service"); return data || []; },
    enabled: !!companyId,
  });

  const [form, setForm] = useState({ branch_id: "", consumption_date: new Date().toISOString().split("T")[0], department: "", reason: "", notes: "", items: [{ product_id: "", quantity: 0, unit_cost: 0, notes: "" }] });
  const resetForm = () => setForm({ branch_id: "", consumption_date: new Date().toISOString().split("T")[0], department: "", reason: "", notes: "", items: [{ product_id: "", quantity: 0, unit_cost: 0, notes: "" }] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const validItems = form.items.filter(i => i.product_id && i.quantity > 0);
      if (validItems.length === 0) throw new Error("No valid items");
      const { data, error } = await (supabase.rpc as any)("rpc_inventory_consumption", {
        p_company_id: companyId!, p_branch_id: form.branch_id, p_consumption_date: form.consumption_date,
        p_department: form.department || null, p_reason: form.reason || null, p_notes: form.notes || null,
        p_items: validItems.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost || 0, notes: i.notes || null })),
        p_created_by: user?.id,
      } as any);
      if (error) throw error; return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["internal_consumptions"] }); queryClient.invalidateQueries({ queryKey: ["stock-overview"] }); toast.success(isRTL ? "تم تسجيل الاستهلاك بنجاح" : "Consumption recorded"); setShowForm(false); resetForm(); },
    onError: (err: any) => toast.error(err?.message?.includes("Insufficient") ? (isRTL ? "الرصيد غير كافي" : "Insufficient stock") : (isRTL ? "حدث خطأ" : "Error")),
  });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: "", quantity: 0, unit_cost: 0, notes: "" }] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: any) => setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) }));

  const canManage = can("MANAGE_CONSUMPTIONS");
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";

  const stats = useMemo(() => {
    const totalValue = consumptions.reduce((s: number, c: any) => {
      const items = c.internal_consumption_items || [];
      return s + items.reduce((is: number, i: any) => is + (i.quantity || 0) * (i.unit_cost || 0), 0);
    }, 0);
    const lastDate = consumptions.length > 0 ? formatDate((consumptions[0] as any).consumption_date) : "-";
    return { total: consumptions.length, totalValue, lastDate };
  }, [consumptions]);

  const formTotals = useMemo(() => {
    const totalQty = form.items.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalCost = form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_cost || 0), 0);
    return { totalQty, totalCost };
  }, [form.items]);

  if (showForm) {
    return (
      <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}><ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} /></Button>
          <PackageMinus className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{isRTL ? "استهلاك داخلي جديد" : "New Internal Consumption"}</h1>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>{isRTL ? "الفرع" : "Branch"} *</Label><Select value={form.branch_id} onValueChange={v => setForm(f => ({ ...f, branch_id: v }))}><SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger><SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{isRTL ? "تاريخ الاستهلاك" : "Date"} *</Label><Input type="date" value={form.consumption_date} onChange={e => setForm(f => ({ ...f, consumption_date: e.target.value }))} /></div>
              <div><Label>{isRTL ? "القسم" : "Department"}</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
            </div>
            <div><Label>{isRTL ? "السبب" : "Reason"}</Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
            <div>
              <div className={cn("flex items-center justify-between mb-3", isRTL && "flex-row-reverse")}>
                <Label className="text-base font-semibold">{isRTL ? "الأصناف" : "Items"}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1"><Plus className="h-3 w-3" />{isRTL ? "إضافة" : "Add"}</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>{isRTL ? "المنتج" : "Product"}</TableHead><TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead><TableHead className="text-end">{isRTL ? "التكلفة" : "Cost"}</TableHead><TableHead className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {form.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Select value={item.product_id} onValueChange={v => updateItem(idx, "product_id", v)}><SelectTrigger><SelectValue placeholder={isRTL ? "المنتج" : "Product"} /></SelectTrigger><SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : p.name_en || p.name}</SelectItem>)}</SelectContent></Select></TableCell>
                        <TableCell><Input type="number" min={0} value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} className="w-28 text-end tabular-nums" /></TableCell>
                        <TableCell><Input type="number" min={0} value={item.unit_cost} onChange={e => updateItem(idx, "unit_cost", parseFloat(e.target.value) || 0)} className="w-28 text-end tabular-nums" /></TableCell>
                        <TableCell className="text-end tabular-nums font-medium">{((item.quantity || 0) * (item.unit_cost || 0)).toFixed(2)}</TableCell>
                        <TableCell><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeItem(idx)} disabled={form.items.length <= 1}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell>{isRTL ? "الإجمالي" : "Total"}</TableCell>
                      <TableCell className="text-end tabular-nums">{formTotals.totalQty}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-end tabular-nums">{formTotals.totalCost.toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className={cn("flex gap-3 pt-4", isRTL ? "flex-row-reverse" : "")}>
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.branch_id}>
                {createMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ وخصم" : "Save & Deduct")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4")}>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <PackageMinus className="h-7 w-7 text-primary" />
            {isRTL ? "الاستهلاك الداخلي" : "Internal Consumptions"}
          </h1>
          <p className="text-muted-foreground mt-1">{isRTL ? "تتبع استهلاك المواد داخل الأقسام" : "Track internal material consumption across departments"}</p>
        </div>
        {canManage && <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" />{isRTL ? "استهلاك جديد" : "New Consumption"}</Button>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-[88px] rounded-lg" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <InventoryStatCard icon={PackageMinus} title={isRTL ? "عدد العمليات" : "Total Operations"} value={stats.total} />
          <InventoryStatCard icon={DollarSign} title={isRTL ? "القيمة الإجمالية" : "Total Value"} value={stats.totalValue > 0 ? stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"} variant="danger" />
          <InventoryStatCard icon={Calendar} title={isRTL ? "آخر عملية" : "Last Operation"} value={stats.lastDate} />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الرقم" : "Number"}</TableHead>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
                <TableHead>{isRTL ? "القسم" : "Department"}</TableHead>
                <TableHead className="text-end">{isRTL ? "الأصناف" : "Items"}</TableHead>
                <TableHead className="text-end">{isRTL ? "القيمة" : "Value"}</TableHead>
                <TableHead className="text-center">{isRTL ? "الحالة" : "Status"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)
              ) : consumptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <PackageMinus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground font-medium">{isRTL ? "لا يوجد استهلاك" : "No consumptions yet"}</p>
                    {canManage && <Button className="mt-3 gap-2" size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />{isRTL ? "استهلاك جديد" : "New Consumption"}</Button>}
                  </TableCell>
                </TableRow>
              ) : (
                consumptions.map((c: any) => {
                  const items = c.internal_consumption_items || [];
                  const totalValue = items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unit_cost || 0), 0);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium font-mono text-sm">{c.consumption_number}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(c.consumption_date)}</TableCell>
                      <TableCell>{c.branches ? (isRTL ? c.branches.name : c.branches.name_en || c.branches.name) : "-"}</TableCell>
                      <TableCell>{c.department || "-"}</TableCell>
                      <TableCell className="text-end tabular-nums">{items.length}</TableCell>
                      <TableCell className="text-end tabular-nums font-medium">{totalValue > 0 ? totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</TableCell>
                      <TableCell className="text-center"><Badge>{isRTL ? "معتمد" : "Approved"}</Badge></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {!isLoading && consumptions.length > 0 && (
            <div className="px-4 py-3 border-t text-sm text-muted-foreground">
              {isRTL ? `إجمالي عمليات الاستهلاك: ${consumptions.length}` : `Total consumptions: ${consumptions.length}`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InternalConsumptions;
