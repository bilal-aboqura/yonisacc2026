import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface Account {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
  balance: number | null;
  parent_id: string | null;
  is_active: boolean | null;
  is_parent: boolean | null;
  is_system: boolean | null;
  children?: Account[];
}

const ClientAccounts = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [flatAccounts, setFlatAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Edit Account Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    name_en: "",
    type: "",
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Opening Balance Dialog
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [balanceAccount, setBalanceAccount] = useState<Account | null>(null);
  const [newBalance, setNewBalance] = useState("");

  useEffect(() => {
    const fetchCompanyAndAccounts = async () => {
      if (!user) return;

      try {
        // Get company
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (companyError) throw companyError;
        if (!companyData) {
          setIsLoading(false);
          return;
        }

        setCompanyId(companyData.id);

        // Get accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from("accounts")
          .select("*")
          .eq("company_id", companyData.id)
          .order("code");

        if (accountsError) throw accountsError;

        setFlatAccounts(accountsData || []);
        
        // Build tree structure
        const tree = buildAccountTree(accountsData || []);
        setAccounts(tree);
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast.error(isRTL ? "حدث خطأ في جلب الحسابات" : "Error fetching accounts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyAndAccounts();
  }, [user, isRTL]);

  const buildAccountTree = (flatList: Account[]): Account[] => {
    const map = new Map<string, Account>();
    const roots: Account[] = [];

    // First pass: create map
    flatList.forEach((account) => {
      map.set(account.id, { ...account, children: [] });
    });

    // Second pass: build tree
    flatList.forEach((account) => {
      const node = map.get(account.id)!;
      if (account.parent_id && map.has(account.parent_id)) {
        const parent = map.get(account.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const toggleExpand = (id: string) => {
    setExpandedAccounts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "asset":
        return "bg-blue-500/10 text-blue-500";
      case "liability":
        return "bg-red-500/10 text-red-500";
      case "equity":
        return "bg-green-500/10 text-green-500";
      case "revenue":
        return "bg-emerald-500/10 text-emerald-500";
      case "expense":
        return "bg-orange-500/10 text-orange-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getTypeName = (type: string) => {
    const names: Record<string, { ar: string; en: string }> = {
      asset: { ar: "أصول", en: "Assets" },
      liability: { ar: "خصوم", en: "Liabilities" },
      equity: { ar: "ملكية", en: "Equity" },
      revenue: { ar: "إيرادات", en: "Revenue" },
      expense: { ar: "مصروفات", en: "Expenses" },
    };
    return isRTL ? names[type]?.ar || type : names[type]?.en || type;
  };

  const handleEditAccount = (account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAccount(account);
    setEditForm({
      name: account.name,
      name_en: account.name_en || "",
      type: account.type,
      is_active: account.is_active ?? true,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAccount) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("accounts")
        .update({
          name: editForm.name,
          name_en: editForm.name_en || null,
          type: editForm.type,
          is_active: editForm.is_active,
        })
        .eq("id", editingAccount.id);

      if (error) throw error;

      // Update local state
      setFlatAccounts((prev) =>
        prev.map((acc) =>
          acc.id === editingAccount.id
            ? { ...acc, ...editForm }
            : acc
        )
      );
      setAccounts(buildAccountTree(
        flatAccounts.map((acc) =>
          acc.id === editingAccount.id
            ? { ...acc, ...editForm }
            : acc
        )
      ));

      toast.success(isRTL ? "تم تحديث الحساب بنجاح" : "Account updated successfully");
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error(isRTL ? "حدث خطأ في تحديث الحساب" : "Error updating account");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenBalanceDialog = (account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setBalanceAccount(account);
    setNewBalance(account.balance?.toString() || "0");
    setBalanceDialogOpen(true);
  };

  const handleSaveBalance = async () => {
    if (!balanceAccount) return;

    setIsSaving(true);
    try {
      const balanceValue = parseFloat(newBalance) || 0;
      
      const { error } = await supabase
        .from("accounts")
        .update({ balance: balanceValue })
        .eq("id", balanceAccount.id);

      if (error) throw error;

      // Update local state
      const updatedFlat = flatAccounts.map((acc) =>
        acc.id === balanceAccount.id
          ? { ...acc, balance: balanceValue }
          : acc
      );
      setFlatAccounts(updatedFlat);
      setAccounts(buildAccountTree(updatedFlat));

      toast.success(isRTL ? "تم تحديث الرصيد الافتتاحي بنجاح" : "Opening balance updated successfully");
      setBalanceDialogOpen(false);
    } catch (error) {
      console.error("Error updating balance:", error);
      toast.error(isRTL ? "حدث خطأ في تحديث الرصيد" : "Error updating balance");
    } finally {
      setIsSaving(false);
    }
  };

  const filterAccounts = (accountList: Account[]): Account[] => {
    if (!searchTerm) return accountList;
    
    const search = searchTerm.toLowerCase();
    
    const filterRecursive = (accounts: Account[]): Account[] => {
      return accounts.reduce((filtered: Account[], account) => {
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

    return filterRecursive(accountList);
  };

  const renderAccount = (account: Account, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.includes(account.id);

    return (
      <div key={account.id}>
        <div
          className={`flex items-center gap-2 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group`}
          style={{ paddingInlineStart: `${level * 24 + 12}px` }}
          onClick={() => hasChildren && toggleExpand(account.id)}
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
            {(account.balance || 0).toLocaleString()} ر.س
          </span>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => handleOpenBalanceDialog(account, e)}
              title={isRTL ? "الرصيد الافتتاحي" : "Opening Balance"}
            >
              <DollarSign className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => handleEditAccount(account, e)}
              title={isRTL ? "تعديل" : "Edit"}
            >
              <Pencil className="h-4 w-4 text-blue-600" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {account.children!.map((child) => renderAccount(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredAccounts = filterAccounts(accounts);

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "دليل الحسابات" : "Chart of Accounts"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "هيكل الحسابات المحاسبية للشركة" : "Company's accounting structure"}
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/client/accounts/new")}>
          <Plus className="h-4 w-4" />
          {isRTL ? "حساب جديد" : "New Account"}
        </Button>
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
              {flatAccounts.length} {isRTL ? "حساب" : "accounts"}
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

      {/* Edit Account Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? "تعديل الحساب" : "Edit Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الحساب (عربي)" : "Account Name (Arabic)"}</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الحساب (إنجليزي)" : "Account Name (English)"}</Label>
              <Input
                value={editForm.name_en}
                onChange={(e) => setEditForm({ ...editForm, name_en: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "نوع الحساب" : "Account Type"}</Label>
              <Select
                value={editForm.type}
                onValueChange={(value) => setEditForm({ ...editForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">{isRTL ? "أصول" : "Assets"}</SelectItem>
                  <SelectItem value="liability">{isRTL ? "خصوم" : "Liabilities"}</SelectItem>
                  <SelectItem value="equity">{isRTL ? "حقوق ملكية" : "Equity"}</SelectItem>
                  <SelectItem value="revenue">{isRTL ? "إيرادات" : "Revenue"}</SelectItem>
                  <SelectItem value="expense">{isRTL ? "مصروفات" : "Expenses"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
};

export default ClientAccounts;
