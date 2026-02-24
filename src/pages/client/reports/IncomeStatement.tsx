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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Download, Printer, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import useTenantIsolation from "@/hooks/useTenantIsolation";
import { toast } from "@/hooks/use-toast";

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
  balance: number;
}

const IncomeStatement = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { companyId, isLoadingCompany } = useTenantIsolation();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [revenues, setRevenues] = useState<AccountBalance[]>([]);
  const [expenses, setExpenses] = useState<AccountBalance[]>([]);

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId, period]);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [{ data: revenueData }, { data: expenseData }] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, code, name, name_en, type, balance")
          .eq("company_id", companyId)
          .eq("type", "revenue")
          .eq("is_active", true)
          .or("is_parent.is.null,is_parent.eq.false")
          .order("code"),
        supabase
          .from("accounts")
          .select("id, code, name, name_en, type, balance")
          .eq("company_id", companyId)
          .eq("type", "expense")
          .eq("is_active", true)
          .or("is_parent.is.null,is_parent.eq.false")
          .order("code"),
      ]);

      setRevenues(revenueData || []);
      setExpenses(expenseData || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ في تحميل البيانات" : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenues.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
  const totalExpenses = expenses.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
  const netIncome = totalRevenue - totalExpenses;

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const currency = isRTL ? "ر.س" : "SAR";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (loading || isLoadingCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const accountName = (acc: AccountBalance) =>
    isRTL ? acc.name : acc.name_en || acc.name;

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/reports")}>
            <BackArrow className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isRTL ? "قائمة الدخل" : "Income Statement"}
            </h1>
            <p className="text-muted-foreground">
              {isRTL ? "الإيرادات والمصروفات وصافي الربح" : "Revenue, expenses, and net profit"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{isRTL ? "هذا الشهر" : "This Month"}</SelectItem>
              <SelectItem value="quarter">{isRTL ? "هذا الربع" : "This Quarter"}</SelectItem>
              <SelectItem value="year">{isRTL ? "هذه السنة" : "This Year"}</SelectItem>
              <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "إجمالي الإيرادات" : "Total Revenue"}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalRevenue)} {currency}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "إجمالي المصروفات" : "Total Expenses"}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalExpenses)} {currency}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={netIncome >= 0 ? "bg-primary/10 border-primary/30" : "bg-destructive/10 border-destructive/30"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {netIncome >= 0 ? (
                <TrendingUp className="h-8 w-8 text-primary" />
              ) : (
                <TrendingDown className="h-8 w-8 text-destructive" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">
                  {netIncome >= 0
                    ? isRTL ? "صافي الربح" : "Net Profit"
                    : isRTL ? "صافي الخسارة" : "Net Loss"}
                </p>
                <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCurrency(Math.abs(netIncome))} {currency}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">
            {isRTL ? "الإيرادات" : "Revenue"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">{isRTL ? "الرمز" : "Code"}</TableHead>
                <TableHead>{isRTL ? "اسم الحساب" : "Account Name"}</TableHead>
                <TableHead className="text-left w-40">{isRTL ? "المبلغ" : "Amount"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {isRTL ? "لا توجد إيرادات مسجلة" : "No revenue recorded"}
                  </TableCell>
                </TableRow>
              ) : (
                revenues.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.code}</TableCell>
                    <TableCell>{accountName(account)}</TableCell>
                    <TableCell className="text-left font-medium">
                      {formatCurrency(Math.abs(account.balance || 0))} {currency}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-green-500/10 font-bold">
                <TableCell colSpan={2}>{isRTL ? "إجمالي الإيرادات" : "Total Revenue"}</TableCell>
                <TableCell className="text-left">{formatCurrency(totalRevenue)} {currency}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">
            {isRTL ? "المصروفات" : "Expenses"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">{isRTL ? "الرمز" : "Code"}</TableHead>
                <TableHead>{isRTL ? "اسم الحساب" : "Account Name"}</TableHead>
                <TableHead className="text-left w-40">{isRTL ? "المبلغ" : "Amount"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {isRTL ? "لا توجد مصروفات مسجلة" : "No expenses recorded"}
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.code}</TableCell>
                    <TableCell>{accountName(account)}</TableCell>
                    <TableCell className="text-left font-medium">
                      {formatCurrency(Math.abs(account.balance || 0))} {currency}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-red-500/10 font-bold">
                <TableCell colSpan={2}>{isRTL ? "إجمالي المصروفات" : "Total Expenses"}</TableCell>
                <TableCell className="text-left">{formatCurrency(totalExpenses)} {currency}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Net Income */}
      <Card className={netIncome >= 0 ? "border-primary" : "border-destructive"}>
        <CardContent className="p-6">
          <div className="flex justify-between items-center text-xl font-bold">
            <span>
              {netIncome >= 0
                ? isRTL ? "صافي الربح" : "Net Profit"
                : isRTL ? "صافي الخسارة" : "Net Loss"}
            </span>
            <span className={netIncome >= 0 ? "text-primary" : "text-destructive"}>
              {formatCurrency(Math.abs(netIncome))} {currency}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeStatement;
