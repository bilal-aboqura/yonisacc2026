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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, ClipboardCheck, Trash2, ArrowLeft, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import InventoryStatCard from "@/components/inventory/InventoryStatCard";

const StockAdjustments = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { can } = useRBAC();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ["stock_adjustments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_adjustments" as any)
        .select("*, branches(name, name_en), stock_adjustment_items(quantity, unit_cost)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-stock", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, name_en, sku").eq("company_id", companyId!).eq("is_active", true).neq("product_type", "service");
      return data || [];
    },
    enabled: !!companyId,
  });

  const [form, setForm] = useState({
    branch_id: "", adjustment_type: "increase", adjustment_date: new Date().toISOString().split("T")[0],
    reason: "", notes: "", items: [{ product_id: "", quantity: 0, unit_cost: 0, notes: "" }],
  });

  const resetForm = () => setForm({ branch_id: "", adjustment_type: "increase", adjustment_date: new Date().toISOString().split("T")[0], reason: "", notes: "", items: [{ product_id: "", quantity: 0, unit_cost: 0, notes: "" }] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const validItems = form.items.filter(i => i.product_id && i.quantity > 0);
      if (validItems.length === 0) throw new Error("No valid items");
      const { data, error } = await (supabase.rpc as any)("rpc_inventory_adjustment", {
        p_company_id: companyId!, p_branch_id: form.branch_id, p_adjustment_type: form.adjustment_type,
        p_adjustment_date: form.adjustment_date, p_reason: form.reason || null, p_notes: form.notes || null,
        p_items: validItems.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost || 0, notes: i.notes || null })),
        p_created_by: user?.id,
      } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["stock-overview"] });
      toast.success(isRTL ? "تم إنشاء واعتماد التسوية بنجاح" : "Adjustment created and approved");
      setShowForm(false); resetForm();
    },
    onError: (err: any) => toast.error(err?.message?.includes("Insufficient") ? (isRTL ? "الرصيد غير كافي" : "Insufficient stock") : (isRTL ? "حدث خطأ" : "Error creating adjustment")),
  });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: "", quantity: 0, unit_cost: 0, notes: "" }] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: any) => setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) }));

  const canManage = can("MANAGE_ADJUSTMENTS");
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";

  // Stats
  const stats = useMemo(() => {
    const increases = adjustments.filter((a: any) => a.adjustment_type === "increase").length;
    const decreases = adjustments.filter((a: any) => a.adjustment_type === "decrease").length;
    const lastDate = adjustments.length > 0 ? formatDate((adjustments[0] as any).adjustment_date) : "-";
    return { total: adjustments.length, increases, decreases, lastDate };
  }, [adjustments]);

  const formTotals = useMemo(() => {
    const totalQty = form.items.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalCost = form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_cost || 0), 0);
    return { totalQty, totalCost };
  }, [form.items]);

  if (showForm) {
    return (
      <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}>
            <ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
          </Button>
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{isRTL ? "تسوية مخزون جديدة" : "New Stock Adjustment"}</h1>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{isRTL ? "الفرع" : "Branch"} *</Label>
                <Select value={form.branch_id} onValueChange={v => setForm(f => ({ ...f, branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الفرع" : "Select branch"} /></SelectTrigger>
                  <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isRTL ? "نوع التسوية" : "Adjustment Type"} *</Label>
                <Select value={form.adjustment_type} onValueChange={v => setForm(f => ({ ...f, adjustment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">{isRTL ? "زيادة" : "Increase"}</SelectItem>
                    <SelectItem value="decrease">{isRTL ? "نقص" : "Decrease"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isRTL ? "تاريخ التسوية" : "Adjustment Date"} *</Label>
                <Input type="date" value={form.adjustment_date} onChange={e => setForm(f => ({ ...f, adjustment_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>{isRTL ? "السبب" : "Reason"}</Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
              <div><Label>{isRTL ? "ملاحظات" : "Notes"}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={1} /></div>
            </div>
            <div>
              <div className={cn("flex items-center justify-between mb-3", isRTL && "flex-row-reverse")}>
                <Label className="text-base font-semibold">{isRTL ? "الأصناف" : "Items"}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1"><Plus className="h-3 w-3" />{isRTL ? "إضافة صنف" : "Add Item"}</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                      <TableHead className="text-end">{isRTL ? "الكمية" : "Quantity"}</TableHead>
                      <TableHead className="text-end">{isRTL ? "التكلفة" : "Unit Cost"}</TableHead>
                      <TableHead className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select value={item.product_id} onValueChange={v => updateItem(idx, "product_id", v)}>
                            <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                            <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : p.name_en || p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
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
                {createMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
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
            <ClipboardCheck className="h-7 w-7 text-primary" />
            {isRTL ? "تسوية المخزون" : "Stock Adjustments"}
          </h1>
          <p className="text-muted-foreground mt-1">{isRTL ? "إدارة تسويات الزيادة والنقص في المخزون" : "Manage stock increase and decrease adjustments"}</p>
        </div>
        {canManage && <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" />{isRTL ? "تسوية جديدة" : "New Adjustment"}</Button>}
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-[88px] rounded-lg" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InventoryStatCard icon={ClipboardCheck} title={isRTL ? "إجمالي التسويات" : "Total Adjustments"} value={stats.total} />
          <InventoryStatCard icon={TrendingUp} title={isRTL ? "زيادات" : "Increases"} value={stats.increases} variant="success" />
          <InventoryStatCard icon={TrendingDown} title={isRTL ? "نقص" : "Decreases"} value={stats.decreases} variant="danger" />
          <InventoryStatCard icon={Calendar} title={isRTL ? "آخر تسوية" : "Last Adjustment"} value={stats.lastDate} />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الرقم" : "Number"}</TableHead>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
                <TableHead className="text-end">{isRTL ? "الأصناف" : "Items"}</TableHead>
                <TableHead className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableHead>
                <TableHead>{isRTL ? "السبب" : "Reason"}</TableHead>
                <TableHead className="text-center">{isRTL ? "الحالة" : "Status"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)
              ) : adjustments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground font-medium">{isRTL ? "لا توجد تسويات" : "No adjustments yet"}</p>
                    {canManage && <Button className="mt-3 gap-2" size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />{isRTL ? "تسوية جديدة" : "New Adjustment"}</Button>}
                  </TableCell>
                </TableRow>
              ) : (
                adjustments.map((adj: any) => {
                  const items = adj.stock_adjustment_items || [];
                  const itemCount = items.length;
                  const totalValue = items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unit_cost || 0), 0);
                  return (
                    <TableRow key={adj.id}>
                      <TableCell className="font-medium font-mono text-sm">{adj.adjustment_number}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(adj.adjustment_date)}</TableCell>
                      <TableCell>
                        <Badge variant={adj.adjustment_type === "increase" ? "default" : "destructive"}>
                          {adj.adjustment_type === "increase" ? (isRTL ? "زيادة" : "Increase") : (isRTL ? "نقص" : "Decrease")}
                        </Badge>
                      </TableCell>
                      <TableCell>{adj.branches ? (isRTL ? adj.branches.name : adj.branches.name_en || adj.branches.name) : "-"}</TableCell>
                      <TableCell className="text-end tabular-nums">{itemCount}</TableCell>
                      <TableCell className="text-end tabular-nums font-medium">{totalValue > 0 ? totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{adj.reason || "-"}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{isRTL ? "معتمد" : "Approved"}</Badge></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {!isLoading && adjustments.length > 0 && (
            <div className="px-4 py-3 border-t text-sm text-muted-foreground">
              {isRTL ? `إجمالي التسويات: ${adjustments.length}` : `Total adjustments: ${adjustments.length}`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockAdjustments;
