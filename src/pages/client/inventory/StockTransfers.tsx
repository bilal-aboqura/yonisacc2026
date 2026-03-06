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
import { Plus, ArrowRightLeft, Send, PackageCheck, Trash2, ArrowLeft, ArrowRight, FileEdit, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import InventoryStatCard from "@/components/inventory/InventoryStatCard";

const StockTransfers = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { can } = useRBAC();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["stock_transfers", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transfers" as any)
        .select("*, from_branch:branches!stock_transfers_from_branch_id_fkey(name, name_en), to_branch:branches!stock_transfers_to_branch_id_fkey(name, name_en), stock_transfer_items(quantity_sent)")
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
    from_branch_id: "", to_branch_id: "", transfer_date: new Date().toISOString().split("T")[0],
    notes: "", items: [{ product_id: "", quantity_sent: 0, notes: "" }],
  });
  const resetForm = () => setForm({ from_branch_id: "", to_branch_id: "", transfer_date: new Date().toISOString().split("T")[0], notes: "", items: [{ product_id: "", quantity_sent: 0, notes: "" }] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const count = transfers.length + 1;
      const num = `TRF-${String(count).padStart(4, "0")}`;
      const { data: transfer, error } = await (supabase.from("stock_transfers" as any) as any)
        .insert({ company_id: companyId, transfer_number: num, from_branch_id: form.from_branch_id, to_branch_id: form.to_branch_id, transfer_date: form.transfer_date, notes: form.notes || null, created_by: user?.id, status: "draft" } as any).select().single();
      if (error) throw error;
      const items = form.items.filter(i => i.product_id && i.quantity_sent > 0).map(i => ({ transfer_id: transfer.id, product_id: i.product_id, quantity_sent: i.quantity_sent, quantity_received: 0, notes: i.notes || null }));
      if (items.length > 0) { const { error: itemsError } = await (supabase.from("stock_transfer_items" as any) as any).insert(items); if (itemsError) throw itemsError; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stock_transfers"] }); toast.success(isRTL ? "تم إنشاء التحويل بنجاح" : "Transfer created"); setShowForm(false); resetForm(); },
    onError: () => toast.error(isRTL ? "حدث خطأ" : "Error"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      if (newStatus === "received") {
        const { data, error } = await (supabase.rpc as any)("rpc_inventory_transfer", { p_company_id: companyId!, p_transfer_id: id, p_received_by: user?.id } as any);
        if (error) throw error; return data;
      } else {
        await (supabase.from("stock_transfers" as any) as any).update({ status: newStatus } as any).eq("id", id);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stock_transfers"] }); queryClient.invalidateQueries({ queryKey: ["stock-overview"] }); toast.success(isRTL ? "تم تحديث الحالة بنجاح" : "Status updated"); },
    onError: (err: any) => toast.error(err?.message?.includes("Insufficient") ? (isRTL ? "الرصيد غير كافي في المصدر" : "Insufficient stock at source") : (isRTL ? "حدث خطأ" : "Error")),
  });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: "", quantity_sent: 0, notes: "" }] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: any) => setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) }));

  const canManage = can("MANAGE_TRANSFERS");
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";

  const stats = useMemo(() => {
    const drafts = transfers.filter((t: any) => t.status === "draft").length;
    const sent = transfers.filter((t: any) => t.status === "sent").length;
    const received = transfers.filter((t: any) => t.status === "received").length;
    return { total: transfers.length, drafts, sent, received };
  }, [transfers]);

  if (showForm) {
    return (
      <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}><ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} /></Button>
          <ArrowRightLeft className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{isRTL ? "تحويل مخزون جديد" : "New Stock Transfer"}</h1>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{isRTL ? "من فرع" : "From Branch"} *</Label>
                <Select value={form.from_branch_id} onValueChange={v => setForm(f => ({ ...f, from_branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isRTL ? "إلى فرع" : "To Branch"} *</Label>
                <Select value={form.to_branch_id} onValueChange={v => setForm(f => ({ ...f, to_branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>{branches.filter((b: any) => b.id !== form.from_branch_id).map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isRTL ? "تاريخ التحويل" : "Transfer Date"} *</Label>
                <Input type="date" value={form.transfer_date} onChange={e => setForm(f => ({ ...f, transfer_date: e.target.value }))} />
              </div>
            </div>
            <div><Label>{isRTL ? "ملاحظات" : "Notes"}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div>
              <div className={cn("flex items-center justify-between mb-3", isRTL && "flex-row-reverse")}>
                <Label className="text-base font-semibold">{isRTL ? "الأصناف" : "Items"}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1"><Plus className="h-3 w-3" />{isRTL ? "إضافة" : "Add"}</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>{isRTL ? "المنتج" : "Product"}</TableHead><TableHead className="text-end">{isRTL ? "الكمية" : "Quantity"}</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {form.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select value={item.product_id} onValueChange={v => updateItem(idx, "product_id", v)}>
                            <SelectTrigger><SelectValue placeholder={isRTL ? "المنتج" : "Product"} /></SelectTrigger>
                            <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : p.name_en || p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input type="number" min={0} value={item.quantity_sent} onChange={e => updateItem(idx, "quantity_sent", parseFloat(e.target.value) || 0)} className="w-28 text-end tabular-nums" /></TableCell>
                        <TableCell><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeItem(idx)} disabled={form.items.length <= 1}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className={cn("flex gap-3 pt-4", isRTL ? "flex-row-reverse" : "")}>
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.from_branch_id || !form.to_branch_id}>
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
            <ArrowRightLeft className="h-7 w-7 text-primary" />
            {isRTL ? "تحويل بين الفروع" : "Stock Transfers"}
          </h1>
          <p className="text-muted-foreground mt-1">{isRTL ? "إدارة تحويلات المخزون بين الفروع" : "Manage stock transfers between branches"}</p>
        </div>
        {canManage && <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" />{isRTL ? "تحويل جديد" : "New Transfer"}</Button>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-[88px] rounded-lg" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InventoryStatCard icon={ArrowRightLeft} title={isRTL ? "إجمالي التحويلات" : "Total Transfers"} value={stats.total} />
          <InventoryStatCard icon={FileEdit} title={isRTL ? "مسودة" : "Drafts"} value={stats.drafts} variant={stats.drafts > 0 ? "warning" : "default"} />
          <InventoryStatCard icon={Clock} title={isRTL ? "تم الإرسال" : "Sent"} value={stats.sent} variant={stats.sent > 0 ? "warning" : "default"} />
          <InventoryStatCard icon={CheckCircle2} title={isRTL ? "تم الاستلام" : "Received"} value={stats.received} variant="success" />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الرقم" : "Number"}</TableHead>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRTL ? "من → إلى" : "From → To"}</TableHead>
                <TableHead className="text-end">{isRTL ? "الأصناف" : "Items"}</TableHead>
                <TableHead className="text-center">{isRTL ? "الحالة" : "Status"}</TableHead>
                {canManage && <TableHead className="text-center">{isRTL ? "الإجراءات" : "Actions"}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <ArrowRightLeft className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground font-medium">{isRTL ? "لا توجد تحويلات" : "No transfers yet"}</p>
                    {canManage && <Button className="mt-3 gap-2" size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />{isRTL ? "تحويل جديد" : "New Transfer"}</Button>}
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((t: any) => {
                  const fromName = t.from_branch ? (isRTL ? t.from_branch.name : t.from_branch.name_en || t.from_branch.name) : "-";
                  const toName = t.to_branch ? (isRTL ? t.to_branch.name : t.to_branch.name_en || t.to_branch.name) : "-";
                  const itemCount = (t.stock_transfer_items || []).length;
                  const statusVariants: Record<string, any> = { draft: "secondary", sent: "outline", received: "default" };
                  const statusLabels: Record<string, string> = { draft: isRTL ? "مسودة" : "Draft", sent: isRTL ? "تم الإرسال" : "Sent", received: isRTL ? "تم الاستلام" : "Received" };
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium font-mono text-sm">{t.transfer_number}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(t.transfer_date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{fromName}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{toName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{itemCount}</TableCell>
                      <TableCell className="text-center"><Badge variant={statusVariants[t.status]}>{statusLabels[t.status] || t.status}</Badge></TableCell>
                      {canManage && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {t.status === "draft" && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: t.id, newStatus: "sent" })} className="gap-1 text-primary border-primary/30 hover:bg-primary/5">
                                <Send className="h-3 w-3" />{isRTL ? "إرسال" : "Send"}
                              </Button>
                            )}
                            {t.status === "sent" && (
                              <Button size="sm" onClick={() => updateStatus.mutate({ id: t.id, newStatus: "received" })} className="gap-1">
                                <PackageCheck className="h-3 w-3" />{isRTL ? "استلام" : "Receive"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {!isLoading && transfers.length > 0 && (
            <div className="px-4 py-3 border-t text-sm text-muted-foreground">
              {isRTL ? `إجمالي التحويلات: ${transfers.length}` : `Total transfers: ${transfers.length}`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockTransfers;
