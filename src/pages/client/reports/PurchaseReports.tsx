import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Download, Calendar, CreditCard, FileText, UserCheck, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportUtils";

const PurchaseReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "invoices";
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ["purchase-invoices-report", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const base = supabase.from("invoices").select("*, contacts(name, name_en)");
      let q: any = base.eq("company_id", companyId!).eq("invoice_type", "purchase").order("invoice_date", { ascending: false });
      if (dateFrom) q = q.gte("invoice_date", dateFrom);
      if (dateTo) q = q.lte("invoice_date", dateTo);
      const { data } = await q;
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["po-report", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const base = supabase.from("invoices").select("*, contacts(name, name_en)");
      let q: any = base.eq("company_id", companyId!).eq("invoice_type", "purchase_order").order("invoice_date", { ascending: false });
      if (dateFrom) q = q.gte("invoice_date", dateFrom);
      if (dateTo) q = q.lte("invoice_date", dateTo);
      const { data } = await q;
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-report", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("*").eq("company_id", companyId!).eq("type", "vendor").eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const purchasesByItem = useMemo(() => {
    const map: Record<string, { name: string; qty: number; total: number }> = {};
    invoices.filter((i: any) => i.status !== "draft").forEach((inv: any) => {
      (inv.items || []).forEach((item: any) => {
        const key = item.product_name || item.description || "Other";
        if (!map[key]) map[key] = { name: key, qty: 0, total: 0 };
        map[key].qty += item.quantity || 0;
        map[key].total += (item.quantity || 0) * (item.unit_price || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [invoices]);

  const purchasesByVendor = useMemo(() => {
    const map: Record<string, { name: string; count: number; total: number }> = {};
    invoices.filter((i: any) => i.status !== "draft").forEach((inv: any) => {
      const name = inv.contacts ? (isRTL ? inv.contacts.name : inv.contacts.name_en || inv.contacts.name) : (isRTL ? "بدون مورد" : "No vendor");
      const key = inv.contact_id || "none";
      if (!map[key]) map[key] = { name, count: 0, total: 0 };
      map[key].count++;
      map[key].total += inv.total || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [invoices, isRTL]);

  const agingData = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    const details: any[] = [];
    invoices.filter((i: any) => i.status !== "draft" && i.status !== "paid" && (i.balance_due || 0) > 0).forEach((inv: any) => {
      const dueDate = new Date(inv.due_date || inv.invoice_date);
      const days = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const balance = inv.balance_due || inv.total || 0;
      if (days <= 0) buckets.current += balance;
      else if (days <= 30) buckets.days30 += balance;
      else if (days <= 60) buckets.days60 += balance;
      else if (days <= 90) buckets.days90 += balance;
      else buckets.over90 += balance;
      details.push({ ...inv, ageDays: days, balance });
    });
    return { buckets, details: details.sort((a, b) => b.ageDays - a.ageDays) };
  }, [invoices]);

  const formatCurrency = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";
  const statusLabel = (s: string) => {
    const m: Record<string, Record<string, string>> = { draft: { ar: "مسودة", en: "Draft" }, confirmed: { ar: "مؤكدة", en: "Confirmed" }, paid: { ar: "مدفوعة", en: "Paid" }, partial: { ar: "جزئي", en: "Partial" }, cancelled: { ar: "ملغاة", en: "Cancelled" }, converted: { ar: "محولة", en: "Converted" }, received: { ar: "مستلمة", en: "Received" } };
    return isRTL ? m[s]?.ar || s : m[s]?.en || s;
  };
  const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "paid" || s === "received") return "default"; if (s === "confirmed") return "secondary"; if (s === "cancelled") return "destructive"; return "outline";
  };

  const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <TableRow><TableCell colSpan={8} className="text-center py-16"><Icon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">{text}</p></TableCell></TableRow>
  );
  const LoadingSkeleton = ({ cols }: { cols: number }) => (<>{Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: cols }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)}</>);

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <ShoppingCart className="h-7 w-7 text-primary" />
          {isRTL ? "تقارير المشتريات" : "Purchase Reports"}
        </h1>
        <p className="text-muted-foreground mt-1">{isRTL ? "تقارير شاملة لعمليات الشراء والموردين" : "Comprehensive purchase and vendor reports"}</p>
      </div>

      <Card><CardContent className="p-4">
        <div className={cn("flex flex-wrap gap-4 items-end", isRTL && "flex-row-reverse")}>
          <div><label className="text-xs text-muted-foreground">{isRTL ? "من" : "From"}</label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" /></div>
          <div><label className="text-xs text-muted-foreground">{isRTL ? "إلى" : "To"}</label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" /></div>
        </div>
      </CardContent></Card>

      <Tabs defaultValue={defaultTab} dir={isRTL ? "rtl" : "ltr"}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="invoices">{isRTL ? "فواتير المشتريات" : "Invoices"}</TabsTrigger>
          <TabsTrigger value="orders">{isRTL ? "أوامر الشراء" : "Orders"}</TabsTrigger>
          <TabsTrigger value="analysis">{isRTL ? "تحليل المشتريات" : "Analysis"}</TabsTrigger>
          <TabsTrigger value="payments">{isRTL ? "المدفوعات" : "Payments"}</TabsTrigger>
          <TabsTrigger value="aging">{isRTL ? "أعمار الذمم" : "Aging"}</TabsTrigger>
          <TabsTrigger value="statement">{isRTL ? "كشف حساب" : "Statement"}</TabsTrigger>
        </TabsList>

        {/* Invoices */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{isRTL ? `${invoices.length} فاتورة` : `${invoices.length} invoices`}</p>
            <Button variant="outline" size="sm" onClick={() => exportToExcel({ filename: "purchase-invoices", columns: [{ header: "Number", key: "number" }, { header: "Date", key: "date" }, { header: "Vendor", key: "vendor" }, { header: "Total", key: "total", format: "number" }], rows: invoices.map((i: any) => ({ number: i.invoice_number, date: i.invoice_date, vendor: i.contacts?.name || "", total: i.total || 0 })) })} className="gap-1"><Download className="h-4 w-4" />{isRTL ? "تصدير" : "Export"}</Button>
          </div>
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
            <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
            <TableHead>{isRTL ? "المورد" : "Vendor"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableHead>
            <TableHead className="text-end">{isRTL ? "المدفوع" : "Paid"}</TableHead>
            <TableHead className="text-end">{isRTL ? "المتبقي" : "Balance"}</TableHead>
            <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {invLoading ? <LoadingSkeleton cols={7} /> : invoices.length === 0 ? <EmptyState icon={FileText} text={isRTL ? "لا توجد فواتير" : "No invoices"} /> :
            invoices.map((inv: any) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(inv.invoice_date)}</TableCell>
                <TableCell>{inv.contacts ? (isRTL ? inv.contacts.name : inv.contacts.name_en || inv.contacts.name) : "-"}</TableCell>
                <TableCell className="text-end tabular-nums font-medium">{formatCurrency(inv.total || 0)}</TableCell>
                <TableCell className="text-end tabular-nums text-muted-foreground">{formatCurrency(inv.paid_amount || 0)}</TableCell>
                <TableCell className={cn("text-end tabular-nums", (inv.balance_due || 0) > 0 && "text-destructive font-medium")}>{formatCurrency(inv.balance_due || 0)}</TableCell>
                <TableCell><Badge variant={statusVariant(inv.status)}>{statusLabel(inv.status)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        {/* Purchase Orders */}
        <TabsContent value="orders" className="space-y-4">
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "رقم الأمر" : "PO #"}</TableHead>
            <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
            <TableHead>{isRTL ? "المورد" : "Vendor"}</TableHead>
            <TableHead className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableHead>
            <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {purchaseOrders.length === 0 ? <EmptyState icon={FileText} text={isRTL ? "لا توجد أوامر شراء" : "No purchase orders"} /> :
            purchaseOrders.map((po: any) => (
              <TableRow key={po.id}>
                <TableCell className="font-medium">{po.invoice_number}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(po.invoice_date)}</TableCell>
                <TableCell>{po.contacts ? (isRTL ? po.contacts.name : po.contacts.name_en || po.contacts.name) : "-"}</TableCell>
                <TableCell className="text-end tabular-nums font-medium">{formatCurrency(po.total || 0)}</TableCell>
                <TableCell><Badge variant={statusVariant(po.status)}>{statusLabel(po.status)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        {/* Analysis */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card><CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? "المشتريات حسب الصنف" : "Purchases by Item"}</CardTitle></CardHeader>
            <CardContent className="p-0"><Table><TableHeader><TableRow>
              <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
              <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
              <TableHead className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {purchasesByItem.length === 0 ? <EmptyState icon={ShoppingCart} text={isRTL ? "لا توجد بيانات" : "No data"} /> :
              purchasesByItem.slice(0, 20).map((item, i) => (
                <TableRow key={i}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-end tabular-nums">{item.qty}</TableCell><TableCell className="text-end tabular-nums font-medium">{formatCurrency(item.total)}</TableCell></TableRow>
              ))}
            </TableBody></Table></CardContent></Card>

            <Card><CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? "المشتريات حسب المورد" : "Purchases by Vendor"}</CardTitle></CardHeader>
            <CardContent className="p-0"><Table><TableHeader><TableRow>
              <TableHead>{isRTL ? "المورد" : "Vendor"}</TableHead>
              <TableHead className="text-end">{isRTL ? "الفواتير" : "Invoices"}</TableHead>
              <TableHead className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {purchasesByVendor.length === 0 ? <EmptyState icon={UserCheck} text={isRTL ? "لا توجد بيانات" : "No data"} /> :
              purchasesByVendor.slice(0, 20).map((v, i) => (
                <TableRow key={i}><TableCell className="font-medium">{v.name}</TableCell><TableCell className="text-end tabular-nums">{v.count}</TableCell><TableCell className="text-end tabular-nums font-medium">{formatCurrency(v.total)}</TableCell></TableRow>
              ))}
            </TableBody></Table></CardContent></Card>
          </div>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="space-y-4">
          {(() => {
            const paidInvoices = invoices.filter((i: any) => (i.paid_amount || 0) > 0);
            const totalPaid = paidInvoices.reduce((s: number, i: any) => s + (i.paid_amount || 0), 0);
            return (
              <>
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المدفوعات" : "Total Payments"}: <span className="font-bold text-foreground">{formatCurrency(totalPaid)}</span></p></CardContent></Card>
                <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
                  <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                  <TableHead>{isRTL ? "المورد" : "Vendor"}</TableHead>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "المدفوع" : "Paid"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {paidInvoices.length === 0 ? <EmptyState icon={CreditCard} text={isRTL ? "لا توجد مدفوعات" : "No payments"} /> :
                  paidInvoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.contacts ? (isRTL ? inv.contacts.name : inv.contacts.name_en || inv.contacts.name) : "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell className="text-end tabular-nums">{formatCurrency(inv.total || 0)}</TableCell>
                      <TableCell className="text-end tabular-nums font-medium text-emerald-600">{formatCurrency(inv.paid_amount || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></CardContent></Card>
              </>
            );
          })()}
        </TabsContent>

        {/* Aging */}
        <TabsContent value="aging" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: isRTL ? "جاري" : "Current", value: agingData.buckets.current, color: "text-emerald-600" },
              { label: isRTL ? "1-30 يوم" : "1-30 days", value: agingData.buckets.days30, color: "text-yellow-600" },
              { label: isRTL ? "31-60 يوم" : "31-60 days", value: agingData.buckets.days60, color: "text-orange-600" },
              { label: isRTL ? "61-90 يوم" : "61-90 days", value: agingData.buckets.days90, color: "text-red-500" },
              { label: isRTL ? "أكثر من 90" : "90+ days", value: agingData.buckets.over90, color: "text-destructive" },
            ].map((b, i) => (
              <Card key={i}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{b.label}</p><p className={cn("text-lg font-bold tabular-nums mt-1", b.color)}>{formatCurrency(b.value)}</p></CardContent></Card>
            ))}
          </div>
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
            <TableHead>{isRTL ? "المورد" : "Vendor"}</TableHead>
            <TableHead>{isRTL ? "تاريخ الاستحقاق" : "Due Date"}</TableHead>
            <TableHead className="text-end">{isRTL ? "العمر" : "Age"}</TableHead>
            <TableHead className="text-end">{isRTL ? "المتبقي" : "Balance"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {agingData.details.length === 0 ? <EmptyState icon={Calendar} text={isRTL ? "لا توجد ذمم مستحقة" : "No outstanding payables"} /> :
            agingData.details.map((inv: any) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                <TableCell>{inv.contacts ? (isRTL ? inv.contacts.name : inv.contacts.name_en || inv.contacts.name) : "-"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(inv.due_date || inv.invoice_date)}</TableCell>
                <TableCell className={cn("text-end tabular-nums", inv.ageDays > 60 && "text-destructive font-medium")}>{inv.ageDays}</TableCell>
                <TableCell className="text-end tabular-nums font-medium text-destructive">{formatCurrency(inv.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        {/* Vendor Statement */}
        <TabsContent value="statement" className="space-y-4">
          <VendorStatementTab invoices={invoices} vendors={vendors} isRTL={isRTL} formatCurrency={formatCurrency} formatDate={formatDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const VendorStatementTab = ({ invoices, vendors, isRTL, formatCurrency, formatDate }: any) => {
  const [selectedVendor, setSelectedVendor] = useState("all");
  const filtered = useMemo(() => {
    if (selectedVendor === "all") return invoices.filter((i: any) => i.status !== "draft");
    return invoices.filter((i: any) => i.contact_id === selectedVendor && i.status !== "draft");
  }, [invoices, selectedVendor]);
  const total = filtered.reduce((s: number, i: any) => s + (i.total || 0), 0);
  const paid = filtered.reduce((s: number, i: any) => s + (i.paid_amount || 0), 0);

  return (
    <>
      <Select value={selectedVendor} onValueChange={setSelectedVendor}>
        <SelectTrigger className="w-[250px]"><SelectValue placeholder={isRTL ? "اختر المورد" : "Select vendor"} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{isRTL ? "جميع الموردين" : "All Vendors"}</SelectItem>
          {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{isRTL ? v.name : v.name_en || v.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{isRTL ? "إجمالي المشتريات" : "Total Purchases"}</p><p className="text-lg font-bold tabular-nums mt-1">{formatCurrency(total)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{isRTL ? "المدفوع" : "Paid"}</p><p className="text-lg font-bold tabular-nums mt-1 text-emerald-600">{formatCurrency(paid)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{isRTL ? "المتبقي" : "Outstanding"}</p><p className="text-lg font-bold tabular-nums mt-1 text-destructive">{formatCurrency(total - paid)}</p></CardContent></Card>
      </div>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
        <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
        <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
        <TableHead>{isRTL ? "المورد" : "Vendor"}</TableHead>
        <TableHead className="text-end">{isRTL ? "المبلغ" : "Amount"}</TableHead>
        <TableHead className="text-end">{isRTL ? "المدفوع" : "Paid"}</TableHead>
        <TableHead className="text-end">{isRTL ? "الرصيد" : "Balance"}</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد حركات" : "No transactions"}</TableCell></TableRow> :
        filtered.map((inv: any) => (
          <TableRow key={inv.id}>
            <TableCell className="text-muted-foreground">{formatDate(inv.invoice_date)}</TableCell>
            <TableCell className="font-medium">{inv.invoice_number}</TableCell>
            <TableCell>{inv.contacts ? (isRTL ? inv.contacts.name : inv.contacts.name_en || inv.contacts.name) : "-"}</TableCell>
            <TableCell className="text-end tabular-nums">{formatCurrency(inv.total || 0)}</TableCell>
            <TableCell className="text-end tabular-nums text-muted-foreground">{formatCurrency(inv.paid_amount || 0)}</TableCell>
            <TableCell className="text-end tabular-nums font-medium">{formatCurrency(inv.balance_due || 0)}</TableCell>
          </TableRow>
        ))}
      </TableBody></Table></CardContent></Card>
    </>
  );
};

export default PurchaseReports;
