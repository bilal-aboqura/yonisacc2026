import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, PackageMinus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const InternalConsumptions = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { can } = useRBAC();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: consumptions = [], isLoading } = useQuery({
    queryKey: ["internal_consumptions", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("internal_consumptions" as any) as any)
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
      const { data } = await supabase.from("products").select("id, name, name_en").eq("company_id", companyId!).eq("is_active", true).neq("product_type", "service");
      return data || [];
    },
    enabled: !!companyId,
  });

  const [form, setForm] = useState({
    branch_id: "",
    department: "",
    reason: "",
    notes: "",
    items: [{ product_id: "", quantity: 0, unit_cost: 0, notes: "" }],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const count = consumptions.length + 1;
      const num = `CON-${String(count).padStart(4, "0")}`;

      const { data: consumption, error } = await (supabase
        .from("internal_consumptions" as any) as any)
        .insert({
          company_id: companyId,
          branch_id: form.branch_id,
          consumption_number: num,
          department: form.department || null,
          reason: form.reason || null,
          notes: form.notes || null,
          created_by: user?.id,
          status: "approved",
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Get warehouse
      const { data: warehouse } = await supabase.from("warehouses").select("id").eq("branch_id", form.branch_id).eq("company_id", companyId!).single();

      const validItems = form.items.filter(i => i.product_id && i.quantity > 0);

      if (validItems.length > 0) {
        const items = validItems.map(i => ({
          consumption_id: consumption.id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit_cost: i.unit_cost || 0,
          notes: i.notes || null,
        }));
        await (supabase.from("internal_consumption_items" as any) as any).insert(items);

        // Deduct stock
        for (const item of validItems) {
          const { data: stock } = await supabase.from("product_stock").select("*").eq("product_id", item.product_id).eq("warehouse_id", warehouse?.id).single();
          if (stock) {
            await supabase.from("product_stock").update({ quantity: (stock.quantity || 0) - item.quantity } as any).eq("id", stock.id);
          }
          await supabase.from("stock_movements").insert({
            company_id: companyId,
            warehouse_id: warehouse?.id,
            product_id: item.product_id,
            movement_type: "consumption",
            quantity: -item.quantity,
            unit_cost: item.unit_cost || 0,
            reference_type: "consumption",
            reference_id: consumption.id,
            created_by: user?.id,
            notes: form.reason,
          } as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal_consumptions"] });
      queryClient.invalidateQueries({ queryKey: ["stock-overview"] });
      toast.success(isRTL ? "تم تسجيل الاستهلاك بنجاح" : "Consumption recorded");
      setCreateOpen(false);
      setForm({ branch_id: "", department: "", reason: "", notes: "", items: [{ product_id: "", quantity: 0, unit_cost: 0, notes: "" }] });
    },
    onError: () => toast.error(isRTL ? "حدث خطأ" : "Error"),
  });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: "", quantity: 0, unit_cost: 0, notes: "" }] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: any) => {
    setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) }));
  };

  const canManage = can("MANAGE_CONSUMPTIONS");

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className={cn("flex items-center justify-between flex-wrap gap-4", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <PackageMinus className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{isRTL ? "الاستهلاك الداخلي" : "Internal Consumptions"}</h1>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className={cn("gap-2", isRTL && "flex-row-reverse")}>
            <Plus className="h-4 w-4" />
            {isRTL ? "استهلاك جديد" : "New Consumption"}
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
                <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
                <TableHead>{isRTL ? "القسم" : "Department"}</TableHead>
                <TableHead>{isRTL ? "السبب" : "Reason"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
              ) : consumptions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا يوجد استهلاك" : "No consumptions"}</TableCell></TableRow>
              ) : (
                consumptions.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.consumption_number}</TableCell>
                    <TableCell>{c.consumption_date}</TableCell>
                    <TableCell>{c.branches ? (isRTL ? c.branches.name : c.branches.name_en || c.branches.name) : "-"}</TableCell>
                    <TableCell>{c.department || "-"}</TableCell>
                    <TableCell>{c.reason || "-"}</TableCell>
                    <TableCell><Badge>{isRTL ? "معتمد" : "Approved"}</Badge></TableCell>
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
            <DialogTitle>{isRTL ? "استهلاك داخلي جديد" : "New Internal Consumption"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isRTL ? "الفرع" : "Branch"} *</Label>
                <Select value={form.branch_id} onValueChange={v => setForm(f => ({ ...f, branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isRTL ? "القسم" : "Department"}</Label>
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>{isRTL ? "السبب" : "Reason"}</Label>
              <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>

            <div>
              <div className={cn("flex items-center justify-between mb-2", isRTL && "flex-row-reverse")}>
                <Label className="text-base font-semibold">{isRTL ? "الأصناف" : "Items"}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3" /></Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-5">
                    <Select value={item.product_id} onValueChange={v => updateItem(idx, "product_id", v)}>
                      <SelectTrigger><SelectValue placeholder={isRTL ? "المنتج" : "Product"} /></SelectTrigger>
                      <SelectContent>
                        {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : p.name_en || p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min={0} value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} placeholder={isRTL ? "الكمية" : "Qty"} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min={0} value={item.unit_cost} onChange={e => updateItem(idx, "unit_cost", parseFloat(e.target.value) || 0)} placeholder={isRTL ? "التكلفة" : "Cost"} />
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
              {createMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ وخصم" : "Save & Deduct")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InternalConsumptions;
