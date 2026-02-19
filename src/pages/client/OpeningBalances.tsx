import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

// Memoized account row component for opening balances
const AccountBalanceRow = memo(({
  account,
  level,
  isExpanded,
  onToggle,
  balances,
  onBalanceChange,
  getTypeColor,
  getTypeName,
}: {
  account: Account;
  level: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  balances: Map<string, OpeningBalance>;
  onBalanceChange: (accountId: string, field: "debit" | "credit", value: number) => void;
  getTypeColor: (type: string) => string;
  getTypeName: (type: string) => string;
}) => {
  const hasChildren = account.children && account.children.length > 0;
  const balance = balances.get(account.id) || { debit: 0, credit: 0 };
  const isLeafAccount = !hasChildren;

  return (
    <div
      className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg transition-colors group border-b border-border/30"
      style={{ paddingInlineStart: `${level * 20 + 8}px` }}
    >
      {/* Expand/Collapse Button */}
      {hasChildren ? (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 shrink-0"
          onClick={() => onToggle(account.id)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4 rotate-180" />
          )}
        </Button>
      ) : (
        <div className="w-6 flex justify-center shrink-0">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Account Code */}
      <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">
        {account.code}
      </span>

      {/* Account Name */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm truncate block ${hasChildren ? "font-semibold" : ""}`}>
          {account.name}
        </span>
      </div>

      {/* Account Type Badge */}
      <Badge variant="secondary" className={`${getTypeColor(account.type)} shrink-0 text-xs`}>
        {getTypeName(account.type)}
      </Badge>

      {/* Debit Input - Only for leaf accounts */}
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
          />
        ) : (
          <div className="h-8 flex items-center justify-center text-sm text-muted-foreground">
            -
          </div>
        )}
      </div>

      {/* Credit Input - Only for leaf accounts */}
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
          />
        ) : (
          <div className="h-8 flex items-center justify-center text-sm text-muted-foreground">
            -
          </div>
        )}
      </div>
    </div>
  );
});

AccountBalanceRow.displayName = "AccountBalanceRow";

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
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [user]);

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
        setCompanyId(null);
        setFlatAccounts([]);
        setBalances(new Map());
        setLoading(false);
        return;
      }
      setCompanyId(companyData.id);

      // Fetch global accounts + linked balances
      const [globalRes, linkedRes, customRes] = await Promise.all([
        supabase
          .from("global_accounts" as any)
          .select("id, code, name, name_en, type, parent_code, is_active, is_parent")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("accounts")
          .select("id, global_account_id, balance")
          .eq("company_id", companyData.id)
          .not("global_account_id", "is", null),
        supabase
          .from("accounts")
          .select("id, code, name, name_en, type, balance, parent_id, is_active, is_parent")
          .eq("company_id", companyData.id)
          .is("global_account_id", null)
          .neq("is_system", true)
          .eq("is_active", true)
          .order("code"),
      ]);

      const linkedMap = new Map<string, { id: string; balance: number | null }>();
      (linkedRes.data || []).forEach((a: any) => {
        linkedMap.set(a.global_account_id, { id: a.id, balance: a.balance });
      });

      // Merge: global accounts + custom company accounts
      const mergedAccounts: Account[] = [
        ...(globalRes.data || []).map((ga: any) => {
          const linked = linkedMap.get(ga.id);
          return {
            id: "global_" + ga.id,
            code: ga.code,
            name: ga.name,
            name_en: ga.name_en,
            type: ga.type,
            balance: linked?.balance ?? 0,
            parent_id: null,
            parent_code: ga.parent_code,
            is_active: ga.is_active,
            is_parent: ga.is_parent,
            is_global: true,
            global_account_id: ga.id,
            company_account_id: linked?.id ?? null,
          } as any;
        }),
        ...(customRes.data || []).map((a: any) => ({
          ...a,
          parent_code: null,
          is_global: false,
          global_account_id: null,
          company_account_id: a.id,
        })),
      ];

      setFlatAccounts(mergedAccounts);

      // Initialize balances from existing data
      const initialBalances = new Map<string, OpeningBalance>();
      mergedAccounts.forEach((acc: any) => {
        if (acc.balance !== null && acc.balance !== 0) {
          initialBalances.set(acc.id, {
            debit: acc.balance > 0 ? acc.balance : 0,
            credit: acc.balance < 0 ? Math.abs(acc.balance) : 0,
          });
        }
      });
      setBalances(initialBalances);

      // Expand root accounts by default
      const rootIds = mergedAccounts
        .filter((a: any) => !a.parent_id && !a.parent_code)
        .map((a: any) => a.id);
      setExpandedAccounts(rootIds);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "خطأ", description: "حدث خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Build tree structure from flat accounts
  const accountsTree = useMemo(() => {
    const byId = new Map<string, Account>();
    const globalByCode = new Map<string, Account>();
    const roots: Account[] = [];

    flatAccounts.forEach((account) => {
      const node = { ...account, children: [] };
      byId.set(account.id, node);
      if (account.is_global && account.code) {
        globalByCode.set(account.code, node);
      }
    });

    flatAccounts.forEach((account) => {
      const node = byId.get(account.id)!;

      if (account.is_global && account.parent_code) {
        const parentNode = globalByCode.get(account.parent_code);
        if (parentNode) {
          parentNode.children = parentNode.children || [];
          parentNode.children.push(node);
          return;
        }
      }

      if (!account.is_global && account.parent_id) {
        const parentNode = byId.get(account.parent_id);
        if (parentNode) {
          parentNode.children = parentNode.children || [];
          parentNode.children.push(node);
          return;
        }
      }

      if (!account.parent_code && !account.parent_id) {
        roots.push(node);
      }
    });

    return roots;
  }, [flatAccounts]);


  const toggleExpand = useCallback((accountId: string) => {
    setExpandedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  }, []);

  const expandAll = useCallback(() => {
    const allIds = flatAccounts.map((a) => a.id);
    setExpandedAccounts(allIds);
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

  // Calculate totals
  const { totalDebit, totalCredit, difference, isBalanced } = useMemo(() => {
    let debit = 0;
    let credit = 0;

    balances.forEach((balance) => {
      debit += balance.debit || 0;
      credit += balance.credit || 0;
    });

    const diff = Math.abs(debit - credit);
    return {
      totalDebit: debit,
      totalCredit: credit,
      difference: diff,
      isBalanced: diff < 0.01,
    };
  }, [balances]);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case "asset":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "liability":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "equity":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "revenue":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "expense":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  }, []);

  const getTypeName = useCallback((type: string) => {
    switch (type) {
      case "asset":
        return "أصول";
      case "liability":
        return "خصوم";
      case "equity":
        return "حقوق ملكية";
      case "revenue":
        return "إيرادات";
      case "expense":
        return "مصروفات";
      default:
        return type;
    }
  }, []);

  const handleSave = async () => {
    if (!companyId) return;

    if (!isBalanced) {
      toast({
        title: "خطأ",
        description: "الأرصدة غير متوازنة - يجب أن يتساوى إجمالي المدين مع إجمالي الدائن",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Update each account balance - handle global accounts via linked records
      for (const [accountId, balance] of balances.entries()) {
        const newBalance = balance.debit > 0 ? balance.debit : -balance.credit;
        const account = flatAccounts.find(a => a.id === accountId) as any;

        if (account?.is_global) {
          // Upsert via company_account_id if exists
          if (account.company_account_id) {
            await supabase
              .from("accounts")
              .update({ balance: newBalance })
              .eq("id", account.company_account_id);
          } else {
            // Create linked record
            await supabase.from("accounts").insert({
              company_id: companyId,
              code: account.code,
              name: account.name,
              name_en: account.name_en,
              type: account.type,
              is_parent: account.is_parent,
              is_system: false,
              balance: newBalance,
              global_account_id: account.global_account_id,
            });
          }
        } else {
          await supabase
            .from("accounts")
            .update({ balance: newBalance })
            .eq("id", accountId);
        }
      }


      toast({
        title: "تم الحفظ",
        description: "تم حفظ الأرصدة الافتتاحية بنجاح",
      });

      navigate("/client/accounts");
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "خطأ", description: "حدث خطأ في حفظ الأرصدة", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Recursive render function for account tree
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
          />
          {hasChildren && isExpanded && (
            <div>
              {account.children!.map((child) => renderAccount(child, level + 1))}
            </div>
          )}
        </div>
      );
    },
    [expandedAccounts, balances, toggleExpand, updateBalance, getTypeColor, getTypeName]
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/accounts")}>
            <BackIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("client.openingBalances.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("client.openingBalances.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            {isRTL ? "توسيع الكل" : "Expand All"}
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            {isRTL ? "طي الكل" : "Collapse All"}
          </Button>
          <Button onClick={handleSave} disabled={saving || !isBalanced}>
            {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            <Save className="h-4 w-4 me-2" />
            {t("common.save")}
          </Button>
        </div>
      </div>

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
                    ? (isRTL ? "يمكنك حفظ الأرصدة الافتتاحية" : "You can save the opening balances")
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
          {/* Header Row */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 border-b font-medium text-sm sticky top-0">
            <div className="w-6 shrink-0"></div>
            <span className="w-14 shrink-0">{isRTL ? "الرمز" : "Code"}</span>
            <div className="flex-1">{isRTL ? "اسم الحساب" : "Account Name"}</div>
            <span className="w-20 shrink-0">{isRTL ? "النوع" : "Type"}</span>
            <span className="w-28 text-center shrink-0">{t("common.debit")}</span>
            <span className="w-28 text-center shrink-0">{t("common.credit")}</span>
          </div>

          {/* Accounts Tree */}
          <div className="max-h-[60vh] overflow-y-auto">
            {accountsTree.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                {isRTL ? "لا توجد حسابات" : "No accounts found"}
              </div>
            ) : (
              accountsTree.map((account) => renderAccount(account, 0))
            )}
          </div>

          {/* Totals Row */}
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
