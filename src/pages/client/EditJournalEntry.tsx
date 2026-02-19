import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
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
  ArrowRight, ArrowLeft, Plus, Trash2, Save, BookOpen, Loader2,
  AlertCircle, CheckCircle2, ChevronsUpDown, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

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
  const [lines, setLines] = useState<EntryLine[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load entry + accounts
  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      // Get company
      const { data: comp } = await supabase
        .from("companies").select("id").eq("owner_id", user!.id).limit(1).maybeSingle();
      if (!comp) return;
      setCompanyId(comp.id);

      // Get entry
      const { data: entry, error: entryErr } = await supabase
        .from("journal_entries").select("*").eq("id", id!).single();
      if (entryErr) throw entryErr;
      setEntryNumber(entry.entry_number);
      setEntryDate(entry.entry_date);
      setDescription(entry.description || "");

      // Get lines
      const { data: entryLines } = await supabase
        .from("journal_entry_lines").select("*").eq("entry_id", id!).order("sort_order");

      setLines((entryLines || []).map((l: any) => ({
        id: l.id,
        account_id: l.account_id,
        description: l.description || "",
        debit: l.debit || 0,
        credit: l.credit || 0,
      })));

      // Get accounts (same logic as CreateJournalEntry)
      const [globalRes, customRes, linkedRes] = await Promise.all([
        supabase.from("global_accounts" as any).select("id, code, name, name_en, type, is_parent, is_active").eq("is_active", true).order("sort_order"),
        supabase.from("accounts").select("id, code, name, name_en, type, is_parent, global_account_id").eq("company_id", comp.id).eq("is_active", true).is("global_account_id", null).or("is_parent.is.null,is_parent.eq.false").order("code"),
        supabase.from("accounts").select("id, global_account_id").eq("company_id", comp.id).not("global_account_id", "is", null),
      ]);

      const linkedMap = new Map<string, string>();
      (linkedRes.data || []).forEach((a: any) => linkedMap.set(a.global_account_id, a.id));

      const merged: Account[] = [
        ...(globalRes.data || []).filter((ga: any) => !ga.is_parent && linkedMap.has(ga.id)).map((ga: any) => ({
          id: linkedMap.get(ga.id)!, code: ga.code, name: ga.name, name_en: ga.name_en, type: ga.type, is_parent: false,
        })),
        ...(customRes.data || []).map((a: any) => ({
          id: a.id, code: a.code, name: a.name, name_en: a.name_en, type: a.type, is_parent: a.is_parent,
        })),
      ];

      const seen = new Set<string>();
      const unique = merged.filter((a) => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
      unique.sort((a, b) => a.code.localeCompare(b.code));
      setAccounts(unique);
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
    setLines((prev) => [...prev, { id: crypto.randomUUID(), account_id: "", description: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (lineId: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

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
      }));
      const { error: linesErr } = await supabase.from("journal_entry_lines").insert(newLines);
      if (linesErr) throw linesErr;

      // Recalculate account balances for all affected accounts
      const { data: entryStatus } = await supabase
        .from("journal_entries").select("status").eq("id", id).single();
      
      if (entryStatus?.status === "posted") {
        // Get all unique account IDs from old and new lines
        const accountIds = new Set<string>();
        validLines.forEach(l => accountIds.add(l.account_id));
        // Also include old accounts that may have been removed
        const { data: allEntryLines } = await supabase
          .from("journal_entry_lines").select("account_id").eq("entry_id", id!);
        allEntryLines?.forEach((l: any) => accountIds.add(l.account_id));

        for (const accountId of accountIds) {
          const { data: balanceData } = await supabase
            .from("journal_entry_lines")
            .select("debit, credit, entry_id")
            .eq("account_id", accountId);
          
          // Filter to only posted entries
          if (balanceData) {
            const postedEntryIds = new Set<string>();
            const { data: postedEntries } = await supabase
              .from("journal_entries")
              .select("id")
              .eq("company_id", companyId!)
              .eq("status", "posted");
            postedEntries?.forEach((e: any) => postedEntryIds.add(e.id));

            const net = balanceData
              .filter((l: any) => postedEntryIds.has(l.entry_id))
              .reduce((sum: number, l: any) => sum + (l.debit || 0) - (l.credit || 0), 0);

            await supabase.from("accounts").update({ balance: net }).eq("id", accountId);
          }
        }
      }

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
                <TableHead className="w-[300px]">{t("client.journal.create.account")}</TableHead>
                <TableHead>{t("client.journal.create.lineDescription")}</TableHead>
                <TableHead className="w-32">{t("client.journal.debit")}</TableHead>
                <TableHead className="w-32">{t("client.journal.credit")}</TableHead>
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
                  <TableCell>
                    <Input type="number" min="0" step="0.01" value={line.debit || ""} onChange={(e) => updateLine(line.id, "debit", Number(e.target.value))} className="text-center" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="0" step="0.01" value={line.credit || ""} onChange={(e) => updateLine(line.id, "credit", Number(e.target.value))} className="text-center" />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)} disabled={lines.length <= 2}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={2} className={isRTL ? "text-left" : "text-right"}>
                  {t("client.journal.create.total")}
                </TableCell>
                <TableCell className="text-center">{totalDebit.toFixed(2)}</TableCell>
                <TableCell className="text-center">{totalCredit.toFixed(2)}</TableCell>
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
