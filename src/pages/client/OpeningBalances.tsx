import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { attachOrphansByCodePrefix, sortTreeByCode } from "@/lib/accountTreeUtils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Save,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Account {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
  balance: number | null;
  parent_id: string | null;
  parent_code?: string | null;
  is_active: boolean | null;
  is_parent: boolean | null;
  is_global?: boolean;
  global_account_id?: string | null;
  company_account_id?: string | null;
  children?: Account[];
}

interface OpeningBalance {
  debit: number;
  credit: number;
}

interface FiscalPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
}

const calculateAccountTotals = (account: Account, balances: Map<string, OpeningBalance>): OpeningBalance => {
  const hasChildren = account.children && account.children.length > 0;
  if (!hasChildren) {
    return balances.get(account.id) || { debit: 0, credit: 0 };
  }
  let debit = 0;
  let credit = 0;
  for (const child of account.children!) {
    const childTotal = calculateAccountTotals(child, balances);
    debit += childTotal.debit;
    credit += childTotal.credit;
  }
  return { debit, credit };
};

// Memoized account row component
const AccountBalanceRow = memo(({
  account,
  level,
  isExpanded,
  onToggle,
  balances,
  onBalanceChange,
  getTypeColor,
  getTypeName,
  isLocked,
}: {
  account: Account;
  level: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  balances: Map<string, OpeningBalance>;
  onBalanceChange: (accountId: string, field: "debit" | "credit", value: number) => void;
  getTypeColor: (type: string) => string;
  getTypeName: (type: string) => string;
  isLocked: boolean;
}) => {
  const hasChildren = account.children && account.children.length > 0;
  const isLeafAccount = !hasChildren;
  const balance = isLeafAccount
    ? (balances.get(account.id) || { debit: 0, credit: 0 })
    : calculateAccountTotals(account, balances);

  const formatNum = (n: number) => n ? n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  return (
    <div
      className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg transition-colors group border-b border-border/30"
      style={{ paddingInlineStart: `${level * 20 + 8}px` }}
    >
      {hasChildren ? (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onToggle(account.id)}>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rotate-180" />}
        </Button>
      ) : (
        <div className="w-6 flex justify-center shrink-0">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">{account.code}</span>

      <div className="flex-1 min-w-0">
        <span className={`text-sm truncate block ${hasChildren ? "font-semibold" : ""}`}>{account.name}</span>
      </div>

      <Badge variant="secondary" className={`${getTypeColor(account.type)} shrink-0 text-xs`}>
        {getTypeName(account.type)}
      </Badge>

      <div className="w-28 shrink-0">
        {isLeafAccount ? (
          <Input
            type="number"
            min="0"
            step="0.01"
            value={balance.debit || ""}
            onChange={(e) => onBalanceChange(account.id, "debit", Number(e.target.value))}
            className="h-8 text-center text-sm"
            placeholder="0"
            disabled={isLocked}
          />
        ) : (
          <div className="h-8 flex items-center justify-center text-sm font-semibold text-muted-foreground">
            {balance.debit > 0 ? formatNum(balance.debit) : "-"}
          </div>
        )}
      </div>

      <div className="w-28 shrink-0">
        {isLeafAccount ? (
          <Input
            type="number"
            min="0"
            step="0.01"
            value={balance.credit || ""}
            onChange={(e) => onBalanceChange(account.id, "credit", Number(e.target.value))}
            className="h-8 text-center text-sm"
            placeholder="0"
            disabled={isLocked}
          />
        ) : (
          <div className="h-8 flex items-center justify-center text-sm font-semibold text-muted-foreground">
            {balance.credit > 0 ? formatNum(balance.credit) : "-"}
          </div>
        )}
      </div>
    </div>
  );
});

const OpeningBalances = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [flatAccounts, setFlatAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Map<string, OpeningBalance>>(new Map());
  const [savedBalances, setSavedBalances] = useState<Map<string, OpeningBalance>>(new Map());
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [fiscalPeriods, setFiscalPeriods] = useState<FiscalPeriod[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string | null>(null);
  const [isPosted, setIsPosted] = useState(false);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // Whether balances are locked (posted AND fiscal period closed)
  const isLocked = useMemo(() => {
    const fp = fiscalPeriods.find(f => f.id === selectedFiscalYearId);
    return fp?.is_closed === true;
  }, [fiscalPeriods, selectedFiscalYearId]);

  // Track unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (balances.size !== savedBalances.size) return true;
    for (const [key, val] of balances.entries()) {
      const saved = savedBalances.get(key);
      if (!saved) return val.debit !== 0 || val.credit !== 0;
      if (val.debit !== saved.debit || val.credit !== saved.credit) return true;
    }
    for (const [key] of savedBalances.entries()) {
      if (!balances.has(key)) return true;
    }
    return false;
  }, [balances, savedBalances]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [user]);

  // Re-fetch opening balances when fiscal year changes
  useEffect(() => {
    if (companyId && flatAccounts.length > 0 && selectedFiscalYearId !== undefined) {
      fetchOpeningBalances();
    }
  }, [selectedFiscalYearId, companyId, flatAccounts.length]);

  const fetchData = async () => {
    try {
      const { data: companyData } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!companyData) {
        setLoading(false);
        return;
      }
      setCompanyId(companyData.id);

      // Fetch fiscal periods and accounts in parallel
      const [fpRes, accountsRes] = await Promise.all([
        supabase
          .from("fiscal_periods")
          .select("id, name, start_date, end_date, is_closed")
          .eq("company_id", companyData.id)
          .order("start_date", { ascending: false }),
        supabase
          .from("accounts")
          .select("id, code, name, name_en, type, balance, parent_id, is_active, is_parent, is_system, global_account_id")
          .eq("company_id", companyData.id)
          .eq("is_active", true)
          .order("code"),
      ]);

      setFiscalPeriods((fpRes.data || []) as FiscalPeriod[]);

      const mergedAccounts: Account[] = (accountsRes.data || []).map((a: any) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        name_en: a.name_en,
        type: a.type,
        balance: a.balance || 0,
        parent_id: a.parent_id,
        parent_code: null,
        is_active: a.is_active,
        is_parent: a.is_parent,
        is_global: false,
        global_account_id: a.global_account_id,
        company_account_id: a.id,
      }));

      setFlatAccounts(mergedAccounts);

      // Expand all parent accounts so users can see children
      const parentIds = mergedAccounts
        .filter((a: any) => a.is_parent || !a.parent_id)
        .map((a: any) => a.id);
      setExpandedAccounts(parentIds);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "خطأ", description: "حدث خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchOpeningBalances = async () => {
    if (!companyId || flatAccounts.length === 0) return;

    try {
      let query = supabase
        .from("opening_balances" as any)
        .select("account_id, debit, credit, is_posted")
        .eq("company_id", companyId);

      if (selectedFiscalYearId) {
        query = query.eq("fiscal_year_id", selectedFiscalYearId);
      } else {
        query = query.is("fiscal_year_id", null);
      }

      const { data: obData } = await query;

      const newBalances = new Map<string, OpeningBalance>();
      let posted = false;

      (obData || []).forEach((ob: any) => {
        const account = flatAccounts.find(a => a.id === ob.account_id);
        if (account) {
          newBalances.set(account.id, { debit: Number(ob.debit) || 0, credit: Number(ob.credit) || 0 });
        }
        if (ob.is_posted) posted = true;
      });

      setBalances(newBalances);
      setSavedBalances(new Map(newBalances));
      setIsPosted(posted);
    } catch (error) {
      console.error("Error fetching opening balances:", error);
    }
  };

  // Build tree
  const accountsTree = useMemo(() => {
    const byId = new Map<string, Account>();
    const roots: Account[] = [];

    flatAccounts.forEach((account) => {
      byId.set(account.id, { ...account, children: [] });
    });

    flatAccounts.forEach((account) => {
      const node = byId.get(account.id)!;
      if (account.parent_id) {
        const parentNode = byId.get(account.parent_id);
        if (parentNode) {
          parentNode.children = parentNode.children || [];
          parentNode.children.push(node);
          return;
        }
      }
      roots.push(node);
    });

    const finalRoots = attachOrphansByCodePrefix(byId, roots);
    sortTreeByCode(finalRoots);

    return finalRoots;
  }, [flatAccounts]);

  // Auto-expand parent accounts when tree changes
  useEffect(() => {
    if (accountsTree.length === 0) return;
    const parentIds: string[] = [];
    const collectParentIds = (nodes: Account[]) => {
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) {
          parentIds.push(n.id);
          collectParentIds(n.children);
        }
      });
    };
    collectParentIds(accountsTree);
    setExpandedAccounts((prev) => {
      const merged = new Set([...prev, ...parentIds]);
      return Array.from(merged);
    });
  }, [accountsTree]);

  const toggleExpand = useCallback((accountId: string) => {
    setExpandedAccounts((prev) => prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]);
  }, []);

  const expandAll = useCallback(() => {
    setExpandedAccounts(flatAccounts.map((a) => a.id));
  }, [flatAccounts]);

  const collapseAll = useCallback(() => {
    setExpandedAccounts([]);
  }, []);

  const updateBalance = useCallback((accountId: string, field: "debit" | "credit", value: number) => {
    setBalances((prev) => {
      const newBalances = new Map(prev);
      const current = newBalances.get(accountId) || { debit: 0, credit: 0 };
      if (field === "debit" && value > 0) {
        newBalances.set(accountId, { debit: value, credit: 0 });
      } else if (field === "credit" && value > 0) {
        newBalances.set(accountId, { debit: 0, credit: value });
      } else {
        newBalances.set(accountId, { ...current, [field]: value });
      }
      return newBalances;
    });
  }, []);

  const { totalDebit, totalCredit, difference, isBalanced } = useMemo(() => {
    let debit = 0;
    let credit = 0;
    balances.forEach((balance) => { debit += balance.debit || 0; credit += balance.credit || 0; });
    const diff = Math.abs(debit - credit);
    return { totalDebit: debit, totalCredit: credit, difference: diff, isBalanced: diff < 0.01 };
  }, [balances]);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case "asset": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "liability": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "equity": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "revenue": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "expense": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  }, []);

  const getTypeName = useCallback((type: string) => {
    switch (type) {
      case "asset": return "أصول";
      case "liability": return "خصوم";
      case "equity": return "حقوق ملكية";
      case "revenue": return "إيرادات";
      case "expense": return "مصروفات";
      default: return type;
    }
  }, []);

  const saveBalances = async (post: boolean) => {
    if (!companyId) return;

    if (post && !isBalanced) {
      toast({ title: "خطأ", description: isRTL ? "الأرصدة غير متوازنة - يجب أن يتساوى إجمالي المدين مع إجمالي الدائن" : "Balances are not balanced", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const records: any[] = [];

      for (const [accountId, balance] of balances.entries()) {
        if (balance.debit === 0 && balance.credit === 0) continue;

        const account = flatAccounts.find(a => a.id === accountId);
        if (!account) continue;

        records.push({
          company_id: companyId,
          account_id: account.id,
          fiscal_year_id: selectedFiscalYearId || null,
          debit: balance.debit,
          credit: balance.credit,
          is_posted: post,
        });
      }

      // Delete existing opening balances for this fiscal year
      let deleteQuery = supabase
        .from("opening_balances" as any)
        .delete()
        .eq("company_id", companyId);

      if (selectedFiscalYearId) {
        deleteQuery = deleteQuery.eq("fiscal_year_id", selectedFiscalYearId);
      } else {
        deleteQuery = deleteQuery.is("fiscal_year_id", null);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      if (records.length > 0) {
        const { error } = await supabase.from("opening_balances" as any).insert(records);
        if (error) throw error;
      }

      if (post) setIsPosted(true);
      setSavedBalances(new Map(balances));
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: post
          ? (isRTL ? "تم ترحيل الأرصدة الافتتاحية بنجاح" : "Opening balances posted successfully")
          : (isRTL ? "تم حفظ الأرصدة الافتتاحية كمسودة" : "Opening balances saved as draft"),
      });
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "خطأ", description: isRTL ? "حدث خطأ في حفظ الأرصدة" : "Error saving balances", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderAccount = useCallback(
    (account: Account, level: number = 0): React.ReactNode => {
      const hasChildren = account.children && account.children.length > 0;
      const isExpanded = expandedAccounts.includes(account.id);
      return (
        <div key={account.id}>
          <AccountBalanceRow
            account={account}
            level={level}
            isExpanded={isExpanded}
            onToggle={toggleExpand}
            balances={balances}
            onBalanceChange={updateBalance}
            getTypeColor={getTypeColor}
            getTypeName={getTypeName}
            isLocked={isLocked}
          />
          {hasChildren && isExpanded && (
            <div>{account.children!.map((child) => renderAccount(child, level + 1))}</div>
          )}
        </div>
      );
    },
    [expandedAccounts, balances, toggleExpand, updateBalance, getTypeColor, getTypeName, isLocked]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 rtl">
        <p className="text-muted-foreground">يجب تسجيل الدخول لعرض الأرصدة الافتتاحية</p>
        <Button onClick={() => navigate("/auth")}>تسجيل الدخول</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            if (hasUnsavedChanges) {
              if (!window.confirm(isRTL ? "يوجد تغييرات غير محفوظة. هل تريد المغادرة؟" : "You have unsaved changes. Leave anyway?")) return;
            }
            navigate("/client/accounts");
          }}>
            <BackIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("client.openingBalances.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("client.openingBalances.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Fiscal Year Selector */}
          {fiscalPeriods.length > 0 && (
            <Select
              value={selectedFiscalYearId || "none"}
              onValueChange={(v) => setSelectedFiscalYearId(v === "none" ? null : v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={isRTL ? "السنة المالية" : "Fiscal Year"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isRTL ? "بدون فترة" : "No period"}</SelectItem>
                {fiscalPeriods.map((fp) => (
                  <SelectItem key={fp.id} value={fp.id}>
                    {fp.name} {fp.is_closed ? "🔒" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={expandAll}>
            {isRTL ? "توسيع الكل" : "Expand All"}
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            {isRTL ? "طي الكل" : "Collapse All"}
          </Button>

          {/* Save as Draft - always available */}
          <Button
            variant="outline"
            onClick={() => saveBalances(false)}
            disabled={saving || isLocked || !hasUnsavedChanges}
          >
            {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            <Save className="h-4 w-4 me-2" />
            {isRTL ? "حفظ مسودة" : "Save Draft"}
          </Button>

          {/* Post - requires balance */}
          <Button
            onClick={() => saveBalances(true)}
            disabled={saving || !isBalanced || isLocked}
          >
            {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {isLocked ? <Lock className="h-4 w-4 me-2" /> : <Send className="h-4 w-4 me-2" />}
            {isLocked
              ? (isRTL ? "مقفل" : "Locked")
              : (isRTL ? "ترحيل" : "Post")}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {isRTL
                  ? "يوجد تغييرات غير محفوظة - اضغط \"حفظ مسودة\" لحفظ الأرصدة"
                  : "You have unsaved changes - click \"Save Draft\" to save your balances"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked Warning */}
      {isLocked && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {isRTL
                  ? "الأرصدة الافتتاحية مقفلة لأن الفترة المالية مغلقة"
                  : "Opening balances are locked because the fiscal period is closed"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posted Status */}
      {isPosted && !isLocked && (
        <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {isRTL
                  ? "الأرصدة الافتتاحية مرحّلة - يمكنك تعديلها وإعادة الترحيل"
                  : "Opening balances are posted - you can edit and re-post"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Status Card */}
      <Card className={isBalanced ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-destructive/50 bg-destructive/5"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isBalanced ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-destructive" />
              )}
              <div>
                <p className="font-medium">
                  {isBalanced ? t("common.balanced") : t("common.notBalanced")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isBalanced
                    ? (isRTL ? "يمكنك ترحيل الأرصدة الافتتاحية" : "You can post the opening balances")
                    : `${t("common.difference")}: ${formatCurrency(difference)} ${t("common.currency")}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-8 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">{t("common.debit")} {t("common.total")}</p>
                <p className="font-bold text-lg">{formatCurrency(totalDebit)} {t("common.currency")}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">{t("common.credit")} {t("common.total")}</p>
                <p className="font-bold text-lg">{formatCurrency(totalCredit)} {t("common.currency")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Tree */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5" />
            {isRTL ? "شجرة الحسابات" : "Chart of Accounts"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 p-3 bg-muted/50 border-b font-medium text-sm sticky top-0">
            <div className="w-6 shrink-0"></div>
            <span className="w-14 shrink-0">{isRTL ? "الرمز" : "Code"}</span>
            <div className="flex-1">{isRTL ? "اسم الحساب" : "Account Name"}</div>
            <span className="w-20 shrink-0">{isRTL ? "النوع" : "Type"}</span>
            <span className="w-28 text-center shrink-0">{t("common.debit")}</span>
            <span className="w-28 text-center shrink-0">{t("common.credit")}</span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {accountsTree.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                {isRTL ? "لا توجد حسابات" : "No accounts found"}
              </div>
            ) : (
              accountsTree.map((account) => renderAccount(account, 0))
            )}
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/70 border-t font-bold sticky bottom-0">
            <div className="w-6 shrink-0"></div>
            <span className="w-14 shrink-0"></span>
            <div className="flex-1">{t("common.total")}</div>
            <span className="w-20 shrink-0"></span>
            <span className="w-28 text-center shrink-0">{formatCurrency(totalDebit)}</span>
            <span className="w-28 text-center shrink-0">{formatCurrency(totalCredit)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpeningBalances;
