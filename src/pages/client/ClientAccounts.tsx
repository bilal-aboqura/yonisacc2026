import { useState, useEffect, useMemo, useCallback, memo, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  ClipboardList, 
  FileText,
  Pencil,
  DollarSign,
  Loader2
} from "lucide-react";

// Unified type that works for both global and company accounts
interface Account {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
  balance: number | null;
  parent_id: string | null;   // for company accounts
  parent_code: string | null; // for global accounts
  is_active: boolean | null;
  is_parent: boolean | null;
  is_system: boolean | null;
  is_global?: boolean;        // true = from global_accounts
  global_account_id?: string | null;
  company_account_id?: string | null; // the accounts.id if exists for balance tracking
  children?: Account[];
}

// Memoized account row component
const AccountRow = memo(({ 
  account, 
  level, 
  isExpanded, 
  isRTL,
  currency,
  onToggle, 
  onEdit, 
  onBalance,
  getTypeColor,
  getTypeName,
  displayBalance
}: {
  account: Account;
  level: number;
  isExpanded: boolean;
  isRTL: boolean;
  currency: string;
  onToggle: (id: string) => void;
  onEdit: (account: Account, e: React.MouseEvent) => void;
  onBalance: (account: Account, e: React.MouseEvent) => void;
  getTypeColor: (type: string) => string;
  getTypeName: (type: string) => string;
  displayBalance: number;
}) => {
  const hasChildren = account.children && account.children.length > 0;

  return (
    <div
      className="flex items-center gap-2 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group"
      style={{ paddingInlineStart: `${level * 24 + 12}px` }}
      onClick={() => hasChildren && onToggle(account.id)}
    >
      {hasChildren ? (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            isRTL ? <ChevronRight className="h-4 w-4 rotate-180" /> : <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      ) : (
        <div className="w-6 flex justify-center shrink-0">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      
      <span className="font-mono text-sm text-muted-foreground w-16 shrink-0">{account.code}</span>
      
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate block">
          {isRTL ? account.name : (account.name_en || account.name)}
        </span>
      </div>

      <Badge variant="secondary" className={`${getTypeColor(account.type)} shrink-0`}>
        {getTypeName(account.type)}
      </Badge>

      {account.is_global && (
        <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground border-dashed">
          {isRTL ? "موحد" : "Global"}
        </Badge>
      )}

      <span className="font-mono text-sm w-28 text-end shrink-0">
        {displayBalance.toLocaleString()} {currency}
      </span>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => onBalance(account, e)}
          title={isRTL ? "الرصيد الافتتاحي" : "Opening Balance"}
        >
          <DollarSign className="h-4 w-4 text-green-600" />
        </Button>
        {!account.is_global && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => onEdit(account, e)}
            title={isRTL ? "تعديل" : "Edit"}
          >
            <Pencil className="h-4 w-4 text-blue-600" />
          </Button>
        )}
      </div>
    </div>
  );
});

AccountRow.displayName = 'AccountRow';

