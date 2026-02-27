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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  Loader2,
  Trash2
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
  onDelete,
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
  onDelete: (account: Account, e: React.MouseEvent) => void;
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
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => onEdit(account, e)}
          title={isRTL ? "تعديل" : "Edit"}
        >
          <Pencil className="h-4 w-4 text-blue-600" />
        </Button>
        {!account.is_global && !account.is_system && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => onDelete(account, e)}
            title={isRTL ? "حذف" : "Delete"}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
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
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [flatAccounts, setFlatAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete Confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);

  // Opening Balance Dialog
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [balanceAccount, setBalanceAccount] = useState<Account | null>(null);
  const [newBalance, setNewBalance] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchCompanyAndAccounts = async () => {
      if (!user) {
        if (!isMounted) return;
        setCompanyId(null);
        setFlatAccounts([]);
        setIsLoading(false);
        return;
      }

      if (isMounted) setIsLoading(true);

      try {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("id")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (companyError) throw companyError;
        if (!companyData) {
          if (isMounted) {
            setCompanyId(null);
            setFlatAccounts([]);
          }
          return;
        }

        if (!isMounted) return;
        setCompanyId(companyData.id);

        const [accountsRes, balanceRes] = await Promise.all([
          supabase
            .from("accounts")
            .select("*")
            .eq("company_id", companyData.id)
            .eq("is_active", true)
            .order("code"),
          (supabase.rpc as any)("get_account_balances", {
            p_company_id: companyData.id,
          }),
        ]);

        if (accountsRes.error) throw accountsRes.error;
        if (balanceRes.error) throw balanceRes.error;

        const balanceMap = new Map<string, number>();
        if (balanceRes.data && typeof balanceRes.data === "object") {
          Object.entries(balanceRes.data).forEach(([accountId, balance]) => {
            balanceMap.set(accountId, Number(balance) || 0);
          });
        }

        const merged: Account[] = (accountsRes.data || []).map((a: any) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          name_en: a.name_en,
          type: a.type,
          balance: balanceMap.get(a.id) || 0,
          parent_id: a.parent_id,
          parent_code: null,
          is_active: a.is_active,
          is_parent: a.is_parent,
          is_system: a.is_system || false,
          is_global: false,
          global_account_id: a.global_account_id,
          company_account_id: a.id,
        }));

        if (isMounted) {
          setFlatAccounts(merged);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast.error(isRTL ? "حدث خطأ في جلب الحسابات" : "Error fetching accounts");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCompanyAndAccounts();

    return () => {
      isMounted = false;
    };
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
      // No parent or parent not found - it's a root
      if (!account.parent_id) {
        roots.push(node);
      }
    });

    const sortChildren = (nodes: Account[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      nodes.forEach(n => {
        if (n.children && n.children.length > 0) sortChildren(n.children);
      });
    };
    sortChildren(roots);

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
    if (account.global_account_id) {
      navigate(`/client/accounts/${account.global_account_id}/edit?global=true`);
    } else {
      navigate(`/client/accounts/${account.id}/edit`);
    }
  }, [navigate]);

  const handleOpenBalanceDialog = useCallback((account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setBalanceAccount(account);
    setNewBalance(account.balance?.toString() || "0");
    setBalanceDialogOpen(true);
  }, []);

  const handleDeleteAccount = useCallback((account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteAccount(account);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeleteAccount = async () => {
    if (!deleteAccount || !companyId) return;
    
    setIsDeleting(true);
    try {
      const accountId = deleteAccount.company_account_id || deleteAccount.id;
      
      // Check for journal entry lines
      const { count: journalCount } = await supabase
        .from("journal_entry_lines")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);

      if (journalCount && journalCount > 0) {
        toast.error(isRTL ? "لا يمكن حذف الحساب - يوجد عليه قيود يومية" : "Cannot delete account - has journal entries");
        setDeleteDialogOpen(false);
        setIsDeleting(false);
        return;
      }

      // Check for opening balances
      const { count: obCount } = await supabase
        .from("opening_balances")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);

      if (obCount && obCount > 0) {
        toast.error(isRTL ? "لا يمكن حذف الحساب - يوجد عليه أرصدة افتتاحية" : "Cannot delete account - has opening balances");
        setDeleteDialogOpen(false);
        setIsDeleting(false);
        return;
      }

      // Check for child accounts
      const { count: childCount } = await supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", accountId);

      if (childCount && childCount > 0) {
        toast.error(isRTL ? "لا يمكن حذف الحساب - يحتوي على حسابات فرعية" : "Cannot delete account - has child accounts");
        setDeleteDialogOpen(false);
        setIsDeleting(false);
        return;
      }

      // Check for invoices
      const { count: contactCount } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);

      if (contactCount && contactCount > 0) {
        toast.error(isRTL ? "لا يمكن حذف الحساب - مرتبط بجهات اتصال" : "Cannot delete account - linked to contacts");
        setDeleteDialogOpen(false);
        setIsDeleting(false);
        return;
      }

      // Check treasury transactions
      const { count: treasuryCount } = await supabase
        .from("treasury_transactions")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);

      if (treasuryCount && treasuryCount > 0) {
        toast.error(isRTL ? "لا يمكن حذف الحساب - يوجد عليه حركات خزينة" : "Cannot delete account - has treasury transactions");
        setDeleteDialogOpen(false);
        setIsDeleting(false);
        return;
      }

      // Safe to delete
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", accountId)
        .eq("company_id", companyId);

      if (error) throw error;

      setFlatAccounts((prev) => prev.filter((a) => a.id !== deleteAccount.id));
      toast.success(isRTL ? "تم حذف الحساب بنجاح" : "Account deleted successfully");
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(isRTL ? "حدث خطأ في حذف الحساب" : "Error deleting account");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveBalance = async () => {
    if (!balanceAccount || !companyId) return;

    setIsSaving(true);
    try {
      const balanceValue = parseFloat(newBalance) || 0;

      let targetAccountId = balanceAccount.company_account_id || balanceAccount.id;

      if (balanceAccount.is_global && !balanceAccount.company_account_id) {
        const { data: inserted, error: createError } = await supabase
          .from("accounts")
          .insert({
            company_id: companyId,
            code: balanceAccount.code,
            name: balanceAccount.name,
            name_en: balanceAccount.name_en,
            type: balanceAccount.type,
            is_parent: balanceAccount.is_parent,
            is_system: false,
            global_account_id: balanceAccount.global_account_id,
            is_active: true,
          })
          .select("id")
          .single();

        if (createError) throw createError;

        targetAccountId = inserted.id;

        setFlatAccounts((prev) =>
          prev.map((a) =>
            a.id === balanceAccount.id
              ? { ...a, company_account_id: inserted.id }
              : a,
          ),
        );
      }

      const debit = balanceValue > 0 ? balanceValue : 0;
      const credit = balanceValue < 0 ? Math.abs(balanceValue) : 0;

      const { error: deleteError } = await supabase
        .from("opening_balances" as any)
        .delete()
        .eq("company_id", companyId)
        .eq("account_id", targetAccountId)
        .is("fiscal_year_id", null);

      if (deleteError) throw deleteError;

      if (debit > 0 || credit > 0) {
        const { error: insertError } = await supabase
          .from("opening_balances" as any)
          .insert({
            company_id: companyId,
            account_id: targetAccountId,
            debit,
            credit,
            fiscal_year_id: null,
            is_posted: false,
          });

        if (insertError) throw insertError;
      }

      const { data: balanceData, error: balanceError } = await (supabase.rpc as any)("get_account_balances", {
        p_company_id: companyId,
      });

      if (balanceError) throw balanceError;

      const balanceMap = new Map<string, number>();
      if (balanceData && typeof balanceData === "object") {
        Object.entries(balanceData).forEach(([accountId, balance]) => {
          balanceMap.set(accountId, Number(balance) || 0);
        });
      }

      setFlatAccounts((prev) =>
        prev.map((a) => {
          const sourceAccountId = a.is_global ? a.company_account_id : a.id;
          return {
            ...a,
            balance: sourceAccountId ? balanceMap.get(sourceAccountId) || 0 : 0,
          };
        }),
      );

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
          onDelete={handleDeleteAccount}
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
  }, [expandedAccounts, isRTL, t, toggleExpand, handleEditAccount, handleOpenBalanceDialog, handleDeleteAccount, getTypeColor, getTypeName, calculateTotalBalance]);

  const totalAccountsCount = flatAccounts.length;

  if (isLoading || authLoading) {
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? "تأكيد حذف الحساب" : "Confirm Account Deletion"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL 
                ? `هل أنت متأكد من حذف الحساب "${deleteAccount?.code} - ${deleteAccount?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete account "${deleteAccount?.code} - ${deleteAccount?.name_en || deleteAccount?.name}"? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {isRTL ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

ClientAccounts.displayName = "ClientAccounts";

export default ClientAccounts;
