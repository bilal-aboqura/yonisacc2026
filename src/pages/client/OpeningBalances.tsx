import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, Save, FileSpreadsheet, Loader2, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

interface OpeningBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
}

const OpeningBalances = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<OpeningBalance[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

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
        .maybeSingle();

      if (!companyData) {
        setCompanyId(null);
        setAccounts([]);
        setBalances([]);
        return;
      }
      setCompanyId(companyData.id);

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, code, name, type, balance")
        .eq("company_id", companyData.id)
        .eq("is_active", true)
        .or("is_parent.is.null,is_parent.eq.false")
        .order("code");

      setAccounts(accountsData || []);

      // Initialize balances from existing account balances
      const initialBalances: OpeningBalance[] = (accountsData || [])
        .filter((acc) => acc.balance !== 0)
        .map((acc) => ({
          account_id: acc.id,
          account_code: acc.code,
          account_name: acc.name,
          account_type: acc.type,
          debit: acc.balance > 0 ? acc.balance : 0,
          credit: acc.balance < 0 ? Math.abs(acc.balance) : 0,
        }));

      setBalances(initialBalances);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "خطأ", description: "حدث خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addAccount = (account: Account) => {
    if (balances.some((b) => b.account_id === account.id)) {
      toast({ title: "تنبيه", description: "الحساب موجود بالفعل" });
      return;
    }

    setBalances((prev) => [
      ...prev,
      {
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        account_type: account.type,
        debit: 0,
        credit: 0,
      },
    ]);
    setAccountDialogOpen(false);
  };

  const updateBalance = (accountId: string, field: "debit" | "credit", value: number) => {
    setBalances((prev) =>
      prev.map((b) => {
        if (b.account_id === accountId) {
          if (field === "debit" && value > 0) {
            return { ...b, debit: value, credit: 0 };
          } else if (field === "credit" && value > 0) {
            return { ...b, debit: 0, credit: value };
          }
          return { ...b, [field]: value };
        }
        return b;
      })
    );
  };

  const removeBalance = (accountId: string) => {
    setBalances((prev) => prev.filter((b) => b.account_id !== accountId));
  };

  const totalDebit = balances.reduce((sum, b) => sum + b.debit, 0);
  const totalCredit = balances.reduce((sum, b) => sum + b.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

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
      // Update each account balance
      for (const balance of balances) {
        const newBalance = balance.debit > 0 ? balance.debit : -balance.credit;
        await supabase
          .from("accounts")
          .update({ balance: newBalance })
          .eq("id", balance.account_id);
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

  const filteredAccounts = accounts.filter(
    (a) =>
      !balances.some((b) => b.account_id === a.id) &&
      (a.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
        a.code.includes(accountSearch))
  );

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
    <div className="space-y-6 rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/accounts")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">الأرصدة الافتتاحية</h1>
            <p className="text-muted-foreground">إدخال أرصدة الحسابات في بداية الفترة</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !isBalanced}>
          {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
          <Save className="h-4 w-4 ml-2" />
          حفظ الأرصدة
        </Button>
      </div>

      {/* Balances Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            الأرصدة الافتتاحية
          </CardTitle>
          <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة حساب
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>اختيار حساب</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث..."
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {filteredAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => addAccount(account)}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{account.name}</span>
                        <span className="font-mono text-muted-foreground">{account.code}</span>
                      </div>
                    </div>
                  ))}
                  {filteredAccounts.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      لا توجد حسابات متاحة
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">الرمز</TableHead>
                <TableHead>اسم الحساب</TableHead>
                <TableHead className="w-36">مدين</TableHead>
                <TableHead className="w-36">دائن</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    اضغط على "إضافة حساب" لإدخال الأرصدة الافتتاحية
                  </TableCell>
                </TableRow>
              ) : (
                balances.map((balance) => (
                  <TableRow key={balance.account_id}>
                    <TableCell className="font-mono">{balance.account_code}</TableCell>
                    <TableCell>{balance.account_name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={balance.debit || ""}
                        onChange={(e) => updateBalance(balance.account_id, "debit", Number(e.target.value))}
                        className="text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={balance.credit || ""}
                        onChange={(e) => updateBalance(balance.account_id, "credit", Number(e.target.value))}
                        className="text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBalance(balance.account_id)}
                        className="text-destructive"
                      >
                        حذف
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {/* Totals */}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={2}>الإجمالي</TableCell>
                <TableCell className="text-center">{formatCurrency(totalDebit)}</TableCell>
                <TableCell className="text-center">{formatCurrency(totalCredit)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Balance Status */}
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <div className="flex justify-between items-center">
              <span>الفرق:</span>
              <span className={isBalanced ? "text-green-600" : "text-destructive"}>
                {formatCurrency(Math.abs(totalDebit - totalCredit))} ر.س
                {isBalanced && " ✓"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpeningBalances;
