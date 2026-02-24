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
import { ArrowRight, ArrowLeft, Download, Printer, Loader2, Scale, AlertTriangle, CheckCircle2 } from "lucide-react";
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

const BalanceSheet = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { companyId, isLoadingCompany } = useTenantIsolation();

  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<AccountBalance[]>([]);
  const [liabilities, setLiabilities] = useState<AccountBalance[]>([]);
  const [equity, setEquity] = useState<AccountBalance[]>([]);
  const [netIncome, setNetIncome] = useState(0);

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [
        { data: assetsData },
        { data: liabilitiesData },
        { data: equityData },
        { data: revenueData },
        { data: expenseData },
      ] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, code, name, name_en, type, balance")
          .eq("company_id", companyId)
          .eq("type", "asset")
          .eq("is_active", true)
          .or("is_parent.is.null,is_parent.eq.false")
          .order("code"),
        supabase
          .from("accounts")
          .select("id, code, name, name_en, type, balance")
          .eq("company_id", companyId)
          .eq("type", "liability")
          .eq("is_active", true)
          .or("is_parent.is.null,is_parent.eq.false")
          .order("code"),
        supabase
          .from("accounts")
          .select("id, code, name, name_en, type, balance")
          .eq("company_id", companyId)
          .eq("type", "equity")
          .eq("is_active", true)
          .or("is_parent.is.null,is_parent.eq.false")
          .order("code"),
        // Fetch revenue & expense to compute net income for equity section
        supabase
          .from("accounts")
          .select("balance")
          .eq("company_id", companyId)
          .eq("type", "revenue")
          .eq("is_active", true)
          .or("is_parent.is.null,is_parent.eq.false"),
        supabase
          .from("accounts")
          .select("balance")
          .eq("company_id", companyId)
          .eq("type", "expense")
          .eq("is_active", true)
          .or("is_parent.is.null,is_parent.eq.false"),
      ]);

      setAssets(assetsData || []);
      setLiabilities(liabilitiesData || []);
      setEquity(equityData || []);

      const totalRev = (revenueData || []).reduce((s, a) => s + Math.abs(a.balance || 0), 0);
      const totalExp = (expenseData || []).reduce((s, a) => s + Math.abs(a.balance || 0), 0);
      setNetIncome(totalRev - totalExp);
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

  const totalAssets = assets.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
  const totalEquity = equity.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
  const totalEquityWithIncome = totalEquity + netIncome;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquityWithIncome;
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const currency = isRTL ? "ر.س" : "SAR";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const accountName = (acc: AccountBalance) =>
    isRTL ? acc.name : acc.name_en || acc.name;

  if (loading || isLoadingCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderTable = (
    data: AccountBalance[],
    emptyMsg: string,
    totalLabel: string,
    total: number,
    colorClass: string,
    extra?: { label: string; value: number }[]
  ) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">{isRTL ? "الرمز" : "Code"}</TableHead>
          <TableHead>{isRTL ? "الحساب" : "Account"}</TableHead>
          <TableHead className="text-left w-32">{isRTL ? "الرصيد" : "Balance"}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              {emptyMsg}
            </TableCell>
          </TableRow>
        ) : (
          data.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-mono text-sm">{account.code}</TableCell>
              <TableCell>{accountName(account)}</TableCell>
              <TableCell className="text-left">{formatCurrency(Math.abs(account.balance || 0))}</TableCell>
            </TableRow>
          ))
        )}
        {extra?.map((item, i) => (
          <TableRow key={`extra-${i}`} className="bg-muted/30 italic">
            <TableCell colSpan={2}>{item.label}</TableCell>
            <TableCell className={`text-left ${item.value >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatCurrency(Math.abs(item.value))} {currency}
            </TableCell>
          </TableRow>
        ))}
        <TableRow className={`${colorClass} font-bold`}>
          <TableCell colSpan={2}>{totalLabel}</TableCell>
          <TableCell className="text-left">{formatCurrency(total)} {currency}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

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
              {isRTL ? "الميزانية العمومية" : "Balance Sheet"}
            </h1>
            <p className="text-muted-foreground">
              {isRTL ? "الأصول والخصوم وحقوق الملكية" : "Assets, liabilities, and equity"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">
              {isRTL ? "الأصول" : "Assets"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderTable(
              assets,
              isRTL ? "لا توجد أصول" : "No assets",
              isRTL ? "إجمالي الأصول" : "Total Assets",
              totalAssets,
              "bg-blue-500/10"
            )}
          </CardContent>
        </Card>

        {/* Liabilities & Equity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">
                {isRTL ? "الخصوم" : "Liabilities"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderTable(
                liabilities,
                isRTL ? "لا توجد خصوم" : "No liabilities",
                isRTL ? "إجمالي الخصوم" : "Total Liabilities",
                totalLiabilities,
                "bg-red-500/10"
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">
                {isRTL ? "حقوق الملكية" : "Equity"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderTable(
                equity,
                isRTL ? "لا توجد حقوق ملكية" : "No equity",
                isRTL ? "إجمالي حقوق الملكية (شامل صافي الدخل)" : "Total Equity (incl. Net Income)",
                totalEquityWithIncome,
                "bg-green-500/10",
                [
                  {
                    label: netIncome >= 0
                      ? isRTL ? "صافي ربح الفترة (من قائمة الدخل)" : "Net Profit (from Income Statement)"
                      : isRTL ? "صافي خسارة الفترة (من قائمة الدخل)" : "Net Loss (from Income Statement)",
                    value: netIncome,
                  },
                ]
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Balance Check */}
      <Card className={isBalanced ? "border-green-500" : "border-destructive"}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            {isBalanced ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-destructive" />
            )}
            <span className={`font-semibold ${isBalanced ? "text-green-600" : "text-destructive"}`}>
              {isBalanced
                ? isRTL ? "الميزانية متوازنة ✓" : "Balance Sheet is balanced ✓"
                : isRTL ? "الميزانية غير متوازنة ✗" : "Balance Sheet is NOT balanced ✗"}
            </span>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                {isRTL ? "إجمالي الأصول" : "Total Assets"}
              </p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(totalAssets)} {currency}
              </p>
            </div>
            <div className="flex items-center justify-center text-2xl font-bold">=</div>
            <div>
              <p className="text-sm text-muted-foreground">
                {isRTL ? "الخصوم + حقوق الملكية" : "Liabilities + Equity"}
              </p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(totalLiabilitiesAndEquity)} {currency}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceSheet;
