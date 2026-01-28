import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  BookOpen,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  account_name: string;
  description: string;
  debit: number;
  credit: number;
}

const CreateJournalEntry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isRTL, currentLanguage } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [entryNumber, setEntryNumber] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lines, setLines] = useState<EntryLine[]>([
    { id: crypto.randomUUID(), account_id: "", account_name: "", description: "", debit: 0, credit: 0 },
    { id: crypto.randomUUID(), account_id: "", account_name: "", description: "", debit: 0, credit: 0 },
  ]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const fetchInitialData = async () => {
    try {
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user?.id)
        .single();

      if (companyError) throw companyError;
      setCompanyId(companyData.id);

      // Fetch accounts (only non-parent accounts)
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, code, name, name_en, type, is_parent")
        .eq("company_id", companyData.id)
        .eq("is_active", true)
        .or("is_parent.is.null,is_parent.eq.false")
        .order("code");

      setAccounts(accountsData || []);

      // Generate entry number
      const { count } = await supabase
        .from("journal_entries")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyData.id);

      setEntryNumber(`JE-${String((count || 0) + 1).padStart(6, "0")}`);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: t("common.error"),
        description: t("client.journal.create.errors.loadingData"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAccountDisplayName = (account: Account) => {
    const name = currentLanguage === "en" && account.name_en ? account.name_en : account.name;
    return `${account.code} - ${name}`;
  };

  const updateLine = (id: string, field: keyof EntryLine, value: any) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id === id) {
          const updated = { ...line, [field]: value };
          // If selecting account, update account name
          if (field === "account_id") {
            const account = accounts.find((a) => a.id === value);
            updated.account_name = account ? getAccountDisplayName(account) : "";
          }
          // If entering debit, clear credit
          if (field === "debit" && value > 0) {
            updated.credit = 0;
          }
          // If entering credit, clear debit
          if (field === "credit" && value > 0) {
            updated.debit = 0;
          }
          return updated;
        }
        return line;
      })
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), account_id: "", account_name: "", description: "", debit: 0, credit: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSave = async (status: "draft" | "posted") => {
    if (!companyId) return;

    const validLines = lines.filter((line) => line.account_id && (line.debit > 0 || line.credit > 0));

    if (validLines.length < 2) {
      toast({
        title: t("common.error"),
        description: t("client.journal.create.errors.minTwoLines"),
        variant: "destructive",
      });
      return;
    }

    if (!isBalanced) {
      toast({
        title: t("common.error"),
        description: t("client.journal.create.errors.notBalanced"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: entryData, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          company_id: companyId,
          entry_number: entryNumber,
          entry_date: entryDate,
          description: description || null,
          status,
          total_debit: totalDebit,
          total_credit: totalCredit,
          created_by: user?.id,
          posted_at: status === "posted" ? new Date().toISOString() : null,
          posted_by: status === "posted" ? user?.id : null,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      const entryLines = validLines.map((line, index) => ({
        entry_id: entryData.id,
        account_id: line.account_id,
        description: line.description || null,
        debit: line.debit || 0,
        credit: line.credit || 0,
        sort_order: index,
      }));

      const { error: linesError } = await supabase.from("journal_entry_lines").insert(entryLines);

      if (linesError) throw linesError;

      toast({
        title: t("common.success"),
        description: status === "draft" 
          ? t("client.journal.create.success.savedAsDraft") 
          : t("client.journal.create.success.posted"),
      });

      navigate("/client/journal");
    } catch (error: any) {
      console.error("Error saving entry:", error);
      toast({
        title: t("common.error"),
        description: t("client.journal.create.errors.savingEntry"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/journal")}>
            <BackIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("client.journal.create.title")}</h1>
            <p className="text-muted-foreground">{t("client.journal.create.subtitle")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
            {t("client.journal.create.saveAsDraft")}
          </Button>
          <Button onClick={() => handleSave("posted")} disabled={saving || !isBalanced}>
            {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            <Save className="h-4 w-4 me-2" />
            {t("client.journal.create.post")}
          </Button>
        </div>
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
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("client.journal.create.statementPlaceholder")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Entry Lines */}
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
                    <Select value={line.account_id} onValueChange={(v) => updateLine(line.id, "account_id", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("client.journal.create.selectAccount")} />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {getAccountDisplayName(account)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(line.id, "description", e.target.value)}
                      placeholder={t("client.journal.create.lineDescriptionPlaceholder")}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit || ""}
                      onChange={(e) => updateLine(line.id, "debit", Number(e.target.value))}
                      className="text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit || ""}
                      onChange={(e) => updateLine(line.id, "credit", Number(e.target.value))}
                      className="text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length <= 2}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
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

          {/* Balance Status */}
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
                  {t("client.journal.create.unbalanced")} {Math.abs(totalDebit - totalCredit).toFixed(2)} {t("client.journal.create.currency")}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>{t("client.journal.create.additionalNotes")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder={t("client.journal.create.notesPlaceholder")} rows={3} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateJournalEntry;