const ClientAccounts = forwardRef<HTMLDivElement>((_, ref) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [flatAccounts, setFlatAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Opening Balance Dialog
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [balanceAccount, setBalanceAccount] = useState<Account | null>(null);
  const [newBalance, setNewBalance] = useState("");

  useEffect(() => {
    const fetchCompanyAndAccounts = async () => {
      if (!user) {
        setCompanyId(null);
        setFlatAccounts([]);
        setIsLoading(false);
        return;
      }

      try {
        // Get company
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("id")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (companyError) throw companyError;
        if (!companyData) return;

        setCompanyId(companyData.id);

        // Fetch global accounts and company accounts in parallel
        const [globalRes, companyRes] = await Promise.all([
          supabase
            .from("global_accounts" as any)
            .select("*")
            .eq("is_active", true)
            .order("sort_order"),
          supabase
            .from("accounts")
            .select("*")
            .eq("company_id", companyData.id)
            .is("global_account_id", null) // only custom company accounts
            .order("code"),
        ]);

        if (globalRes.error) throw globalRes.error;

        // Also fetch company accounts that have global_account_id (for balances)
        const { data: linkedAccountsData } = await supabase
          .from("accounts")
          .select("id, global_account_id, balance")
          .eq("company_id", companyData.id)
          .not("global_account_id", "is", null);

        const linkedMap = new Map<string, { id: string; balance: number | null }>();
        (linkedAccountsData || []).forEach((a: any) => {
          linkedMap.set(a.global_account_id, { id: a.id, balance: a.balance });
        });

        const globalAccounts = (globalRes.data || []) as any[];
        const companyAccounts = (companyRes.data || []) as any[];

        // Build merged flat list
        // Global accounts get a virtual id = "global_" + ga.id
        const merged: Account[] = [
          ...globalAccounts.map((ga: any) => {
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
              is_system: true,
              is_global: true,
              global_account_id: ga.id,
              company_account_id: linked?.id ?? null,
            };
          }),
          ...companyAccounts.map((a: any) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            name_en: a.name_en,
            type: a.type,
            balance: a.balance,
            parent_id: a.parent_id,
            parent_code: null,
            is_active: a.is_active,
            is_parent: a.is_parent,
            is_system: false,
            is_global: false,
            global_account_id: null,
            company_account_id: a.id,
          })),
        ];

        setFlatAccounts(merged);
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast.error(isRTL ? "حدث خطأ في جلب الحسابات" : "Error fetching accounts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyAndAccounts();
  }, [user, isRTL]);

  // Calculate total balance for an account including all children recursively
  const calculateTotalBalance = useCallback((account: Account): number => {
    const childrenTotal = (account.children || []).reduce(
      (sum, child) => sum + calculateTotalBalance(child),
      0
    );
    const hasChildren = account.children && account.children.length > 0;
    return hasChildren ? childrenTotal : (account.balance || 0);
  }, []);

  // Build tree: global accounts use parent_code, company accounts use parent_id
  const accounts = useMemo(() => {
    // Map by id for company accounts, also map global accounts by code
    const byId = new Map<string, Account>();
    const globalByCode = new Map<string, Account>();
    const roots: Account[] = [];

    flatAccounts.forEach((account) => {
      const node = { ...account, children: [] };
      byId.set(account.id, node);
      if (account.is_global) {
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

  const toggleExpand = useCallback((id: string) => {
    setExpandedAccounts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case "asset": return "bg-blue-500/10 text-blue-500";
      case "liability": return "bg-red-500/10 text-red-500";
      case "equity": return "bg-green-500/10 text-green-500";
      case "revenue": return "bg-emerald-500/10 text-emerald-500";
      case "expense": return "bg-orange-500/10 text-orange-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  }, []);

  const getTypeName = useCallback((type: string) => {
    const names: Record<string, { ar: string; en: string }> = {
      asset: { ar: "أصول", en: "Assets" },
      liability: { ar: "خصوم", en: "Liabilities" },
      equity: { ar: "ملكية", en: "Equity" },
      revenue: { ar: "إيرادات", en: "Revenue" },
      expense: { ar: "مصروفات", en: "Expenses" },
    };
    return isRTL ? names[type]?.ar || type : names[type]?.en || type;
  }, [isRTL]);

  const handleEditAccount = useCallback((account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/client/accounts/${account.id}/edit`);
  }, [navigate]);

  const handleOpenBalanceDialog = useCallback((account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setBalanceAccount(account);
    setNewBalance(account.balance?.toString() || "0");
    setBalanceDialogOpen(true);
  }, []);

  const handleSaveBalance = async () => {
    if (!balanceAccount || !companyId) return;

    setIsSaving(true);
    try {
      const balanceValue = parseFloat(newBalance) || 0;

      if (balanceAccount.is_global) {
        // For global accounts: upsert a record in accounts table linking to global_account
        if (balanceAccount.company_account_id) {
          // Update existing linked record
          const { error } = await supabase
            .from("accounts")
            .update({ balance: balanceValue })
            .eq("id", balanceAccount.company_account_id);
          if (error) throw error;
        } else {
          // Create new linked record
          const { data: inserted, error } = await supabase
            .from("accounts")
            .insert({
              company_id: companyId,
              code: balanceAccount.code,
              name: balanceAccount.name,
              name_en: balanceAccount.name_en,
              type: balanceAccount.type,
              is_parent: balanceAccount.is_parent,
              is_system: false,
              balance: balanceValue,
              global_account_id: balanceAccount.global_account_id,
            })
            .select("id")
            .single();
          if (error) throw error;

          // Update local state with the new company_account_id
          setFlatAccounts(prev => prev.map(a =>
            a.id === balanceAccount.id
              ? { ...a, company_account_id: inserted.id, balance: balanceValue }
              : a
          ));
        }
      } else {
        // For custom company accounts: update directly
        const { error } = await supabase
          .from("accounts")
          .update({ balance: balanceValue })
          .eq("id", balanceAccount.id);
        if (error) throw error;
      }

      // Update local state balance
      setFlatAccounts(prev => prev.map(a =>
        a.id === balanceAccount.id
          ? { ...a, balance: balanceValue }
          : a
      ));

      toast.success(isRTL ? "تم تحديث الرصيد الافتتاحي بنجاح" : "Opening balance updated successfully");
      setBalanceDialogOpen(false);
    } catch (error) {
      console.error("Error updating balance:", error);
      toast.error(isRTL ? "حدث خطأ في تحديث الرصيد" : "Error updating balance");
    } finally {
      setIsSaving(false);
    }
  };

  // Memoized filtered accounts
  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return accounts;
    
    const search = searchTerm.toLowerCase();
    
    const filterRecursive = (accountList: Account[]): Account[] => {
      return accountList.reduce((filtered: Account[], account) => {
        const matchesSearch = 
          account.name.toLowerCase().includes(search) ||
          (account.name_en?.toLowerCase() || "").includes(search) ||
          account.code.includes(search);

        const filteredChildren = account.children 
          ? filterRecursive(account.children) 
          : [];

        if (matchesSearch || filteredChildren.length > 0) {
          filtered.push({
            ...account,
            children: filteredChildren.length > 0 ? filteredChildren : account.children,
          });
        }

        return filtered;
      }, []);
    };

    return filterRecursive(accounts);
  }, [accounts, searchTerm]);

  // Memoized render function
  const renderAccount = useCallback((account: Account, level: number = 0): React.ReactNode => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.includes(account.id);
    const totalBalance = calculateTotalBalance(account);
    const currency = t("common.currency");

    return (
      <div key={account.id}>
        <AccountRow
          account={account}
          level={level}
          isExpanded={isExpanded}
          isRTL={isRTL}
          currency={currency}
          onToggle={toggleExpand}
          onEdit={handleEditAccount}
          onBalance={handleOpenBalanceDialog}
          getTypeColor={getTypeColor}
          getTypeName={getTypeName}
          displayBalance={totalBalance}
        />
        {hasChildren && isExpanded && (
          <div>
            {account.children!.map((child) => renderAccount(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedAccounts, isRTL, t, toggleExpand, handleEditAccount, handleOpenBalanceDialog, getTypeColor, getTypeName, calculateTotalBalance]);

  const totalAccountsCount = flatAccounts.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div ref={ref} className={`space-y-3 ${isRTL ? "rtl" : "ltr"}`}>
        <h1 className="text-2xl font-bold text-foreground">{isRTL ? "دليل الحسابات" : "Chart of Accounts"}</h1>
        <p className="text-muted-foreground">{isRTL ? "يجب تسجيل الدخول لعرض دليل الحسابات" : "Please sign in to view the chart of accounts"}</p>
        <div>
          <Button onClick={() => navigate("/auth")}>{isRTL ? "تسجيل الدخول" : "Sign in"}</Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "دليل الحسابات" : "Chart of Accounts"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "الدليل الموحد المشترك لجميع الشركات" : "Unified chart of accounts for all companies"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => navigate("/client/accounts/new")}>
            <Plus className="h-4 w-4" />
            {isRTL ? "حساب إضافي" : "Add Account"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث بالاسم أو رقم الحساب..." : "Search by name or account number..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Accounts Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {isRTL ? "شجرة الحسابات" : "Accounts Tree"}
            <Badge variant="outline" className="ms-2">
              {totalAccountsCount} {isRTL ? "حساب" : "accounts"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm 
                ? (isRTL ? "لا توجد نتائج للبحث" : "No search results")
                : (isRTL ? "لا توجد حسابات" : "No accounts found")
              }
            </div>
          ) : (
            <div className="divide-y">
              {filteredAccounts.map((account) => renderAccount(account))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opening Balance Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? "الرصيد الافتتاحي" : "Opening Balance"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {isRTL ? "الحساب" : "Account"}
              </p>
              <p className="font-medium">
                {balanceAccount?.code} - {isRTL ? balanceAccount?.name : (balanceAccount?.name_en || balanceAccount?.name)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الرصيد الافتتاحي" : "Opening Balance"}</Label>
              <Input
                type="number"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="text-end"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSaveBalance} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

ClientAccounts.displayName = "ClientAccounts";

export default ClientAccounts;
