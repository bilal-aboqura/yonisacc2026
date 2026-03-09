import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Loader2,
  ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, Landmark,
  Building2, PiggyBank, CalendarDays,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import useTenantIsolation from "@/hooks/useTenantIsolation";
import { useLanguage } from "@/hooks/useLanguage";
import { usePrintSettings } from "@/hooks/usePrintSettings";
import ReportActions from "@/components/print/ReportActions";
import { PrintableDocument, CompanyInfo } from "@/components/print/types";
import { exportToExcel } from "@/lib/exportUtils";

interface CashFlowItem {
  entry_id: string;
  entry_date: string;
  entry_number: string;
  description: string | null;
  counterpart_name: string | null;
  counterpart_name_en: string | null;
  counterpart_code: string | null;
  amount: number;
}

interface CashFlowData {
  start_date: string;
  end_date: string;
  opening_cash: number;
  closing_cash: number;
  operating: CashFlowItem[];
  investing: CashFlowItem[];
  financing: CashFlowItem[];
  operating_total: number;
  investing_total: number;
  financing_total: number;
  net_change: number;
}

const CashFlow = () => {
  const navigate = useNavigate();
  const { companyId, isLoadingCompany } = useTenantIsolation();
  const { isRTL } = useLanguage();
  const { settings: printSettings } = usePrintSettings(companyId);

  const today = new Date();
  const yearStart = `${today.getFullYear()}-01-01`;
  const todayStr = today.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(yearStart);
  const [endDate, setEndDate] = useState(todayStr);

  const { data: company } = useQuery({
    queryKey: ["company-info", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from("companies").select("*").eq("id", companyId).single();
      return data;
    },
    enabled: !!companyId,
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ["cash-flow-report", companyId, startDate, endDate],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.rpc(
        "get_cash_flow_report" as any,
        {
          p_company_id: companyId,
          p_start_date: startDate,
          p_end_date: endDate,
        }
      );
      if (error) throw error;
      return data as unknown as CashFlowData;
    },
    enabled: !!companyId,
    staleTime: 0,
  });

  const fmt = (n: number) =>
    Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US");

  const op = report?.operating || [];
  const inv = report?.investing || [];
  const fin = report?.financing || [];

  const allItems = [...op, ...inv, ...fin];

  const companyInfo: CompanyInfo = {
    name: company?.name || "", name_en: company?.name_en,
    logo_url: company?.logo_url, tax_number: company?.tax_number,
    commercial_register: company?.commercial_register, address: company?.address,
    phone: company?.phone, email: company?.email,
  };

  const printDoc: PrintableDocument = useMemo(() => {
    const rows: (string | number)[][] = [];

    // Operating section
    rows.push([isRTL ? "الأنشطة التشغيلية" : "Operating Activities", "", "", ""]);
    op.forEach(item => rows.push([
      item.entry_number,
      isRTL ? (item.counterpart_name || "") : (item.counterpart_name_en || item.counterpart_name || ""),
      item.description || "-",
      item.amount,
    ]));
    rows.push(["", "", isRTL ? "إجمالي التشغيلية" : "Total Operating", report?.operating_total || 0]);

    // Investing section
    rows.push([isRTL ? "الأنشطة الاستثمارية" : "Investing Activities", "", "", ""]);
    inv.forEach(item => rows.push([
      item.entry_number,
      isRTL ? (item.counterpart_name || "") : (item.counterpart_name_en || item.counterpart_name || ""),
      item.description || "-",
      item.amount,
    ]));
    rows.push(["", "", isRTL ? "إجمالي الاستثمارية" : "Total Investing", report?.investing_total || 0]);

    // Financing section
    rows.push([isRTL ? "الأنشطة التمويلية" : "Financing Activities", "", "", ""]);
    fin.forEach(item => rows.push([
      item.entry_number,
      isRTL ? (item.counterpart_name || "") : (item.counterpart_name_en || item.counterpart_name || ""),
      item.description || "-",
      item.amount,
    ]));
    rows.push(["", "", isRTL ? "إجمالي التمويلية" : "Total Financing", report?.financing_total || 0]);

    return {
      title: isRTL ? "قائمة التدفقات النقدية" : "Cash Flow Statement",
      subtitle: `${startDate} → ${endDate}`,
      date: new Date().toISOString().split("T")[0],
      extraFields: [
        { label: isRTL ? "الرصيد الافتتاحي" : "Opening Balance", value: fmt(report?.opening_cash || 0) },
        { label: isRTL ? "الرصيد الختامي" : "Closing Balance", value: fmt(report?.closing_cash || 0) },
      ],
      table: {
        headers: [
          isRTL ? "رقم القيد" : "Entry #",
          isRTL ? "الحساب المقابل" : "Counterpart",
          isRTL ? "البيان" : "Description",
          isRTL ? "المبلغ" : "Amount",
        ],
        rows,
        totals: ["", "", isRTL ? "صافي التغير" : "Net Change", report?.net_change || 0],
      },
    };
  }, [op, inv, fin, report, startDate, endDate, isRTL]);

  const handleExportExcel = () => {
    const todayExport = new Date().toISOString().split("T")[0];
    const exportRows: Record<string, string | number>[] = [];

    const addSection = (label: string, items: CashFlowItem[], total: number) => {
      exportRows.push({ section: label, entry: "", counterpart: "", description: "", amount: "" });
      items.forEach(item => exportRows.push({
        section: "",
        entry: item.entry_number,
        counterpart: isRTL ? (item.counterpart_name || "") : (item.counterpart_name_en || item.counterpart_name || ""),
        description: item.description || "-",
        amount: item.amount,
      }));
      exportRows.push({ section: "", entry: "", counterpart: "", description: isRTL ? `إجمالي ${label}` : `Total ${label}`, amount: total });
    };

    addSection(isRTL ? "التشغيلية" : "Operating", op, report?.operating_total || 0);
    addSection(isRTL ? "الاستثمارية" : "Investing", inv, report?.investing_total || 0);
    addSection(isRTL ? "التمويلية" : "Financing", fin, report?.financing_total || 0);

    exportToExcel({
      filename: `CashFlow_${company?.name_en || company?.name || "Report"}_${todayExport}`,
      title: isRTL ? "قائمة التدفقات النقدية" : "Cash Flow Statement",
      subtitle: `${startDate} → ${endDate}`,
      columns: [
        { header: isRTL ? "القسم" : "Section", key: "section", format: "text" },
        { header: isRTL ? "رقم القيد" : "Entry #", key: "entry", format: "text" },
        { header: isRTL ? "الحساب المقابل" : "Counterpart", key: "counterpart", format: "text" },
        { header: isRTL ? "البيان" : "Description", key: "description", format: "text" },
        { header: isRTL ? "المبلغ" : "Amount", key: "amount", format: "number" },
      ],
      rows: exportRows,
      totals: { section: "", entry: "", counterpart: "", description: isRTL ? "صافي التغير" : "Net Change", amount: report?.net_change || 0 },
    });
  };

  if (isLoading || isLoadingCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  const sections = [
    {
      key: "operating",
      title: isRTL ? "الأنشطة التشغيلية" : "Operating Activities",
      titleEn: "Operating Activities",
      icon: Building2,
      items: op,
      total: report?.operating_total || 0,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      key: "investing",
      title: isRTL ? "الأنشطة الاستثمارية" : "Investing Activities",
      titleEn: "Investing Activities",
      icon: TrendingUp,
      items: inv,
      total: report?.investing_total || 0,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      key: "financing",
      title: isRTL ? "الأنشطة التمويلية" : "Financing Activities",
      titleEn: "Financing Activities",
      icon: PiggyBank,
      items: fin,
      total: report?.financing_total || 0,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/reports")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isRTL ? "قائمة التدفقات النقدية" : "Cash Flow Statement"}
            </h1>
            <p className="text-muted-foreground">
              {isRTL ? "مربوطة بدليل الحسابات والقيود المحاسبية" : "Linked to chart of accounts and journal entries"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            <span className="text-muted-foreground">{isRTL ? "إلى" : "to"}</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
          <ReportActions
            printSettings={printSettings}
            company={companyInfo}
            document={printDoc}
            isRTL={isRTL}
            onExportExcel={handleExportExcel}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl p-3 bg-primary/10 text-primary shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isRTL ? "الرصيد الافتتاحي" : "Opening Balance"}
              </p>
              <p className="text-xl font-bold tabular-nums">{fmt(report?.opening_cash || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`${(report?.net_change || 0) >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"}`}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`rounded-xl p-3 shrink-0 ${(report?.net_change || 0) >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
              {(report?.net_change || 0) >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isRTL ? "صافي التغير" : "Net Change"}
              </p>
              <p className={`text-xl font-bold tabular-nums ${(report?.net_change || 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {(report?.net_change || 0) >= 0 ? "+" : "-"}{fmt(report?.net_change || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl p-3 bg-primary/10 text-primary shrink-0">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isRTL ? "الرصيد الختامي" : "Closing Balance"}
              </p>
              <p className="text-xl font-bold tabular-nums">{fmt(report?.closing_cash || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl p-3 bg-muted text-muted-foreground shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isRTL ? "عدد الحركات" : "Transactions"}
              </p>
              <p className="text-xl font-bold tabular-nums">{op.length + inv.length + fin.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Sections */}
      {sections.map((section) => (
        <Card key={section.key} className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className={`flex items-center justify-between ${section.color}`}>
              <div className="flex items-center gap-2">
                <section.icon className="h-5 w-5" />
                {section.title}
                <Badge variant="secondary" className="text-xs">{section.items.length}</Badge>
              </div>
              <span className={`text-lg font-bold tabular-nums ${section.total >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {section.total >= 0 ? "+" : "-"}{fmt(section.total)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {section.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <section.icon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>{isRTL ? "لا توجد حركات في هذا النشاط" : "No movements in this activity"}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "رقم القيد" : "Entry #"}</TableHead>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "الحساب المقابل" : "Counterpart Account"}</TableHead>
                    <TableHead>{isRTL ? "البيان" : "Description"}</TableHead>
                    <TableHead className="text-left">{isRTL ? "المبلغ" : "Amount"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.items.map((item, idx) => (
                    <TableRow
                      key={`${item.entry_id}-${idx}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/client/journal/view/${item.entry_id}`)}
                    >
                      <TableCell className="font-mono text-xs">{item.entry_number}</TableCell>
                      <TableCell className="text-sm">{fmtDate(item.entry_date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.counterpart_code && (
                            <Badge variant="outline" className="font-mono text-xs">{item.counterpart_code}</Badge>
                          )}
                          <span className="text-sm">
                            {isRTL ? item.counterpart_name : (item.counterpart_name_en || item.counterpart_name)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell className={`text-left font-medium tabular-nums ${item.amount >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {item.amount >= 0 ? "+" : "-"}{fmt(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={`font-bold ${section.bgColor}`}>
                    <TableCell colSpan={4}>
                      {isRTL ? `إجمالي ${section.title}` : `Total ${section.titleEn}`}
                    </TableCell>
                    <TableCell className={`text-left tabular-nums ${section.total >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {section.total >= 0 ? "+" : "-"}{fmt(section.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Reconciliation Summary */}
      <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {isRTL ? "ملخص التسوية" : "Reconciliation Summary"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{isRTL ? "رصيد النقدية - بداية الفترة" : "Cash Balance - Beginning of Period"}</TableCell>
                <TableCell className="text-left tabular-nums font-bold">{fmt(report?.opening_cash || 0)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-blue-600">{isRTL ? "صافي التدفقات التشغيلية" : "Net Operating Cash Flow"}</TableCell>
                <TableCell className={`text-left tabular-nums ${(report?.operating_total || 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {(report?.operating_total || 0) >= 0 ? "+" : "-"}{fmt(report?.operating_total || 0)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-amber-600">{isRTL ? "صافي التدفقات الاستثمارية" : "Net Investing Cash Flow"}</TableCell>
                <TableCell className={`text-left tabular-nums ${(report?.investing_total || 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {(report?.investing_total || 0) >= 0 ? "+" : "-"}{fmt(report?.investing_total || 0)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-purple-600">{isRTL ? "صافي التدفقات التمويلية" : "Net Financing Cash Flow"}</TableCell>
                <TableCell className={`text-left tabular-nums ${(report?.financing_total || 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {(report?.financing_total || 0) >= 0 ? "+" : "-"}{fmt(report?.financing_total || 0)}
                </TableCell>
              </TableRow>
              <TableRow className="border-t-2 border-primary/30">
                <TableCell className="font-bold text-lg">{isRTL ? "صافي التغير في النقدية" : "Net Change in Cash"}</TableCell>
                <TableCell className={`text-left tabular-nums font-bold text-lg ${(report?.net_change || 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {(report?.net_change || 0) >= 0 ? "+" : "-"}{fmt(report?.net_change || 0)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-primary/5">
                <TableCell className="font-bold text-lg">{isRTL ? "رصيد النقدية - نهاية الفترة" : "Cash Balance - End of Period"}</TableCell>
                <TableCell className="text-left tabular-nums font-bold text-lg">{fmt(report?.closing_cash || 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlow;
