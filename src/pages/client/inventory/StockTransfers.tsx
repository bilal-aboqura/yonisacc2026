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
import { Plus, ArrowRightLeft, Send, PackageCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const StockTransfers = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { can } = useRBAC();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["stock_transfers", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transfers" as any)
        .select("*, from_branch:branches!stock_transfers_from_branch_id_fkey(name, name_en), to_branch:branches!stock_transfers_to_branch_id_fkey(name, name_en)") as any
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
    from_branch_id: "",
    to_branch_id: "",
    notes: "",
    items: [{ product_id: "", quantity_sent: 0, notes: "" }],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const count = transfers.length + 1;
      const num = `TRF-${String(count).padStart(4, "0")}`;

      const { data: transfer, error } = await (supabase
        .from("stock_transfers" as any) as any)
        .insert({
          company_id: companyId,
          transfer_number: num,
          from_branch_id: form.from_branch_id,
          to_branch_id: form.to_branch_id,
          notes: form.notes || null,
          created_by: user?.id,
          status: "draft",
        } as any)
        .select()
        .single();
      if (error) throw error;

      const items = form.items.filter(i => i.product_id && i.quantity_sent > 0).map(i => ({
        transfer_id: transfer.id,
        product_id: i.product_id,
        quantity_sent: i.quantity_sent,
        quantity_received: 0,
        notes: i.notes || null,
      }));

      if (items.length > 0) {
        const { error: itemsError } = await (supabase.from("stock_transfer_items" as any) as any).insert(items);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_transfers"] });
      toast.success(isRTL ? "تم إنشاء التحويل بنجاح" : "Transfer created");
      setCreateOpen(false);
      setForm({ from_branch_id: "", to_branch_id: "", notes: "", items: [{ product_id: "", quantity_sent: 0, notes: "" }] });
    },
    onError: () => toast.error(isRTL ? "حدث خطأ" : "Error"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      if (newStatus === "received") {
        // Get transfer and items
        const { data: transfer } = await (supabase.from("stock_transfers" as any) as any).select("*, stock_transfer_items(*)").eq("id", id).single();
        if (!transfer) throw new Error("Not found");

        // Get warehouses
        const { data: fromWh } = await supabase.from("warehouses").select("id").eq("branch_id", (transfer as any).from_branch_id).eq("company_id", companyId!).single();
        const { data: toWh } = await supabase.from("warehouses").select("id").eq("branch_id", (transfer as any).to_branch_id).eq("company_id", companyId!).single();

        for (const item of (transfer as any).stock_transfer_items || []) {
          const qty = item.quantity_sent;
          // Decrease from source
          const { data: fromStock } = await supabase.from("product_stock").select("*").eq("product_id", item.product_id).eq("warehouse_id", fromWh?.id).single();
          if (fromStock) {
            await supabase.from("product_stock").update({ quantity: (fromStock.quantity || 0) - qty } as any).eq("id", fromStock.id);
          }

          // Increase at destination
          const { data: toStock } = await supabase.from("product_stock").select("*").eq("product_id", item.product_id).eq("warehouse_id", toWh?.id).single();
          if (toStock) {
            await supabase.from("product_stock").update({ quantity: (toStock.quantity || 0) + qty } as any).eq("id", toStock.id);
          } else {
            await supabase.from("product_stock").insert({ product_id: item.product_id, warehouse_id: toWh?.id, quantity: qty } as any);
          }

          // Stock movements
          await supabase.from("stock_movements").insert([
            { company_id: companyId, warehouse_id: fromWh?.id, product_id: item.product_id, movement_type: "transfer_out", quantity: -qty, reference_type: "transfer", reference_id: id, created_by: user?.id },
            { company_id: companyId, warehouse_id: toWh?.id, product_id: item.product_id, movement_type: "transfer_in", quantity: qty, reference_type: "transfer", reference_id: id, created_by: user?.id },
          ] as any);

          // Update received quantity
          await (supabase.from("stock_transfer_items" as any) as any).update({ quantity_received: qty }).eq("id", item.id);
        }
      }

      await (supabase.from("stock_transfers" as any) as any).update({
        status: newStatus,
        ...(newStatus === "received" ? { received_by: user?.id } : {}),
      } as any).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_transfers"] });
      queryClient.invalidateQueries({ queryKey: ["stock-overview"] });
      toast.success(isRTL ? "تم تحديث الحالة بنجاح" : "Status updated");
    },
    onError: () => toast.error(isRTL ? "حدث خطأ" : "Error"),
  });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: "", quantity_sent: 0, notes: "" }] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: any) => {
    setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) }));
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = { draft: "secondary", sent: "outline", received: "default" };
    const labels: Record<string, Record<string, string>> = {
      draft: { ar: "مسودة", en: "Draft" },
      sent: { ar: "تم الإرسال", en: "Sent" },
      received: { ar: "تم الاستلام", en: "Received" },
    };
    return <Badge variant={variants[status] as any}>{isRTL ? labels[status]?.ar : labels[status]?.en || status}</Badge>;
  };

  const canManage = can("MANAGE_TRANSFERS");

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className={cn("flex items-center justify-between flex-wrap gap-4", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <ArrowRightLeft className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{isRTL ? "تحويل بين الفروع" : "Stock Transfers"}</h1>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className={cn("gap-2", isRTL && "flex-row-reverse")}>
            <Plus className="h-4 w-4" />
            {isRTL ? "تحويل جديد" : "New Transfer"}
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
                <TableHead>{isRTL ? "من فرع" : "From"}</TableHead>
                <TableHead>{isRTL ? "إلى فرع" : "To"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                {canManage && <TableHead>{isRTL ? "الإجراءات" : "Actions"}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
              ) : transfers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد تحويلات" : "No transfers"}</TableCell></TableRow>
              ) : (
                transfers.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.transfer_number}</TableCell>
                    <TableCell>{t.transfer_date}</TableCell>
                    <TableCell>{t.from_branch ? (isRTL ? t.from_branch.name : t.from_branch.name_en || t.from_branch.name) : "-"}</TableCell>
                    <TableCell>{t.to_branch ? (isRTL ? t.to_branch.name : t.to_branch.name_en || t.to_branch.name) : "-"}</TableCell>
                    <TableCell>{statusBadge(t.status)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                          {t.status === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: t.id, newStatus: "sent" })} className={cn("gap-1", isRTL && "flex-row-reverse")}>
                              <Send className="h-3 w-3" />
                              {isRTL ? "إرسال" : "Send"}
                            </Button>
                          )}
                          {t.status === "sent" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: t.id, newStatus: "received" })} className={cn("gap-1", isRTL && "flex-row-reverse")}>
                              <PackageCheck className="h-3 w-3" />
                              {isRTL ? "استلام" : "Receive"}
                            </Button>
                          )}
                        </div>
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
            <DialogTitle>{isRTL ? "تحويل مخزون جديد" : "New Stock Transfer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isRTL ? "من فرع" : "From Branch"} *</Label>
                <Select value={form.from_branch_id} onValueChange={v => setForm(f => ({ ...f, from_branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isRTL ? "إلى فرع" : "To Branch"} *</Label>
                <Select value={form.to_branch_id} onValueChange={v => setForm(f => ({ ...f, to_branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    {branches.filter((b: any) => b.id !== form.from_branch_id).map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            <div>
              <div className={cn("flex items-center justify-between mb-2", isRTL && "flex-row-reverse")}>
                <Label className="text-base font-semibold">{isRTL ? "الأصناف" : "Items"}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3" /></Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-7">
                    <Select value={item.product_id} onValueChange={v => updateItem(idx, "product_id", v)}>
                      <SelectTrigger><SelectValue placeholder={isRTL ? "المنتج" : "Product"} /></SelectTrigger>
                      <SelectContent>
                        {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : p.name_en || p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Input type="number" min={0} value={item.quantity_sent} onChange={e => updateItem(idx, "quantity_sent", parseFloat(e.target.value) || 0)} placeholder={isRTL ? "الكمية" : "Qty"} />
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
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.from_branch_id || !form.to_branch_id}>
              {createMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTransfers;
