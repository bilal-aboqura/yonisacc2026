import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowRight, Loader2, Calendar, FileSpreadsheet, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePrintSettings } from "@/hooks/usePrintSettings";
import ReportActions from "@/components/print/ReportActions";
import { PrintableDocument, CompanyInfo } from "@/components/print/types";
import { exportToExcel } from "@/lib/exportUtils";

interface VATInvoiceRow {
  journal_entry_number: string;
  type_label: string;
  invoice_number: string;
  invoice_date: string;
  contact_name: string;
  tax_number: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string;
}

const VATReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  // Default: current quarter
  const now = new Date();
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const qEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
  const [dateFrom, setDateFrom] = useState(qStart.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(qEnd.toISOString().split("T")[0]);

  const { data: company } = useQuery({
    queryKey: ["user-company-full", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("companies").select("id, name, name_en, logo_url, tax_number, commercial_register, address, phone, email, currency").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { settings: printSettings } = usePrintSettings(company?.id);

  // Fetch sales invoices with VAT
  const { data: salesInvoices, isLoading: loadingSales } = useQuery({
    queryKey: ["vat-sales", company?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, subtotal, tax_amount, total, notes, status, type, journal_entry_id, contact_id")
        .eq("company_id", company.id)
        .eq("type", "sale")
        .in("status", ["confirmed", "posted"])
        .gte("invoice_date", dateFrom)
        .lte("invoice_date", dateTo)
        .order("invoice_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Fetch purchase invoices with VAT
  const { data: purchaseInvoices, isLoading: loadingPurchases } = useQuery({
    queryKey: ["vat-purchases", company?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, subtotal, tax_amount, total, notes, status, type, journal_entry_id, contact_id")
        .eq("company_id", company.id)
        .eq("type", "purchase")
        .in("status", ["confirmed", "posted"])
        .gte("invoice_date", dateFrom)
        .lte("invoice_date", dateTo)
        .order("invoice_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Fetch contacts for names & tax numbers
  const contactIds = useMemo(() => {
    const ids = new Set<string>();
    [...(salesInvoices || []), ...(purchaseInvoices || [])].forEach(inv => {
      if (inv.contact_id) ids.add(inv.contact_id);
    });
    return Array.from(ids);
  }, [salesInvoices, purchaseInvoices]);

  const { data: contacts } = useQuery({
    queryKey: ["vat-contacts", contactIds],
    queryFn: async () => {
      if (contactIds.length === 0) return [];
      const { data } = await supabase
        .from("contacts")
        .select("id, name, name_en, tax_number")
        .in("id", contactIds);
      return data || [];
    },
    enabled: contactIds.length > 0,
  });

  // Fetch journal entries for entry numbers
  const journalIds = useMemo(() => {
    const ids = new Set<string>();
    [...(salesInvoices || []), ...(purchaseInvoices || [])].forEach(inv => {
      if (inv.journal_entry_id) ids.add(inv.journal_entry_id);
    });
    return Array.from(ids);
  }, [salesInvoices, purchaseInvoices]);

  const { data: journalEntries } = useQuery({
    queryKey: ["vat-journals", journalIds],
    queryFn: async () => {
      if (journalIds.length === 0) return [];
      const { data } = await supabase
        .from("journal_entries")
        .select("id, entry_number")
        .in("id", journalIds);
      return data || [];
    },
    enabled: journalIds.length > 0,
  });

  const contactMap = useMemo(() => {
    const m = new Map<string, { name: string; name_en: string | null; tax_number: string | null }>();
    (contacts || []).forEach(c => m.set(c.id, c));
    return m;
  }, [contacts]);

  const journalMap = useMemo(() => {
    const m = new Map<string, string>();
    (journalEntries || []).forEach(j => m.set(j.id, j.entry_number));
    return m;
  }, [journalEntries]);

  const mapInvoice = (inv: any, typeLabel: string): VATInvoiceRow => {
    const contact = inv.contact_id ? contactMap.get(inv.contact_id) : null;
    return {
      journal_entry_number: inv.journal_entry_id ? (journalMap.get(inv.journal_entry_id) || "-") : "-",
      type_label: typeLabel,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      contact_name: contact ? (isRTL ? contact.name : (contact.name_en || contact.name)) : "-",
      tax_number: contact?.tax_number || "-",
      subtotal: Number(inv.subtotal) || 0,
      tax_amount: Number(inv.tax_amount) || 0,
      total: Number(inv.total) || 0,
      notes: inv.notes || "",
    };
  };

  const salesRows: VATInvoiceRow[] = useMemo(() =>
    (salesInvoices || []).map(inv => mapInvoice(inv, isRTL ? "فاتورة مبيعات" : "Sales Invoice")),
    [salesInvoices, contactMap, journalMap, isRTL]
  );

  const purchaseRows: VATInvoiceRow[] = useMemo(() =>
    (purchaseInvoices || []).map(inv => mapInvoice(inv, isRTL ? "فاتورة مشتريات" : "Purchase Invoice")),
    [purchaseInvoices, contactMap, journalMap, isRTL]
  );

  // Summary calculations
  const salesTotals = useMemo(() => ({
    subtotal: salesRows.reduce((s, r) => s + r.subtotal, 0),
    tax: salesRows.reduce((s, r) => s + r.tax_amount, 0),
    total: salesRows.reduce((s, r) => s + r.total, 0),
  }), [salesRows]);

  const purchaseTotals = useMemo(() => ({
    subtotal: purchaseRows.reduce((s, r) => s + r.subtotal, 0),
    tax: purchaseRows.reduce((s, r) => s + r.tax_amount, 0),
    total: purchaseRows.reduce((s, r) => s + r.total, 0),
  }), [purchaseRows]);

  const netVAT = salesTotals.tax - purchaseTotals.tax;

  const loading = loadingSales || loadingPurchases;

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const companyInfo: CompanyInfo = {
    name: company?.name || "", name_en: company?.name_en,
    logo_url: company?.logo_url, tax_number: company?.tax_number,
    commercial_register: company?.commercial_register, address: company?.address,
    phone: company?.phone, email: company?.email,
  };

  const summaryPrintDoc: PrintableDocument = useMemo(() => ({
    title: isRTL ? "إقرار ضريبة القيمة المضافة" : "VAT Return Declaration",
    subtitle: `${dateFrom} → ${dateTo}`,
    date: new Date().toISOString().split("T")[0],
    table: {
      headers: [
        isRTL ? "البند" : "Item",
        isRTL ? "المبلغ (ر.س)" : "Amount (SAR)",
        isRTL ? "الضريبة (ر.س)" : "VAT (SAR)",
      ],
      rows: [
        [isRTL ? "1. المبيعات الخاضعة للضريبة بالنسبة الأساسية" : "1. Standard rated sales", salesTotals.subtotal, salesTotals.tax],
        [isRTL ? "2. المبيعات للمواطنين (خدمات صحية/تعليمية)" : "2. Sales to citizens (health/education)", 0, 0],
        [isRTL ? "3. المبيعات المحلية بنسبة صفر" : "3. Zero-rated domestic sales", 0, 0],
        [isRTL ? "4. الصادرات" : "4. Exports", 0, 0],
        [isRTL ? "5. المبيعات المعفاة" : "5. Exempt sales", 0, 0],
        [isRTL ? "6. إجمالي المبيعات" : "6. Total sales", salesTotals.subtotal, salesTotals.tax],
        [isRTL ? "7. المشتريات الخاضعة للضريبة بالنسبة الأساسية" : "7. Standard rated purchases", purchaseTotals.subtotal, purchaseTotals.tax],
        [isRTL ? "8. الاستيرادات الخاضعة للضريبة (التحويل العكسي)" : "8. Imports subject to VAT (reverse charge)", 0, 0],
        [isRTL ? "9. المشتريات بنسبة صفر" : "9. Zero-rated purchases", 0, 0],
        [isRTL ? "10. المشتريات المعفاة" : "10. Exempt purchases", 0, 0],
        [isRTL ? "11. إجمالي المشتريات" : "11. Total purchases", purchaseTotals.subtotal, purchaseTotals.tax],
        [isRTL ? "12. صافي الضريبة المستحقة" : "12. Net VAT due", "", netVAT],
      ],
      totals: [isRTL ? "صافي الضريبة المستحقة" : "Net VAT Due", "", netVAT],
    },
  }), [salesTotals, purchaseTotals, netVAT, dateFrom, dateTo, isRTL]);

  const handleExportSummaryExcel = () => {
    exportToExcel({
      filename: `VAT_Return_${dateFrom}_${dateTo}`,
      title: isRTL ? "إقرار ضريبة القيمة المضافة" : "VAT Return Declaration",
      subtitle: `${dateFrom} → ${dateTo}`,
      columns: [
        { header: isRTL ? "البند" : "Item", key: "item", format: "text" },
        { header: isRTL ? "المبلغ (ر.س)" : "Amount (SAR)", key: "amount", format: "number" },
        { header: isRTL ? "الضريبة (ر.س)" : "VAT (SAR)", key: "vat", format: "number" },
      ],
      rows: [
        { item: isRTL ? "المبيعات الخاضعة للضريبة بالنسبة الأساسية" : "Standard rated sales", amount: salesTotals.subtotal, vat: salesTotals.tax },
        { item: isRTL ? "المبيعات للمواطنين" : "Sales to citizens", amount: 0, vat: 0 },
        { item: isRTL ? "المبيعات المحلية بنسبة صفر" : "Zero-rated domestic sales", amount: 0, vat: 0 },
        { item: isRTL ? "الصادرات" : "Exports", amount: 0, vat: 0 },
        { item: isRTL ? "المبيعات المعفاة" : "Exempt sales", amount: 0, vat: 0 },
        { item: isRTL ? "إجمالي المبيعات" : "Total sales", amount: salesTotals.subtotal, vat: salesTotals.tax },
        { item: isRTL ? "المشتريات الخاضعة للضريبة بالنسبة الأساسية" : "Standard rated purchases", amount: purchaseTotals.subtotal, vat: purchaseTotals.tax },
        { item: isRTL ? "الاستيرادات (التحويل العكسي)" : "Imports (reverse charge)", amount: 0, vat: 0 },
        { item: isRTL ? "المشتريات بنسبة صفر" : "Zero-rated purchases", amount: 0, vat: 0 },
        { item: isRTL ? "المشتريات المعفاة" : "Exempt purchases", amount: 0, vat: 0 },
        { item: isRTL ? "إجمالي المشتريات" : "Total purchases", amount: purchaseTotals.subtotal, vat: purchaseTotals.tax },
      ],
      totals: { item: isRTL ? "صافي الضريبة المستحقة" : "Net VAT Due", amount: 0, vat: netVAT },
    });
  };

  const handleExportDetailsExcel = () => {
    const detailColumns = [
      { header: isRTL ? "رقم القيد" : "Entry No.", key: "entry", format: "text" as const },
      { header: isRTL ? "نوع العملية" : "Type", key: "type", format: "text" as const },
      { header: isRTL ? "رقم الفاتورة" : "Invoice No.", key: "invoice", format: "text" as const },
      { header: isRTL ? "التاريخ" : "Date", key: "date", format: "text" as const },
      { header: isRTL ? "الاسم" : "Name", key: "name", format: "text" as const },
      { header: isRTL ? "الرقم الضريبي" : "Tax No.", key: "taxNo", format: "text" as const },
      { header: isRTL ? "القيمة قبل الضريبة" : "Before VAT", key: "subtotal", format: "number" as const },
      { header: isRTL ? "الضريبة" : "VAT", key: "vat", format: "number" as const },
      { header: isRTL ? "الإجمالي" : "Total", key: "total", format: "number" as const },
      { header: isRTL ? "ملاحظات" : "Notes", key: "notes", format: "text" as const },
    ];

    const allRows = [
      ...salesRows.map(r => ({
        entry: r.journal_entry_number, type: r.type_label, invoice: r.invoice_number,
        date: r.invoice_date, name: r.contact_name, taxNo: r.tax_number,
        subtotal: r.subtotal, vat: r.tax_amount, total: r.total, notes: r.notes,
      })),
      ...purchaseRows.map(r => ({
        entry: r.journal_entry_number, type: r.type_label, invoice: r.invoice_number,
        date: r.invoice_date, name: r.contact_name, taxNo: r.tax_number,
        subtotal: r.subtotal, vat: r.tax_amount, total: r.total, notes: r.notes,
      })),
    ];

    exportToExcel({
      filename: `VAT_Details_${dateFrom}_${dateTo}`,
      title: isRTL ? "تفاصيل ضريبة القيمة المضافة" : "VAT Transaction Details",
      subtitle: `${dateFrom} → ${dateTo}`,
      columns: detailColumns,
      rows: allRows,
      totals: {
        entry: "", type: "", invoice: "", date: "", name: "", taxNo: isRTL ? "الإجمالي" : "Total",
        subtotal: salesTotals.subtotal + purchaseTotals.subtotal,
        vat: salesTotals.tax + purchaseTotals.tax,
        total: salesTotals.total + purchaseTotals.total,
        notes: "",
      },
    });
  };

  const renderTransactionTable = (rows: VATInvoiceRow[], title: string, totals: { subtotal: number; tax: number; total: number }) => (
    <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isRTL ? "رقم القيد" : "Entry No."}</TableHead>
              <TableHead>{isRTL ? "نوع العملية" : "Type"}</TableHead>
              <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice No."}</TableHead>
              <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
              <TableHead>{isRTL ? (rows === salesRows ? "اسم العميل" : "اسم المورد") : (rows === salesRows ? "Customer" : "Vendor")}</TableHead>
              <TableHead>{isRTL ? "الرقم الضريبي" : "Tax No."}</TableHead>
              <TableHead className="text-end">{isRTL ? "القيمة قبل الضريبة" : "Before VAT"}</TableHead>
              <TableHead className="text-end">{isRTL ? "الضريبة" : "VAT"}</TableHead>
              <TableHead className="text-end">{isRTL ? "الإجمالي" : "Total"}</TableHead>
              <TableHead>{isRTL ? "ملاحظات" : "Notes"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  {isRTL ? "لا توجد فواتير في هذه الفترة" : "No invoices in this period"}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{row.journal_entry_number}</TableCell>
                    <TableCell>{row.type_label}</TableCell>
                    <TableCell className="font-mono">{row.invoice_number}</TableCell>
                    <TableCell>{row.invoice_date}</TableCell>
                    <TableCell>{row.contact_name}</TableCell>
                    <TableCell className="font-mono text-sm">{row.tax_number}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(row.subtotal)}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(row.tax_amount)}</TableCell>
                    <TableCell className="text-end tabular-nums font-medium">{formatCurrency(row.total)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{row.notes}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell colSpan={6}>{isRTL ? "الإجمالي" : "Total"}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatCurrency(totals.subtotal)}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatCurrency(totals.tax)}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatCurrency(totals.total)}</TableCell>
                  <TableCell />
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/reports")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? "تقرير ضريبة القيمة المضافة" : "VAT Report"}</h1>
            <p className="text-muted-foreground">{isRTL ? "إقرار وتفاصيل ضريبة القيمة المضافة" : "VAT declaration and transaction details"}</p>
          </div>
        </div>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "من تاريخ" : "From Date"}</Label>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="ps-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "إلى تاريخ" : "To Date"}</Label>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="ps-10" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Summary / Details */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="summary">{isRTL ? "الملخص (الإقرار)" : "Summary (Declaration)"}</TabsTrigger>
          <TabsTrigger value="details">{isRTL ? "التفاصيل" : "Details"}</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="flex justify-end">
            <ReportActions
              printSettings={printSettings}
              company={companyInfo}
              document={summaryPrintDoc}
              isRTL={isRTL}
              onExportExcel={handleExportSummaryExcel}
            />
          </div>

          <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-center text-xl">
                {isRTL ? "إقرار ضريبة القيمة المضافة" : "VAT Return Declaration"}
              </CardTitle>
              <p className="text-center text-muted-foreground text-sm">
                {isRTL ? "المملكة العربية السعودية - هيئة الزكاة والضريبة والجمارك" : "Kingdom of Saudi Arabia - ZATCA"}
              </p>
              <p className="text-center text-muted-foreground text-sm mt-1">
                {isRTL ? `الفترة: ${dateFrom} إلى ${dateTo}` : `Period: ${dateFrom} to ${dateTo}`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>{isRTL ? "البند" : "Item"}</TableHead>
                    <TableHead className="text-end w-40">{isRTL ? "المبلغ (ر.س)" : "Amount (SAR)"}</TableHead>
                    <TableHead className="text-end w-40">{isRTL ? "تعديل الضريبة (ر.س)" : "VAT Adj. (SAR)"}</TableHead>
                    <TableHead className="text-end w-40">{isRTL ? "الضريبة (ر.س)" : "VAT (SAR)"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Sales Section */}
                  <TableRow className="bg-primary/5 font-semibold">
                    <TableCell colSpan={5}>{isRTL ? "المبيعات" : "Sales"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>1</TableCell>
                    <TableCell>{isRTL ? "المبيعات الخاضعة للضريبة بالنسبة الأساسية (15%)" : "Standard rated sales (15%)"}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(salesTotals.subtotal)}</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(salesTotals.tax)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2</TableCell>
                    <TableCell>{isRTL ? "المبيعات للمواطنين (خدمات صحية خاصة / تعليم أهلي)" : "Sales to citizens (private health / education)"}</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>3</TableCell>
                    <TableCell>{isRTL ? "المبيعات المحلية الخاضعة لنسبة صفر" : "Zero-rated domestic sales"}</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">-</TableCell>
                    <TableCell className="text-end tabular-nums">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>4</TableCell>
                    <TableCell>{isRTL ? "الصادرات" : "Exports"}</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">-</TableCell>
                    <TableCell className="text-end tabular-nums">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>5</TableCell>
                    <TableCell>{isRTL ? "المبيعات المعفاة" : "Exempt sales"}</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">-</TableCell>
                    <TableCell className="text-end tabular-nums">-</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/40 font-bold border-t-2">
                    <TableCell>6</TableCell>
                    <TableCell>{isRTL ? "إجمالي المبيعات" : "Total Sales"}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(salesTotals.subtotal)}</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(salesTotals.tax)}</TableCell>
                  </TableRow>

                  {/* Purchases Section */}
                  <TableRow className="bg-primary/5 font-semibold">
                    <TableCell colSpan={5}>{isRTL ? "المشتريات" : "Purchases"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>7</TableCell>
                    <TableCell>{isRTL ? "المشتريات الخاضعة للضريبة بالنسبة الأساسية (15%)" : "Standard rated purchases (15%)"}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(purchaseTotals.subtotal)}</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(purchaseTotals.tax)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>8</TableCell>
                    <TableCell>{isRTL ? "الاستيرادات الخاضعة للضريبة بآلية التحويل العكسي" : "Imports subject to VAT (reverse charge)"}</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>9</TableCell>
                    <TableCell>{isRTL ? "المشتريات الخاضعة لنسبة صفر" : "Zero-rated purchases"}</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">-</TableCell>
                    <TableCell className="text-end tabular-nums">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>10</TableCell>
                    <TableCell>{isRTL ? "المشتريات المعفاة" : "Exempt purchases"}</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">-</TableCell>
                    <TableCell className="text-end tabular-nums">-</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/40 font-bold border-t-2">
                    <TableCell>11</TableCell>
                    <TableCell>{isRTL ? "إجمالي المشتريات" : "Total Purchases"}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(purchaseTotals.subtotal)}</TableCell>
                    <TableCell className="text-end tabular-nums">0.00</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(purchaseTotals.tax)}</TableCell>
                  </TableRow>

                  {/* Net VAT */}
                  <TableRow className={`font-bold text-lg border-t-4 ${netVAT > 0 ? "bg-destructive/5" : "bg-green-500/5"}`}>
                    <TableCell>12</TableCell>
                    <TableCell>{isRTL ? "صافي ضريبة القيمة المضافة المستحقة" : "Net VAT Due"}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className={`text-end tabular-nums ${netVAT > 0 ? "text-destructive" : "text-green-600"}`}>
                      {formatCurrency(Math.abs(netVAT))}
                      <span className="text-xs ms-1">
                        {netVAT > 0 ? (isRTL ? "(مستحقة)" : "(Due)") : netVAT < 0 ? (isRTL ? "(لصالحك)" : "(Refundable)") : ""}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="flex justify-end">
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={handleExportDetailsExcel} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {isRTL ? "تصدير Excel" : "Export Excel"}
              </Button>
            </div>
          </div>

          {renderTransactionTable(
            salesRows,
            isRTL ? `فواتير المبيعات (${salesRows.length})` : `Sales Invoices (${salesRows.length})`,
            salesTotals
          )}

          {renderTransactionTable(
            purchaseRows,
            isRTL ? `فواتير المشتريات (${purchaseRows.length})` : `Purchase Invoices (${purchaseRows.length})`,
            purchaseTotals
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VATReport;
