import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useRBAC } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ClipboardCheck, Eye, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const StockAdjustments = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { can } = useRBAC();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ["stock_adjustments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_adjustments" as any)
        .select("*, branches(name, name_en)")
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

  // Create form state
  const [form, setForm] = useState({
    branch_id: "",
    adjustment_type: "increase",
    adjustment_date: new Date().toISOString().split("T")[0],
    reason: "",
    notes: "",
    items: [{ product_id: "", quantity: 0, unit_cost: 0, notes: "" }],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Generate number
      const count = adjustments.length + 1;
      const adjNumber = `ADJ-${String(count).padStart(4, "0")}`;

      const { data: adj, error } = await (supabase
        .from("stock_adjustments" as any) as any)
        .insert({
          company_id: companyId,
          branch_id: form.branch_id,
          adjustment_number: adjNumber,
          adjustment_type: form.adjustment_type,
          adjustment_date: form.adjustment_date,
          reason: form.reason || null,
          notes: form.notes || null,
          created_by: user?.id,
          status: "draft",
        } as any)
        .select()
        .single();
      if (error) throw error;

      const items = form.items.filter(i => i.product_id && i.quantity > 0).map(i => ({
        adjustment_id: adj.id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_cost: i.unit_cost || 0,
        notes: i.notes || null,
      }));

      if (items.length > 0) {
        const { error: itemsError } = await (supabase.from("stock_adjustment_items" as any) as any).insert(items);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_adjustments"] });
      toast.success(isRTL ? "تم إنشاء التسوية بنجاح" : "Adjustment created successfully");
      setCreateOpen(false);
      setForm({ branch_id: "", adjustment_type: "increase", adjustment_date: new Date().toISOString().split("T")[0], reason: "", notes: "", items: [{ product_id: "", quantity: 0, unit_cost: 0, notes: "" }] });
    },
    onError: () => toast.error(isRTL ? "حدث خطأ" : "Error creating adjustment"),
  });

  const approveMutation = useMutation({
    mutationFn: async (adjId: string) => {
      // Get adjustment and items
      const { data: adj } = await (supabase.from("stock_adjustments" as any) as any).select("*, stock_adjustment_items(*)").eq("id", adjId).single();
      if (!adj) throw new Error("Not found");

      // Get warehouse for this branch
      const { data: warehouse } = await supabase.from("warehouses").select("id").eq("branch_id", adj.branch_id).eq("company_id", companyId!).single();
      if (!warehouse) throw new Error("No warehouse for branch");

      // Update stock for each item
      for (const item of (adj as any).stock_adjustment_items || []) {
        const multiplier = adj.adjustment_type === "increase" ? 1 : -1;
        const qty = item.quantity * multiplier;

        // Upsert product_stock
        const { data: existing } = await supabase.from("product_stock").select("*").eq("product_id", item.product_id).eq("warehouse_id", warehouse.id).single();

        if (existing) {
          await supabase.from("product_stock").update({
            quantity: (existing.quantity || 0) + qty,
          } as any).eq("id", existing.id);
        } else {
          await supabase.from("product_stock").insert({
            product_id: item.product_id,
            warehouse_id: warehouse.id,
            quantity: Math.max(0, qty),
          } as any);
        }

        // Record stock movement
        await supabase.from("stock_movements").insert({
          company_id: companyId,
          warehouse_id: warehouse.id,
          product_id: item.product_id,
          movement_type: adj.adjustment_type === "increase" ? "adjustment_in" : "adjustment_out",
          quantity: qty,
          unit_cost: item.unit_cost || 0,
          reference_type: "adjustment",
          reference_id: adjId,
          created_by: user?.id,
          notes: adj.reason,
        } as any);
      }

      // Mark as approved
      await (supabase.from("stock_adjustments" as any) as any).update({
        status: "approved",
        approved_by: user?.id,
      } as any).eq("id", adjId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["stock-overview"] });
      toast.success(isRTL ? "تم اعتماد التسوية وتحديث المخزون" : "Adjustment approved and stock updated");
    },
    onError: () => toast.error(isRTL ? "حدث خطأ أثناء الاعتماد" : "Error approving"),
  });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: "", quantity: 0, unit_cost: 0, notes: "" }] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: any) => {
    setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) }));
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { draft: "secondary", approved: "default" };
    const labels: Record<string, Record<string, string>> = {
      draft: { ar: "مسودة", en: "Draft" },
      approved: { ar: "معتمد", en: "Approved" },
    };
    return <Badge variant={map[status] as any || "secondary"}>{isRTL ? labels[status]?.ar : labels[status]?.en || status}</Badge>;
  };

  const canManage = can("MANAGE_ADJUSTMENTS");
  const canApprove = can("APPROVE_ADJUSTMENTS");

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className={cn("flex items-center justify-between flex-wrap gap-4", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{isRTL ? "تسوية المخزون" : "Stock Adjustments"}</h1>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className={cn("gap-2", isRTL && "flex-row-reverse")}>
            <Plus className="h-4 w-4" />
            {isRTL ? "تسوية جديدة" : "New Adjustment"}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الرقم" : "Number"}</TableHead>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
                <TableHead>{isRTL ? "السبب" : "Reason"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                {canApprove && <TableHead>{isRTL ? "الإجراءات" : "Actions"}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
              ) : adjustments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد تسويات" : "No adjustments"}</TableCell></TableRow>
              ) : (
                adjustments.map((adj: any) => (
                  <TableRow key={adj.id}>
                    <TableCell className="font-medium">{adj.adjustment_number}</TableCell>
                    <TableCell>{adj.adjustment_date}</TableCell>
                    <TableCell>
                      <Badge variant={adj.adjustment_type === "increase" ? "default" : "destructive"}>
                        {adj.adjustment_type === "increase" ? (isRTL ? "زيادة" : "Increase") : (isRTL ? "نقص" : "Decrease")}
                      </Badge>
                    </TableCell>
                    <TableCell>{adj.branches ? (isRTL ? adj.branches.name : adj.branches.name_en || adj.branches.name) : "-"}</TableCell>
                    <TableCell>{adj.reason || "-"}</TableCell>
                    <TableCell>{statusBadge(adj.status)}</TableCell>
                    {canApprove && (
                      <TableCell>
                        {adj.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(adj.id)} disabled={approveMutation.isPending} className={cn("gap-1", isRTL && "flex-row-reverse")}>
                            <Check className="h-4 w-4" />
                            {isRTL ? "اعتماد" : "Approve"}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تسوية مخزون جديدة" : "New Stock Adjustment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isRTL ? "الفرع" : "Branch"} *</Label>
                <Select value={form.branch_id} onValueChange={v => setForm(f => ({ ...f, branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الفرع" : "Select branch"} /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}
                  </SelectContent>
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
            </div>
            <div>
              <Label>{isRTL ? "تاريخ التسوية" : "Adjustment Date"} *</Label>
              <Input type="date" value={form.adjustment_date} onChange={e => setForm(f => ({ ...f, adjustment_date: e.target.value }))} />
            </div>
            <div>
              <Label>{isRTL ? "السبب" : "Reason"}</Label>
              <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div>
              <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            {/* Items */}
            <div>
              <div className={cn("flex items-center justify-between mb-2", isRTL && "flex-row-reverse")}>
                <Label className="text-base font-semibold">{isRTL ? "الأصناف" : "Items"}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className={cn("gap-1", isRTL && "flex-row-reverse")}>
                  <Plus className="h-3 w-3" />
                  {isRTL ? "إضافة صنف" : "Add Item"}
                </Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className={cn("grid grid-cols-12 gap-2 mb-2 items-end", isRTL && "flex-row-reverse")}>
                  <div className="col-span-5">
                    {idx === 0 && <Label className="text-xs">{isRTL ? "المنتج" : "Product"}</Label>}
                    <Select value={item.product_id} onValueChange={v => updateItem(idx, "product_id", v)}>
                      <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                      <SelectContent>
                        {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : p.name_en || p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    {idx === 0 && <Label className="text-xs">{isRTL ? "الكمية" : "Quantity"}</Label>}
                    <Input type="number" min={0} value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3">
                    {idx === 0 && <Label className="text-xs">{isRTL ? "التكلفة" : "Unit Cost"}</Label>}
                    <Input type="number" min={0} value={item.unit_cost} onChange={e => updateItem(idx, "unit_cost", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(idx)} disabled={form.items.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className={cn(isRTL && "flex-row-reverse")}>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.branch_id}>
              {createMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockAdjustments;
