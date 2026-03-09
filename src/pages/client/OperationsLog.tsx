import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ListChecks, Search, Eye, Loader2, BookOpen, TrendingUp, TrendingDown,
  FileText, ArrowUpDown, Calendar, Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";

const SOURCES: Record<string, { ar: string; en: string; color: string; icon?: string }> = {
  sales_invoice: { ar: "فاتورة مبيعات", en: "Sales Invoice", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  purchase_invoice: { ar: "فاتورة مشتريات", en: "Purchase Invoice", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  inventory: { ar: "حركة مخزون", en: "Inventory", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  hr: { ar: "رواتب", en: "Payroll", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  receipt: { ar: "سند قبض", en: "Receipt", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  payment: { ar: "سند صرف", en: "Payment", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  deposit: { ar: "إيداع", en: "Deposit", color: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
  withdrawal: { ar: "سحب", en: "Withdrawal", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  transfer: { ar: "تحويل", en: "Transfer", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  reversal: { ar: "عكس قيد", en: "Reversal", color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const MANUAL_SOURCE = { ar: "يدوي", en: "Manual", color: "bg-muted text-muted-foreground border-border" };

const OperationsLog = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const { data: company } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("companies")
        .select("id, currency")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["operations-log", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, entry_number, entry_date, description, total_debit, total_credit, status, is_auto, reference_type, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const currency = isRTL ? "ر.س" : (company?.currency || "SAR");

  const formatNumber = (num: number | null) =>
    (num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getEntrySource = (entry: any) => {
    if (entry.is_auto && entry.reference_type && SOURCES[entry.reference_type]) {
      return SOURCES[entry.reference_type];
    }
    return MANUAL_SOURCE;
  };

  const getTabFilter = (tab: string) => {
    if (tab === "all") return entries;
    if (tab === "manual") return entries?.filter(e => !e.is_auto);
    if (tab === "sales") return entries?.filter(e => e.reference_type === "sales_invoice");
    if (tab === "purchases") return entries?.filter(e => e.reference_type === "purchase_invoice");
    if (tab === "inventory") return entries?.filter(e => e.reference_type === "inventory");
    if (tab === "hr") return entries?.filter(e => e.reference_type === "hr");
    if (tab === "treasury") return entries?.filter(e =>
      ["receipt", "payment", "deposit", "withdrawal", "transfer", "reversal"].includes(e.reference_type || "")
    );
    return entries;
  };

  const filtered = useMemo(() => {
    let data = getTabFilter(activeTab);
    if (statusFilter !== "all") {
      data = data?.filter(e => e.status === statusFilter);
    }
    if (dateFilter) {
      data = data?.filter(e => e.entry_date === dateFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data?.filter(e =>
        e.entry_number?.toLowerCase().includes(term) ||
        e.description?.toLowerCase().includes(term)
      );
    }
    return data;
  }, [entries, activeTab, statusFilter, dateFilter, searchTerm]);

  // Summary stats
  const stats = useMemo(() => {
    if (!entries) return { total: 0, posted: 0, draft: 0, totalDebit: 0, totalCredit: 0 };
    return {
      total: entries.length,
      posted: entries.filter(e => e.status === "posted").length,
      draft: entries.filter(e => e.status !== "posted").length,
      totalDebit: entries.reduce((s, e) => s + (e.total_debit || 0), 0),
      totalCredit: entries.reduce((s, e) => s + (e.total_credit || 0), 0),
    };
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <ListChecks className="h-7 w-7 text-primary" />
            {t("client.operationsLog.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "جميع القيود اليدوية والآلية المسجلة" : "All manual and automated journal entries"}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي القيود" : "Total Entries"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <ArrowUpDown className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.posted}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "مرحّل" : "Posted"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{formatNumber(stats.totalDebit)}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي المدين" : "Total Debit"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{formatNumber(stats.totalCredit)}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الدائن" : "Total Credit"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "ابحث برقم القيد أو البيان..." : "Search by entry number or description..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 me-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "الكل" : "All Status"}</SelectItem>
                  <SelectItem value="posted">{isRTL ? "مرحّل" : "Posted"}</SelectItem>
                  <SelectItem value="draft">{isRTL ? "مسودة" : "Draft"}</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="ps-10 w-[170px]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-5 w-5 text-primary" />
            {t("client.operationsLog.allEntries")}
            {filtered && (
              <Badge variant="secondary" className="ms-2 text-xs">{filtered.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="all">{t("client.operationsLog.tabs.all")}</TabsTrigger>
              <TabsTrigger value="manual">{t("client.operationsLog.tabs.manual")}</TabsTrigger>
              <TabsTrigger value="sales">{t("client.operationsLog.tabs.sales")}</TabsTrigger>
              <TabsTrigger value="purchases">{t("client.operationsLog.tabs.purchases")}</TabsTrigger>
              <TabsTrigger value="inventory">{t("client.operationsLog.tabs.inventory")}</TabsTrigger>
              <TabsTrigger value="hr">{t("client.operationsLog.tabs.hr")}</TabsTrigger>
              <TabsTrigger value="treasury">{isRTL ? "الخزينة والصندوق" : "Treasury & Cash"}</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab}>
              <OperationsTable
                data={filtered}
                isLoading={isLoading}
                isRTL={isRTL}
                currency={currency}
                formatNumber={formatNumber}
                getEntrySource={getEntrySource}
                navigate={navigate}
                t={t}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

interface OperationsTableProps {
  data: any[] | undefined;
  isLoading: boolean;
  isRTL: boolean;
  currency: string;
  formatNumber: (n: number | null) => string;
  getEntrySource: (entry: any) => { ar: string; en: string; color: string };
  navigate: (path: string) => void;
  t: (key: string) => string;
}

const OperationsTable = ({ data, isLoading, isRTL, currency, formatNumber, getEntrySource, navigate, t }: OperationsTableProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t("client.operationsLog.noEntries")}</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">{isRTL ? "رقم القيد" : "Entry #"}</TableHead>
              <TableHead className="w-[110px]">{isRTL ? "التاريخ" : "Date"}</TableHead>
              <TableHead className="w-[120px]">{isRTL ? "المصدر" : "Source"}</TableHead>
              <TableHead>{isRTL ? "البيان" : "Description"}</TableHead>
              <TableHead className="w-[130px] text-end">{isRTL ? "مدين" : "Debit"}</TableHead>
              <TableHead className="w-[130px] text-end">{isRTL ? "دائن" : "Credit"}</TableHead>
              <TableHead className="w-[90px] text-center">{isRTL ? "الحالة" : "Status"}</TableHead>
              <TableHead className="w-[60px] text-center">{isRTL ? "عرض" : "View"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry, idx) => {
              const source = getEntrySource(entry);
              return (
                <TableRow key={entry.id} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                  <TableCell className="font-mono font-medium text-primary">{entry.entry_number}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{entry.entry_date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${source.color} text-xs`}>
                      {isRTL ? source.ar : source.en}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-sm">{entry.description || "-"}</TableCell>
                  <TableCell className="text-end font-medium tabular-nums text-sm">
                    {formatNumber(entry.total_debit)} <span className="text-xs text-muted-foreground">{currency}</span>
                  </TableCell>
                  <TableCell className="text-end font-medium tabular-nums text-sm">
                    {formatNumber(entry.total_credit)} <span className="text-xs text-muted-foreground">{currency}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {entry.status === "posted" ? (
                      <Badge className="bg-green-600 text-white text-xs">{isRTL ? "مرحّل" : "Posted"}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">{isRTL ? "مسودة" : "Draft"}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => navigate(`/client/journal/${entry.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isRTL ? "عرض القيد" : "View Entry"}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={4} className="text-sm">{isRTL ? "الإجمالي" : "Total"}</TableCell>
              <TableCell className="text-end tabular-nums text-sm">
                {formatNumber(data.reduce((s, e) => s + (e.total_debit || 0), 0))}
                <span className="text-xs text-muted-foreground ms-1">{currency}</span>
              </TableCell>
              <TableCell className="text-end tabular-nums text-sm">
                {formatNumber(data.reduce((s, e) => s + (e.total_credit || 0), 0))}
                <span className="text-xs text-muted-foreground ms-1">{currency}</span>
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </TooltipProvider>
  );
};

export default OperationsLog;
