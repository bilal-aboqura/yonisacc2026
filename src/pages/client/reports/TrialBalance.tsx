import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Download, Printer, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

const TrialBalance = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: companyData } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user?.id)
        .single();

      if (!companyData) return;

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, code, name, type, balance")
        .eq("company_id", companyData.id)
        .eq("is_active", true)
        .or("is_parent.is.null,is_parent.eq.false")
        .order("code");

      setAccounts(accountsData || []);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "خطأ", description: "حدث خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Debit accounts: assets, expenses (positive balance)
  // Credit accounts: liabilities, equity, revenue (negative balance in DB, shown as positive)
  const getDebitCredit = (account: AccountBalance) => {
    const balance = account.balance || 0;
    if (account.type === "asset" || account.type === "expense") {
      return { debit: balance > 0 ? balance : 0, credit: balance < 0 ? Math.abs(balance) : 0 };
    } else {
      return { debit: balance > 0 ? balance : 0, credit: balance < 0 ? Math.abs(balance) : Math.abs(balance) };
    }
  };

  const totalDebit = accounts.reduce((sum, acc) => sum + getDebitCredit(acc).debit, 0);
  const totalCredit = accounts.reduce((sum, acc) => sum + getDebitCredit(acc).credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "-";
    return amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      asset: "أصول",
      liability: "خصوم",
      equity: "حقوق ملكية",
      revenue: "إيرادات",
      expense: "مصروفات",
    };
    return names[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/reports")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">ميزان المراجعة</h1>
            <p className="text-muted-foreground">أرصدة جميع الحسابات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Balance Status */}
      {accounts.length > 0 && (
        isBalanced ? (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              ميزان المراجعة متوازن ✓
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              ميزان المراجعة غير متوازن - الفرق: {formatCurrency(Math.abs(totalDebit - totalCredit))} ر.س
            </AlertDescription>
          </Alert>
        )
      )}

      {/* Trial Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle>ميزان المراجعة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">الرمز</TableHead>
                <TableHead>اسم الحساب</TableHead>
                <TableHead className="w-24">النوع</TableHead>
                <TableHead className="text-center w-36">مدين</TableHead>
                <TableHead className="text-center w-36">دائن</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    لا توجد حسابات مسجلة
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => {
                  const { debit, credit } = getDebitCredit(account);
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.code}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getTypeName(account.type)}</TableCell>
                      <TableCell className="text-center">{formatCurrency(debit)}</TableCell>
                      <TableCell className="text-center">{formatCurrency(credit)}</TableCell>
                    </TableRow>
                  );
                })
              )}
              {/* Totals */}
              <TableRow className="bg-muted/50 font-bold text-lg">
                <TableCell colSpan={3}>الإجمالي</TableCell>
                <TableCell className="text-center">{formatCurrency(totalDebit)}</TableCell>
                <TableCell className="text-center">{formatCurrency(totalCredit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialBalance;
