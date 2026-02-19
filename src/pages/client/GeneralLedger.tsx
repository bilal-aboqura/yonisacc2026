import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  BookOpenCheck,
  ChevronsUpDown,
  Check,
  Search,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  BookOpen,
  Eye,
  Edit,
  ExternalLink,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [ledgerLines, setLedgerLines] = useState<LedgerLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState(0);

  // Load accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user) return;
      try {
        const { data: comp } = await supabase
          .from("companies")
          .select("id")
          .eq("owner_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!comp) return;
        setCompanyId(comp.id);

        // Fetch linked global accounts + custom accounts (leaf only)
        const [globalRes, linkedRes, customRes] = await Promise.all([
          supabase
            .from("global_accounts" as any)
            .select("id, code, name, name_en, type, is_parent")
            .eq("is_active", true)
            .eq("is_parent", false)
            .order("sort_order"),
          supabase
            .from("accounts")
            .select("id, global_account_id")
            .eq("company_id", comp.id)
            .not("global_account_id", "is", null),
          supabase
            .from("accounts")
            .select("id, code, name, name_en, type, is_parent")
            .eq("company_id", comp.id)
            .eq("is_active", true)
            .is("global_account_id", null)
            .or("is_parent.is.null,is_parent.eq.false")
            .order("code"),
        ]);

        const linkedMap = new Map<string, string>();
        (linkedRes.data || []).forEach((a: any) => {
          linkedMap.set(a.global_account_id, a.id);
        });

        const merged: Account[] = [
          ...(globalRes.data || [])
            .filter((ga: any) => linkedMap.has(ga.id))
            .map((ga: any) => ({
              id: linkedMap.get(ga.id)!,
              code: ga.code,
              name: ga.name,
              name_en: ga.name_en,
              type: ga.type,
              is_parent: false,
            })),
          ...(customRes.data || []).map((a: any) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            name_en: a.name_en,
            type: a.type,
            is_parent: a.is_parent,
          })),
        ];

        // Deduplicate
        const seen = new Set<string>();
        setAccounts(merged.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; }));
      } catch (error) {
        console.error(error);
        toast.error(isRTL ? "خطأ في جلب الحسابات" : "Error loading accounts");
      } finally {
        setIsAccountsLoading(false);
      }
    };
    fetchAccounts();
  }, [user, isRTL]);

  // Load ledger for selected account
  useEffect(() => {
    const fetchLedger = async () => {
      if (!selectedAccountId || !companyId) {
        setLedgerLines([]);
        return;
      }

      setIsLoading(true);
      try {
        // Step 1: Get all posted journal entries for this company
        const { data: entries, error: entriesError } = await supabase
          .from("journal_entries")
          .select("id, entry_number, entry_date, description, status")
          .eq("company_id", companyId)
          .eq("status", "posted")
          .order("entry_date");

        if (entriesError) throw entriesError;
        if (!entries || entries.length === 0) {
          setLedgerLines([]);
          setIsLoading(false);
          return;
        }

        const entryIds = entries.map(e => e.id);
        const entryMap = new Map(entries.map(e => [e.id, e]));

        // Step 2: Get journal lines for this account from those entries
        const { data: lines, error: linesError } = await supabase
          .from("journal_entry_lines")
          .select("id, entry_id, debit, credit, description")
          .eq("account_id", selectedAccountId)
          .in("entry_id", entryIds);

        if (linesError) throw linesError;

        // Build ledger lines
        let ledger = (lines || []).map((line: any) => {
          const entry = entryMap.get(line.entry_id)!;
          return {
            id: line.id,
            entry_id: line.entry_id,
            entry_number: entry.entry_number,
            entry_date: entry.entry_date,
            description: line.description || entry.description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            running_balance: 0,
            status: entry.status,
          };
        });

        // Apply date filters
        if (dateFrom) {
          ledger = ledger.filter(l => l.entry_date >= dateFrom);
        }
        if (dateTo) {
          ledger = ledger.filter(l => l.entry_date <= dateTo);
        }

        // Sort by date then entry_number
        ledger.sort((a, b) => {
          const d = a.entry_date.localeCompare(b.entry_date);
          if (d !== 0) return d;
          return a.entry_number.localeCompare(b.entry_number);
        });

        // Calculate running balance
        let balance = 0;
        ledger.forEach(line => {
          balance += line.debit - line.credit;
          line.running_balance = balance;
        });

        setOpeningBalance(0);
        setLedgerLines(ledger);
      } catch (error) {
        console.error(error);
        toast.error(isRTL ? "خطأ في جلب البيانات" : "Error loading ledger");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLedger();
  }, [selectedAccountId, companyId, dateFrom, dateTo, isRTL]);

  const selectedAccount = useMemo(
    () => accounts.find(a => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const totals = useMemo(() => {
    const totalDebit = ledgerLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = ledgerLines.reduce((s, l) => s + l.credit, 0);
    return { totalDebit, totalCredit, net: totalDebit - totalCredit };
  }, [ledgerLines]);

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
            {/* Account Selector */}
            <div className="space-y-2">
              <Label>{isRTL ? "الحساب" : "Account"}</Label>
              <Popover open={accountOpen} onOpenChange={setAccountOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={accountOpen}
                    className="w-full justify-between font-normal"
                    disabled={isAccountsLoading}
                  >
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
                            onSelect={() => {
                              setSelectedAccountId(account.id);
                              setAccountOpen(false);
                            }}
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

            {/* Date From */}
            <div className="space-y-2">
              <Label>{isRTL ? "من تاريخ" : "From Date"}</Label>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>{isRTL ? "إلى تاريخ" : "To Date"}</Label>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="ps-10"
                />
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
              <div className={`p-2 rounded-lg ${totals.net >= 0 ? "bg-green-500/10" : "bg-orange-500/10"}`}>
                <BookOpenCheck className={`h-5 w-5 ${totals.net >= 0 ? "text-green-600" : "text-orange-600"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "الرصيد" : "Balance"}</p>
                <p className="font-semibold tabular-nums">{formatNumber(totals.net)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5" />
            {isRTL ? "حركات الحساب" : "Account Transactions"}
            {ledgerLines.length > 0 && (
              <Badge variant="outline" className="ms-2">{ledgerLines.length} {isRTL ? "حركة" : "entries"}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedAccountId ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpenCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">{isRTL ? "اختر حساباً لعرض حركاته" : "Select an account to view its transactions"}</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : ledgerLines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{isRTL ? "لا توجد حركات لهذا الحساب" : "No transactions found for this account"}</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px] text-center">#</TableHead>
                    <TableHead className="w-[120px]">{isRTL ? "رقم القيد" : "Entry #"}</TableHead>
                    <TableHead className="w-[110px]">{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "البيان" : "Description"}</TableHead>
                    <TableHead className="w-[130px] text-end">{isRTL ? "مدين" : "Debit"}</TableHead>
                    <TableHead className="w-[130px] text-end">{isRTL ? "دائن" : "Credit"}</TableHead>
                    <TableHead className="w-[140px] text-end">{isRTL ? "الرصيد" : "Balance"}</TableHead>
                    <TableHead className="w-[80px] text-center">{isRTL ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerLines.map((line, index) => (
                    <TableRow
                      key={line.id}
                      className="hover:bg-muted/50 transition-colors group"
                    >
                      <TableCell className="text-center text-muted-foreground text-sm">{index + 1}</TableCell>
                      <TableCell>
                        <button
                          className="font-mono text-sm text-primary hover:underline cursor-pointer"
                          onClick={() => navigate(`/client/journal/${line.entry_id}`)}
                        >
                          {line.entry_number}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{line.entry_date}</TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate">{line.description || "-"}</TableCell>
                      <TableCell className="text-end tabular-nums font-medium">
                        {line.debit > 0 ? (
                          <span className="text-blue-600">{formatNumber(line.debit)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-medium">
                        {line.credit > 0 ? (
                          <span className="text-red-600">{formatNumber(line.credit)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-end tabular-nums font-semibold ${line.running_balance >= 0 ? "text-green-600" : "text-orange-600"}`}>
                        {formatNumber(line.running_balance)}
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/client/journal/${line.entry_id}`)}>
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isRTL ? "عرض القيد" : "View Entry"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/client/journal/${line.entry_id}/edit`)}>
                                  <Edit className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isRTL ? "تعديل القيد" : "Edit Entry"}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell colSpan={4} className="text-end">
                      {isRTL ? "الإجمالي" : "Total"}
                    </TableCell>
                    <TableCell className="text-end tabular-nums text-blue-600">
                      {formatNumber(totals.totalDebit)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums text-red-600">
                      {formatNumber(totals.totalCredit)}
                    </TableCell>
                    <TableCell className={`text-end tabular-nums ${totals.net >= 0 ? "text-green-600" : "text-orange-600"}`}>
                      {formatNumber(totals.net)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralLedger;
