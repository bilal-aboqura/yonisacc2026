import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  ArrowRight, ArrowLeft, Plus, Trash2, Save, BookOpen, Loader2,
  AlertCircle, CheckCircle2, ChevronsUpDown, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import CostCenterCombobox, { CostCenter } from "@/components/client/CostCenterCombobox";

interface Account {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
  is_parent: boolean | null;
}

interface EntryLine {
  id: string;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
  cost_center_id: string;
}

const AccountCombobox = ({
  accounts, value, onSelect, getAccountDisplayName, placeholder, isRTL,
}: {
  accounts: Account[]; value: string; onSelect: (v: string) => void;
  getAccountDisplayName: (a: Account) => string; placeholder: string; isRTL: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const selected = accounts.find((a) => a.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className="truncate">{selected ? getAccountDisplayName(selected) : placeholder}</span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder={isRTL ? "ابحث بالرمز أو الاسم..." : "Search by code or name..."} />
          <CommandList>
            <CommandEmpty>{isRTL ? "لا توجد نتائج" : "No results found"}</CommandEmpty>
            <CommandGroup>
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.code} ${account.name} ${account.name_en || ""}`}
                  onSelect={() => { onSelect(account.id); setOpen(false); }}
                >
                  <Check className={`me-2 h-4 w-4 ${value === account.id ? "opacity-100" : "opacity-0"}`} />
                  <span className="font-mono text-xs me-2">{account.code}</span>
                  <span className="truncate">{isRTL ? account.name : account.name_en || account.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const EditJournalEntry = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isRTL, currentLanguage } = useLanguage();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const [saving, setSaving] = useState(false);
  const [entryNumber, setEntryNumber] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [lines, setLines] = useState<EntryLine[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [balanceCache, setBalanceCache] = useState<Record<string, number>>({});

  const fetchBalances = useCallback(async (cId: string) => {
    try {
      const { data, error } = await (supabase.rpc as any)("get_account_balances", { p_company_id: cId });
      if (!error && data) {
        const balances: Record<string, number> = {};
        Object.entries(data).forEach(([accountId, balance]) => {
          balances[accountId] = Number(balance) || 0;
        });
        setBalanceCache(balances);
      }
    } catch (e) {
      console.error("Error fetching balances:", e);
    }
  }, []);

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      // Load entry first and use its company_id to avoid mismatched accounts across companies
      const { data: entry, error: entryErr } = await supabase
        .from("journal_entries")
        .select("id, company_id, entry_number, entry_date, description")
        .eq("id", id!)
        .single();
      if (entryErr) throw entryErr;

      const cId = entry.company_id as string;
      setCompanyId(cId);
      setEntryNumber(entry.entry_number);
      setEntryDate(entry.entry_date);
      setDescription(entry.description || "");

      // Load lines + account/cost-center options in parallel
      const [linesRes, allCompanyAccounts, globalRes, ccRes] = await Promise.all([
        supabase
          .from("journal_entry_lines")
          .select("*, accounts:account_id(code, name, name_en), cost_center_id")
          .eq("entry_id", id!)
          .order("sort_order"),
        supabase
          .from("accounts")
          .select("id, code, name, name_en, type, is_parent, global_account_id")
          .eq("company_id", cId)
          .order("code"),
        supabase
          .from("global_accounts" as any)
          .select("id, code, name, name_en, type")
          .eq("is_parent", false),
        supabase
          .from("cost_centers")
          .select("id, code, name, name_en")
          .eq("company_id", cId)
          .eq("is_active", true)
          .order("code"),
      ]);

      const entryLines = (linesRes.data || []) as any[];
      setLines(entryLines.map((l: any) => ({
        id: l.id,
        account_id: l.account_id,
        description: l.description || "",
        debit: l.debit || 0,
        credit: l.credit || 0,
        cost_center_id: l.cost_center_id || "",
      })));

      // Balance cache for preview column
      fetchBalances(cId);

      // Build global account lookup for display names
      const globalMap = new Map<string, any>();
      (globalRes.data || []).forEach((ga: any) => globalMap.set(ga.id, ga));

      // Build base list from company accounts
      const accountsList: Account[] = ((allCompanyAccounts.data || []) as any[])
        .filter((a: any) => !a.is_parent)
        .map((a: any) => {
          const ga = a.global_account_id ? globalMap.get(a.global_account_id) : null;
          return {
            id: a.id,
            code: ga?.code || a.code,
            name: ga?.name || a.name,
            name_en: ga?.name_en || a.name_en,
            type: ga?.type || a.type,
            is_parent: false,
          };
        });

      // Ensure selected line accounts are always present in dropdown (even if inactive/not in base list)
      const existingIds = new Set(accountsList.map((a) => a.id));
      entryLines.forEach((l: any) => {
        if (!l.account_id || existingIds.has(l.account_id)) return;
        const linked = l.accounts;
        accountsList.push({
          id: l.account_id,
          code: linked?.code || "",
          name: linked?.name || (isRTL ? "حساب" : "Account"),
          name_en: linked?.name_en || null,
          type: "asset",
          is_parent: false,
        });
        existingIds.add(l.account_id);
      });

      accountsList.sort((a, b) => a.code.localeCompare(b.code));
      setAccounts(accountsList);
      setCostCenters((ccRes.data || []) as CostCenter[]);
    } catch (error: any) {
      console.error("Error loading:", error);
      toast({ title: t("common.error"), description: error?.message || "Error loading data", variant: "destructive" });
    } finally {
      setLoaded(true);
    }
  };

  const getAccountDisplayName = (account: Account) => {
    const name = currentLanguage === "en" && account.name_en ? account.name_en : account.name;
    return `${account.code} - ${name}`;
  };

  const updateLine = (lineId: string, field: keyof EntryLine, value: any) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const updated = { ...line, [field]: value };
        if (field === "debit" && value > 0) updated.credit = 0;
        if (field === "credit" && value > 0) updated.debit = 0;
        return updated;
      })
    );
  };

  const addLine = () => {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), account_id: "", description: "", debit: 0, credit: 0, cost_center_id: "" }]);
  };

  const removeLine = (lineId: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const getBalanceAfter = (line: EntryLine): number | null => {
    if (!line.account_id) return null;
    const account = accounts.find(a => a.id === line.account_id);
    if (!account) return null;
    const currentBalance = balanceCache[line.account_id] ?? 0;
    const isDebitNormal = ['asset', 'expense'].includes(account.type);
    if (isDebitNormal) {
      return currentBalance + (line.debit || 0) - (line.credit || 0);
    } else {
      return currentBalance - (line.debit || 0) + (line.credit || 0);
    }
  };

  const handleSave = async () => {
    if (!companyId || !id) return;
    const validLines = lines.filter((l) => l.account_id && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      toast({ title: t("common.error"), description: t("client.journal.create.errors.minTwoLines"), variant: "destructive" });
      return;
    }
    if (!isBalanced) {
      toast({ title: t("common.error"), description: t("client.journal.create.errors.notBalanced"), variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Update entry
      const { error: entryErr } = await supabase
        .from("journal_entries")
        .update({
          entry_number: entryNumber,
          entry_date: entryDate,
          description: description || null,
          total_debit: totalDebit,
          total_credit: totalCredit,
        })
        .eq("id", id);
      if (entryErr) throw entryErr;

      // Delete old lines, insert new
      await supabase.from("journal_entry_lines").delete().eq("entry_id", id);
      const newLines = validLines.map((l, i) => ({
        entry_id: id,
        account_id: l.account_id,
        description: l.description || null,
        debit: l.debit || 0,
        credit: l.credit || 0,
        sort_order: i,
        cost_center_id: l.cost_center_id || null,
      }));
      const { error: linesErr } = await supabase.from("journal_entry_lines").insert(newLines);
      if (linesErr) throw linesErr;

      // No need to manually recalculate balances - 
      // balances are computed dynamically via get_account_balances() server function

      toast({ title: isRTL ? "تم الحفظ" : "Saved", description: isRTL ? "تم تحديث القيد بنجاح" : "Entry updated successfully" });
      navigate("/client/journal");
    } catch (error: any) {
      console.error("Error saving:", error);
      toast({ title: t("common.error"), description: error?.message || "Error saving", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/journal")}>
            <BackIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? "تعديل القيد" : "Edit Journal Entry"}</h1>
            <p className="text-muted-foreground">{entryNumber}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !isBalanced}>
          {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
          <Save className="h-4 w-4 me-2" />
          {isRTL ? "حفظ التعديلات" : "Save Changes"}
        </Button>
      </div>

      {/* Entry Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t("client.journal.create.entryDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t("client.journal.create.entryNumber")}</Label>
            <Input value={entryNumber} onChange={(e) => setEntryNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("client.journal.create.entryDate")}</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("client.journal.create.statement")}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("client.journal.create.entryLines")}</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("client.journal.create.addLine")}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">{t("client.journal.create.account")}</TableHead>
                <TableHead>{t("client.journal.create.lineDescription")}</TableHead>
                {costCenters.length > 0 && (
                  <TableHead className="w-[180px]">{isRTL ? "مركز التكلفة" : "Cost Center"}</TableHead>
                )}
                <TableHead className="w-32">{t("client.journal.debit")}</TableHead>
                <TableHead className="w-32">{t("client.journal.credit")}</TableHead>
                <TableHead className="w-28 text-center">
                  <span className="text-xs text-muted-foreground">{isRTL ? "الرصيد بعد" : "Balance After"}</span>
                </TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <AccountCombobox
                      accounts={accounts}
                      value={line.account_id}
                      onSelect={(v) => updateLine(line.id, "account_id", v)}
                      getAccountDisplayName={getAccountDisplayName}
                      placeholder={t("client.journal.create.selectAccount")}
                      isRTL={isRTL}
                    />
                  </TableCell>
                  <TableCell>
                    <Input value={line.description} onChange={(e) => updateLine(line.id, "description", e.target.value)} />
                  </TableCell>
                  {costCenters.length > 0 && (
                    <TableCell>
                      <CostCenterCombobox
                        costCenters={costCenters}
                        value={line.cost_center_id}
                        onSelect={(v) => updateLine(line.id, "cost_center_id", v)}
                        isRTL={isRTL}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Input type="number" min="0" step="0.01" value={line.debit || ""} onChange={(e) => updateLine(line.id, "debit", Number(e.target.value))} className="text-center" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="0" step="0.01" value={line.credit || ""} onChange={(e) => updateLine(line.id, "credit", Number(e.target.value))} className="text-center" />
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`text-xs text-end tabular-nums cursor-default ${
                            (() => {
                              const bal = getBalanceAfter(line);
                              if (bal === null) return 'text-muted-foreground';
                              return bal < 0 ? 'text-destructive' : 'text-muted-foreground';
                            })()
                          }`}>
                            {(() => {
                              const bal = getBalanceAfter(line);
                              if (bal === null) return '—';
                              return bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            })()}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isRTL ? "الرصيد الحالي قبل الترحيل" : "Current Balance Before Posting"}</p>
                          <p className="font-mono text-xs">
                            {(balanceCache[line.account_id] ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)} disabled={lines.length <= 2}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={costCenters.length > 0 ? 3 : 2} className={isRTL ? "text-left" : "text-right"}>
                  {t("client.journal.create.total")}
                </TableCell>
                <TableCell className="text-center">{totalDebit.toFixed(2)}</TableCell>
                <TableCell className="text-center">{totalCredit.toFixed(2)}</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="mt-4">
            {isBalanced ? (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  {t("client.journal.create.balanced")}
                </AlertDescription>
              </Alert>
            ) : totalDebit > 0 || totalCredit > 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("client.journal.create.unbalanced")} {Math.abs(totalDebit - totalCredit).toFixed(2)}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditJournalEntry;
