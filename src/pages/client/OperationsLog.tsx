import { useState } from "react";
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
import { ListChecks, Search, Eye, Loader2, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";

const OperationsLog = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

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
    if (entry.is_auto && entry.reference_type) {
      const sources: Record<string, { ar: string; en: string; color: string }> = {
        sales_invoice: { ar: "فاتورة مبيعات", en: "Sales Invoice", color: "bg-emerald-500/10 text-emerald-600" },
        purchase_invoice: { ar: "فاتورة مشتريات", en: "Purchase Invoice", color: "bg-blue-500/10 text-blue-600" },
        inventory: { ar: "حركة مخزون", en: "Inventory", color: "bg-amber-500/10 text-amber-600" },
        hr: { ar: "رواتب", en: "Payroll", color: "bg-purple-500/10 text-purple-600" },
        receipt: { ar: "سند قبض", en: "Receipt", color: "bg-cyan-500/10 text-cyan-600" },
        payment: { ar: "سند صرف", en: "Payment", color: "bg-orange-500/10 text-orange-600" },
        deposit: { ar: "إيداع", en: "Deposit", color: "bg-teal-500/10 text-teal-600" },
        withdrawal: { ar: "سحب", en: "Withdrawal", color: "bg-rose-500/10 text-rose-600" },
        transfer: { ar: "تحويل", en: "Transfer", color: "bg-indigo-500/10 text-indigo-600" },
        reversal: { ar: "عكس قيد", en: "Reversal", color: "bg-red-500/10 text-red-600" },
      };
      const src = sources[entry.reference_type];
      if (src) return src;
    }
    return { ar: "يدوي", en: "Manual", color: "bg-muted text-muted-foreground" };
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "posted") {
      return <Badge className="bg-green-600 text-white">{isRTL ? "مرحّل" : "Posted"}</Badge>;
    }
    return <Badge variant="secondary">{isRTL ? "مسودة" : "Draft"}</Badge>;
  };

  const getTabFilter = (tab: string) => {
    if (tab === "all") return entries;
    if (tab === "manual") return entries?.filter(e => !e.is_auto);
    if (tab === "sales") return entries?.filter(e => e.reference_type === "sales_invoice");
    if (tab === "purchases") return entries?.filter(e => e.reference_type === "purchase_invoice");
    if (tab === "inventory") return entries?.filter(e => e.reference_type === "inventory");
    if (tab === "hr") return entries?.filter(e => e.reference_type === "hr");
    if (tab === "treasury") return entries?.filter(e => 
      e.reference_type === "receipt" || e.reference_type === "payment" || 
      e.reference_type === "deposit" || e.reference_type === "withdrawal" || 
      e.reference_type === "transfer" || e.reference_type === "reversal"
    );
    return entries;
  };

  const filtered = getTabFilter(activeTab)?.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.entry_number?.toLowerCase().includes(term) ||
      e.description?.toLowerCase().includes(term)
    );
  });

  const renderTable = (data: typeof filtered) => {
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">{isRTL ? "رقم القيد" : "Entry #"}</TableHead>
              <TableHead className="w-[110px]">{isRTL ? "التاريخ" : "Date"}</TableHead>
              <TableHead className="w-[100px]">{isRTL ? "المصدر" : "Source"}</TableHead>
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
                  <TableCell className="text-muted-foreground">{entry.entry_date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={source.color}>
                      {isRTL ? source.ar : source.en}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate">{entry.description || "-"}</TableCell>
                  <TableCell className="text-end font-medium tabular-nums">
                    {formatNumber(entry.total_debit)} <span className="text-xs text-muted-foreground">{currency}</span>
                  </TableCell>
                  <TableCell className="text-end font-medium tabular-nums">
                    {formatNumber(entry.total_credit)} <span className="text-xs text-muted-foreground">{currency}</span>
                  </TableCell>
                  <TableCell className="text-center">{getStatusBadge(entry.status)}</TableCell>
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
        </Table>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {t("client.operationsLog.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "جميع القيود اليدوية والآلية المسجلة" : "All manual and automated journal entries"}
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "ابحث برقم القيد أو البيان..." : "Search by entry number or description..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            {t("client.operationsLog.allEntries")}
            {filtered && (
              <Badge variant="secondary" className="ms-2">{filtered.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">{t("client.operationsLog.tabs.all")}</TabsTrigger>
              <TabsTrigger value="manual">{t("client.operationsLog.tabs.manual")}</TabsTrigger>
              <TabsTrigger value="sales">{t("client.operationsLog.tabs.sales")}</TabsTrigger>
              <TabsTrigger value="purchases">{t("client.operationsLog.tabs.purchases")}</TabsTrigger>
              <TabsTrigger value="inventory">{t("client.operationsLog.tabs.inventory")}</TabsTrigger>
              <TabsTrigger value="hr">{t("client.operationsLog.tabs.hr")}</TabsTrigger>
              <TabsTrigger value="treasury">{isRTL ? "الخزينة والصندوق" : "Treasury & Cash"}</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab}>
              {renderTable(filtered)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationsLog;
