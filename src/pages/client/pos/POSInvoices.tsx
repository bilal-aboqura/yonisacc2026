import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportToExcel } from "@/lib/exportUtils";
import { FileSpreadsheet, Receipt, Eye, RotateCcw, Printer } from "lucide-react";

const POSInvoices = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewTx, setViewTx] = useState<any>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [returnDialog, setReturnDialog] = useState(false);
  const [returnTx, setReturnTx] = useState<any>(null);

  const { data: branches } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: posUsers } = useQuery({
    queryKey: ["pos-users-map", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("pos_users" as any).select("user_id, display_name").eq("company_id", companyId!);
      const map: Record<string, string> = {};
      (data || []).forEach((u: any) => { map[u.user_id] = u.display_name; });
      return map;
    },
    enabled: !!companyId,
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["pos-invoices", companyId, dateFrom, dateTo, filterBranch, filterUser, filterStatus],
    queryFn: async () => {
      let query = supabase.from("pos_transactions" as any)
        .select("*, branches!pos_transactions_branch_id_fkey(name, name_en)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });

      if (filterBranch !== "all") query = query.eq("branch_id", filterBranch);
      if (filterUser !== "all") query = query.eq("created_by", filterUser);
      if (filterStatus !== "all") query = query.eq("status", filterStatus);
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");

      const { data } = await query.limit(500);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const viewInvoice = async (tx: any) => {
    setViewTx(tx);
    const { data } = await supabase.from("pos_transaction_items" as any)
      .select("*, products:product_id(name, name_en)")
      .eq("transaction_id", tx.id);
    setViewItems((data || []) as any[]);
  };

  // Refund mutation
  const refundMutation = useMutation({
    mutationFn: async (tx: any) => {
      // Create refund transaction
      const { data: lastTx } = await supabase.from("pos_transactions" as any)
        .select("transaction_number").eq("company_id", companyId!)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const lastNum = lastTx ? parseInt((lastTx as any).transaction_number?.replace("POS-", "") || "0") : 0;
      const txNumber = `POS-${String(lastNum + 1).padStart(6, "0")}`;

      const { error } = await supabase.from("pos_transactions" as any).insert({
        company_id: companyId,
        branch_id: tx.branch_id,
        session_id: tx.session_id,
        terminal_id: tx.terminal_id,
        transaction_number: txNumber,
        subtotal: -tx.subtotal,
        discount_amount: -tx.discount_amount,
        tax_amount: -tx.tax_amount,
        total: -tx.total,
        payment_method: tx.payment_method,
        paid_amount: -tx.total,
        change_amount: 0,
        order_type: tx.order_type,
        created_by: tx.created_by,
        status: "refunded",
      } as any);
      if (error) throw error;

      // Mark original as refunded
      await supabase.from("pos_transactions" as any)
        .update({ status: "refunded" } as any).eq("id", tx.id);

      // Reverse stock movements - restore quantities
      const { data: items } = await supabase.from("pos_transaction_items" as any)
        .select("*").eq("transaction_id", tx.id);
      if (items) {
        for (const item of items as any[]) {
          if (item.product_id) {
            // Get warehouse for branch
            const { data: wh } = await supabase.from("warehouses")
              .select("id").eq("branch_id", tx.branch_id).limit(1).maybeSingle();
            if (wh) {
              // Add back to stock
              const { data: currentStock } = await (supabase.from as any)("warehouse_stock")
                .select("*").eq("warehouse_id", wh.id).eq("product_id", item.product_id).maybeSingle();
              if (currentStock) {
                await (supabase.from as any)("warehouse_stock").update({
                  quantity: (currentStock.quantity || 0) + item.quantity
                }).eq("id", currentStock.id);
              }
              // Record stock movement
              await supabase.from("stock_movements").insert({
                company_id: companyId!,
                product_id: item.product_id,
                warehouse_id: wh.id,
                movement_type: "pos_return" as any,
                quantity: item.quantity,
                reference_type: "pos_refund",
                reference_id: tx.id,
                notes: `POS Return: ${tx.transaction_number}`,
              });
            }
          }
        }
      }

      return txNumber;
    },
    onSuccess: (txNumber) => {
      toast.success(isRTL ? `تم المرتجع - ${txNumber}` : `Refund completed - ${txNumber}`);
      setReturnDialog(false);
      setReturnTx(null);
      queryClient.invalidateQueries({ queryKey: ["pos-invoices"] });
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const handleExport = () => {
    if (!transactions?.length) return;
    exportToExcel({
      filename: `POS_Invoices_${format(new Date(), "yyyy-MM-dd")}`,
      columns: [
        { header: isRTL ? "رقم الفاتورة" : "Invoice #", key: "transaction_number", format: "text" },
        { header: isRTL ? "التاريخ" : "Date", key: "date", format: "text" },
        { header: isRTL ? "الفرع" : "Branch", key: "branch", format: "text" },
        { header: isRTL ? "المستخدم" : "User", key: "user", format: "text" },
        { header: isRTL ? "طريقة الدفع" : "Payment", key: "payment_method", format: "text" },
        { header: isRTL ? "المجموع الفرعي" : "Subtotal", key: "subtotal", format: "number" },
        { header: isRTL ? "الخصم" : "Discount", key: "discount_amount", format: "number" },
        { header: isRTL ? "الضريبة" : "Tax", key: "tax_amount", format: "number" },
        { header: isRTL ? "الإجمالي" : "Total", key: "total", format: "number" },
        { header: isRTL ? "الحالة" : "Status", key: "status", format: "text" },
      ],
      rows: transactions.map((t: any) => ({
        transaction_number: t.transaction_number,
        date: format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
        branch: isRTL ? t.branches?.name : t.branches?.name_en || t.branches?.name,
        user: posUsers?.[t.created_by] || t.created_by?.slice(0, 8) || "-",
        payment_method: t.payment_method,
        subtotal: Math.abs(t.subtotal),
        discount_amount: Math.abs(t.discount_amount),
        tax_amount: Math.abs(t.tax_amount),
        total: Math.abs(t.total),
        status: t.status,
      })),
      totals: {
        transaction_number: isRTL ? "الإجمالي" : "Total",
        subtotal: transactions.reduce((s: number, t: any) => s + t.subtotal, 0),
        discount_amount: transactions.reduce((s: number, t: any) => s + t.discount_amount, 0),
        tax_amount: transactions.reduce((s: number, t: any) => s + t.tax_amount, 0),
        total: transactions.reduce((s: number, t: any) => s + t.total, 0),
      },
    });
  };

  const statusBadge = (status: string) => {
    if (status === "completed") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">{isRTL ? "مكتملة" : "Completed"}</Badge>;
    if (status === "refunded") return <Badge variant="destructive">{isRTL ? "مرتجعة" : "Refunded"}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const uniqueUsers = [...new Set((transactions || []).map((t: any) => t.created_by).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "فواتير نقاط البيع" : "POS Invoices"}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? "عرض وتصدير فواتير نقاط البيع" : "View and export POS invoices"}</p>
        </div>
        <Button onClick={handleExport} disabled={!transactions?.length} variant="outline">
          <FileSpreadsheet className="h-4 w-4 me-2" />
          {isRTL ? "تصدير Excel" : "Export Excel"}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <Label>{isRTL ? "من تاريخ" : "From"}</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>{isRTL ? "إلى تاريخ" : "To"}</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div>
            <Label>{isRTL ? "الفرع" : "Branch"}</Label>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
                {branches?.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isRTL ? "المستخدم" : "User"}</Label>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
                {uniqueUsers.map((uid: string) => (
                  <SelectItem key={uid} value={uid}>{posUsers?.[uid] || uid.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isRTL ? "الحالة" : "Status"}</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
                <SelectItem value="completed">{isRTL ? "مكتملة" : "Completed"}</SelectItem>
                <SelectItem value="refunded">{isRTL ? "مرتجعة" : "Refunded"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      {transactions && transactions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">{isRTL ? "عدد الفواتير" : "Total Invoices"}</p>
            <p className="text-2xl font-bold">{transactions.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي المبيعات" : "Total Sales"}</p>
            <p className="text-2xl font-bold text-emerald-600">
              {transactions.filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + t.total, 0).toFixed(2)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي المرتجعات" : "Total Returns"}</p>
            <p className="text-2xl font-bold text-destructive">
              {Math.abs(transactions.filter((t: any) => t.status === "refunded").reduce((s: number, t: any) => s + t.total, 0)).toFixed(2)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">{isRTL ? "صافي المبيعات" : "Net Sales"}</p>
            <p className="text-2xl font-bold text-primary">
              {transactions.reduce((s: number, t: any) => s + t.total, 0).toFixed(2)}
            </p>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <ScrollArea className="max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
                <TableHead>{isRTL ? "المستخدم" : "User"}</TableHead>
                <TableHead>{isRTL ? "طريقة الدفع" : "Payment"}</TableHead>
                <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(transactions || []).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">{t.transaction_number}</TableCell>
                  <TableCell className="text-xs">{format(new Date(t.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                  <TableCell>{isRTL ? t.branches?.name : t.branches?.name_en || t.branches?.name}</TableCell>
                  <TableCell>{posUsers?.[t.created_by] || t.created_by?.slice(0, 8) || "-"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{t.payment_method}</Badge></TableCell>
                  <TableCell className="font-bold">{Math.abs(t.total).toFixed(2)}</TableCell>
                  <TableCell>{statusBadge(t.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewInvoice(t)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {t.status === "completed" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { setReturnTx(t); setReturnDialog(true); }}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(transactions || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {isRTL ? "لا توجد فواتير" : "No invoices found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewTx} onOpenChange={(open) => { if (!open) setViewTx(null); }}>
        <DialogContent className="sm:max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تفاصيل الفاتورة" : "Invoice Details"} - {viewTx?.transaction_number}</DialogTitle>
          </DialogHeader>
          {viewTx && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg">
                <div><span className="text-muted-foreground">{isRTL ? "التاريخ" : "Date"}</span><p className="font-medium">{format(new Date(viewTx.created_at), "yyyy-MM-dd HH:mm")}</p></div>
                <div><span className="text-muted-foreground">{isRTL ? "طريقة الدفع" : "Payment"}</span><p className="font-medium capitalize">{viewTx.payment_method}</p></div>
                <div><span className="text-muted-foreground">{isRTL ? "المستخدم" : "User"}</span><p className="font-medium">{posUsers?.[viewTx.created_by] || "-"}</p></div>
                <div><span className="text-muted-foreground">{isRTL ? "الحالة" : "Status"}</span>{statusBadge(viewTx.status)}</div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                    <TableHead>{isRTL ? "الكمية" : "Qty"}</TableHead>
                    <TableHead>{isRTL ? "السعر" : "Price"}</TableHead>
                    <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{isRTL ? item.products?.name : item.products?.name_en || item.products?.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit_price?.toFixed(2)}</TableCell>
                      <TableCell className="font-bold">{item.total?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-1 border-t pt-2">
                <div className="flex justify-between"><span>{isRTL ? "المجموع الفرعي" : "Subtotal"}</span><span>{Math.abs(viewTx.subtotal).toFixed(2)}</span></div>
                {viewTx.discount_amount > 0 && <div className="flex justify-between"><span>{isRTL ? "الخصم" : "Discount"}</span><span>-{viewTx.discount_amount.toFixed(2)}</span></div>}
                <div className="flex justify-between"><span>{isRTL ? "الضريبة" : "Tax"}</span><span>{Math.abs(viewTx.tax_amount).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-1"><span>{isRTL ? "الإجمالي" : "Total"}</span><span className="text-primary">{Math.abs(viewTx.total).toFixed(2)}</span></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 me-2" />{isRTL ? "طباعة" : "Print"}</Button>
            <Button onClick={() => setViewTx(null)}>{isRTL ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Confirmation Dialog */}
      <Dialog open={returnDialog} onOpenChange={setReturnDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تأكيد المرتجع" : "Confirm Refund"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? `هل تريد إرجاع الفاتورة ${returnTx?.transaction_number} بمبلغ ${returnTx?.total?.toFixed(2)} ر.س؟`
              : `Refund invoice ${returnTx?.transaction_number} for ${returnTx?.total?.toFixed(2)} SAR?`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={() => returnTx && refundMutation.mutate(returnTx)} disabled={refundMutation.isPending}>
              <RotateCcw className="h-4 w-4 me-2" />
              {refundMutation.isPending ? "..." : (isRTL ? "تأكيد المرتجع" : "Confirm Refund")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSInvoices;
