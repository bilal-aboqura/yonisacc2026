import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BookOpenCheck, ChevronsUpDown, Check, Loader2, Calendar,
  ArrowUpRight, ArrowDownRight, FileText, BookOpen, Eye, Edit, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Account {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
  is_parent: boolean | null;
}

interface LedgerLine {
  id: string;
  entry_id: string;
  entry_number: string;
  entry_date: string;
  description: string | null;
  debit: number;
  credit: number;
  running_balance: number;
  status: string;
}

const GeneralLedger = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Get company
  const { data: company } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Load accounts (cached 5 min)
  const { data: accounts = [], isLoading: isAccountsLoading } = useQuery({
    queryKey: ["ledger-accounts", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const [globalRes, linkedRes, customRes] = await Promise.all([
        supabase.from("global_accounts" as any).select("id, code, name, name_en, type, is_parent").eq("is_active", true).eq("is_parent", false).order("sort_order"),
        supabase.from("accounts").select("id, global_account_id").eq("company_id", company.id).not("global_account_id", "is", null),
        supabase.from("accounts").select("id, code, name, name_en, type, is_parent").eq("company_id", company.id).eq("is_active", true).is("global_account_id", null).or("is_parent.is.null,is_parent.eq.false").order("code"),
      ]);

      const linkedMap = new Map<string, string>();
      (linkedRes.data || []).forEach((a: any) => linkedMap.set(a.global_account_id, a.id));

      const merged: Account[] = [
        ...(globalRes.data || []).filter((ga: any) => linkedMap.has(ga.id)).map((ga: any) => ({
          id: linkedMap.get(ga.id)!, code: ga.code, name: ga.name, name_en: ga.name_en, type: ga.type, is_parent: false,
        })),
        ...(customRes.data || []).map((a: any) => ({
          id: a.id, code: a.code, name: a.name, name_en: a.name_en, type: a.type, is_parent: a.is_parent,
        })),
      ];

      const seen = new Set<string>();
      return merged.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; }).sort((a, b) => a.code.localeCompare(b.code));
    },
    enabled: !!company?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Load ledger via server-side function (single query!)
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ["ledger-data", company?.id, selectedAccountId, dateFrom, dateTo],
    queryFn: async () => {
      if (!company?.id || !selectedAccountId) return null;
      const { data, error } = await (supabase.rpc as any)("get_ledger", {
        p_company_id: company.id,
        p_account_id: selectedAccountId,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!company?.id && !!selectedAccountId,
  });

  const openingBalance = ledgerData?.opening_balance ?? 0;
  const ledgerLines: LedgerLine[] = useMemo(() => {
    if (!ledgerData?.lines) return [];
    return (ledgerData.lines as any[]).map((l: any) => ({
      id: l.id,
      entry_id: l.entry_id,
      entry_number: l.entry_number,
      entry_date: l.entry_date,
      description: l.description,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      running_balance: Number(l.running_balance) || 0,
      status: l.status,
    }));
  }, [ledgerData]);

  const selectedAccount = useMemo(
    () => accounts.find(a => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const totals = useMemo(() => ({
    totalDebit: Number(ledgerData?.total_debit) || 0,
    totalCredit: Number(ledgerData?.total_credit) || 0,
    net: openingBalance + (Number(ledgerData?.total_debit) || 0) - (Number(ledgerData?.total_credit) || 0),
  }), [ledgerData, openingBalance]);

  const getTypeBadge = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      asset: { label: isRTL ? "أصول" : "Assets", color: "bg-blue-500/10 text-blue-600" },
      liability: { label: isRTL ? "خصوم" : "Liabilities", color: "bg-red-500/10 text-red-600" },
      equity: { label: isRTL ? "ملكية" : "Equity", color: "bg-green-500/10 text-green-600" },
      revenue: { label: isRTL ? "إيرادات" : "Revenue", color: "bg-emerald-500/10 text-emerald-600" },
      expense: { label: isRTL ? "مصروفات" : "Expenses", color: "bg-orange-500/10 text-orange-600" },
    };
    const info = map[type] || { label: type, color: "bg-muted text-muted-foreground" };
    return <Badge variant="secondary" className={info.color}>{info.label}</Badge>;
  };

  const formatNumber = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "دفتر الأستاذ" : "General Ledger"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "عرض حركات الحسابات التفصيلية" : "View detailed account transactions"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/client/journal")}>
            <BookOpen className="h-4 w-4" />
            {isRTL ? "قيود اليومية" : "Journal Entries"}
          </Button>
          <Button className="gap-2" onClick={() => navigate("/client/journal/new")}>
            <Edit className="h-4 w-4" />
            {isRTL ? "قيد جديد" : "New Entry"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الحساب" : "Account"}</Label>
              <Popover open={accountOpen} onOpenChange={setAccountOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={accountOpen} className="w-full justify-between font-normal" disabled={isAccountsLoading}>
                    {isAccountsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedAccount ? (
                      <span className="truncate">
                        {selectedAccount.code} - {isRTL ? selectedAccount.name : (selectedAccount.name_en || selectedAccount.name)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {isRTL ? "اختر حساباً..." : "Select account..."}
                      </span>
                    )}
                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={isRTL ? "بحث بالاسم أو الرقم..." : "Search by name or code..."} />
                    <CommandList>
                      <CommandEmpty>{isRTL ? "لا توجد نتائج" : "No results"}</CommandEmpty>
                      <CommandGroup>
                        {accounts.map(account => (
                          <CommandItem
                            key={account.id}
                            value={`${account.code} ${account.name} ${account.name_en || ""}`}
                            onSelect={() => { setSelectedAccountId(account.id); setAccountOpen(false); }}
                          >
                            <Check className={cn("me-2 h-4 w-4", selectedAccountId === account.id ? "opacity-100" : "opacity-0")} />
                            <span className="font-mono text-sm text-muted-foreground me-2">{account.code}</span>
                            <span className="truncate">{isRTL ? account.name : (account.name_en || account.name)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
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

      {/* Account Info */}
      {selectedAccount && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "الحساب" : "Account"}</p>
                <p className="font-semibold">{selectedAccount.code} - {isRTL ? selectedAccount.name : (selectedAccount.name_en || selectedAccount.name)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ArrowUpRight className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المدين" : "Total Debit"}</p>
                <p className="font-semibold tabular-nums">{formatNumber(totals.totalDebit)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الدائن" : "Total Credit"}</p>
                <p className="font-semibold tabular-nums">{formatNumber(totals.totalCredit)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <BookOpenCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "الرصيد" : "Balance"}</p>
                <p className={`font-semibold tabular-nums ${totals.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatNumber(Math.abs(totals.net))} {totals.net >= 0 ? (isRTL ? "مدين" : "Dr") : (isRTL ? "دائن" : "Cr")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ledger Table */}
      {selectedAccount && (
        <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpenCheck className="h-5 w-5" />
              {isRTL ? "كشف حساب" : "Account Statement"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <TooltipProvider delayDuration={200}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">{isRTL ? "التاريخ" : "Date"}</TableHead>
                      <TableHead className="w-[120px]">{isRTL ? "رقم القيد" : "Entry #"}</TableHead>
                      <TableHead>{isRTL ? "البيان" : "Description"}</TableHead>
                      <TableHead className="w-[120px] text-end">{isRTL ? "مدين" : "Debit"}</TableHead>
                      <TableHead className="w-[120px] text-end">{isRTL ? "دائن" : "Credit"}</TableHead>
                      <TableHead className="w-[130px] text-end">{isRTL ? "الرصيد" : "Balance"}</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Opening Balance Row */}
                    <TableRow className="bg-muted/30 font-medium">
                      <TableCell colSpan={5} className={isRTL ? "text-start" : "text-start"}>
                        {isRTL ? "رصيد أول المدة" : "Opening Balance"}
                      </TableCell>
                      <TableCell className={`text-end font-semibold tabular-nums ${openingBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatNumber(Math.abs(openingBalance))}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>

                    {ledgerLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {isRTL ? "لا توجد حركات في هذه الفترة" : "No movements in this period"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerLines.map((line) => (
                        <TableRow key={line.id} className="group">
                          <TableCell className="text-muted-foreground">{line.entry_date}</TableCell>
                          <TableCell>
                            <span className="font-mono text-primary cursor-pointer hover:underline" onClick={() => navigate(`/client/journal/${line.entry_id}`)}>
                              {line.entry_number}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate">{line.description || "-"}</TableCell>
                          <TableCell className="text-end tabular-nums">{line.debit > 0 ? formatNumber(line.debit) : "-"}</TableCell>
                          <TableCell className="text-end tabular-nums">{line.credit > 0 ? formatNumber(line.credit) : "-"}</TableCell>
                          <TableCell className={`text-end font-medium tabular-nums ${line.running_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatNumber(Math.abs(line.running_balance))}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/client/journal/${line.entry_id}`)}>
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{isRTL ? "عرض القيد" : "View Entry"}</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}

                    {/* Totals Row */}
                    {ledgerLines.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell colSpan={3} className={isRTL ? "text-start" : "text-start"}>
                          {isRTL ? "الإجمالي" : "Total"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">{formatNumber(totals.totalDebit)}</TableCell>
                        <TableCell className="text-end tabular-nums">{formatNumber(totals.totalCredit)}</TableCell>
                        <TableCell className={`text-end tabular-nums ${totals.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatNumber(Math.abs(totals.net))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedAccount && (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpenCheck className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {isRTL ? "اختر حساباً لعرض الحركات" : "Select an account to view transactions"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isRTL ? "استخدم القائمة أعلاه لاختيار الحساب المطلوب" : "Use the dropdown above to select the desired account"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GeneralLedger;
