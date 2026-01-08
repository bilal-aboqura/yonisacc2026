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
import { ArrowRight, Download, Printer, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

const IncomeStatement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [revenues, setRevenues] = useState<AccountBalance[]>([]);
  const [expenses, setExpenses] = useState<AccountBalance[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, period]);

  const fetchData = async () => {
    try {
      const { data: companyData } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user?.id)
        .single();

      if (!companyData) return;

      // Fetch revenue accounts
      const { data: revenueData } = await supabase
        .from("accounts")
        .select("id, code, name, type, balance")
        .eq("company_id", companyData.id)
        .eq("type", "revenue")
        .eq("is_active", true)
        .or("is_parent.is.null,is_parent.eq.false")
        .order("code");

      setRevenues(revenueData || []);

      // Fetch expense accounts
      const { data: expenseData } = await supabase
        .from("accounts")
        .select("id, code, name, type, balance")
        .eq("company_id", companyData.id)
        .eq("type", "expense")
        .eq("is_active", true)
        .or("is_parent.is.null,is_parent.eq.false")
        .order("code");

      setExpenses(expenseData || []);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "خطأ", description: "حدث خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenues.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
  const totalExpenses = expenses.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
  const netIncome = totalRevenue - totalExpenses;

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

  return (
    <div className="space-y-6 rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/reports")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">قائمة الدخل</h1>
            <p className="text-muted-foreground">الإيرادات والمصروفات وصافي الربح</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">هذا الشهر</SelectItem>
              <SelectItem value="quarter">هذا الربع</SelectItem>
              <SelectItem value="year">هذه السنة</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
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
                <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)} ر.س</p>
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
                <p className="text-sm text-muted-foreground">صافي {netIncome >= 0 ? "الربح" : "الخسارة"}</p>
                <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCurrency(Math.abs(netIncome))} ر.س
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">الإيرادات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">الرمز</TableHead>
                <TableHead>اسم الحساب</TableHead>
                <TableHead className="text-left w-40">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    لا توجد إيرادات مسجلة
                  </TableCell>
                </TableRow>
              ) : (
                revenues.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.code}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell className="text-left font-medium">{formatCurrency(Math.abs(account.balance || 0))} ر.س</TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-green-500/10 font-bold">
                <TableCell colSpan={2}>إجمالي الإيرادات</TableCell>
                <TableCell className="text-left">{formatCurrency(totalRevenue)} ر.س</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expenses Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">المصروفات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">الرمز</TableHead>
                <TableHead>اسم الحساب</TableHead>
                <TableHead className="text-left w-40">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    لا توجد مصروفات مسجلة
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.code}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell className="text-left font-medium">{formatCurrency(Math.abs(account.balance || 0))} ر.س</TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-red-500/10 font-bold">
                <TableCell colSpan={2}>إجمالي المصروفات</TableCell>
                <TableCell className="text-left">{formatCurrency(totalExpenses)} ر.س</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Net Income */}
      <Card className={netIncome >= 0 ? "border-primary" : "border-destructive"}>
        <CardContent className="p-6">
          <div className="flex justify-between items-center text-xl font-bold">
            <span>صافي {netIncome >= 0 ? "الربح" : "الخسارة"}</span>
            <span className={netIncome >= 0 ? "text-primary" : "text-destructive"}>
              {formatCurrency(Math.abs(netIncome))} ر.س
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeStatement;
