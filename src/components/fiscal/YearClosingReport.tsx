import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileBarChart, TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  fiscalYearId: string | null;
}

const YearClosingReport = ({ fiscalYearId }: Props) => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();

  const { data: fy, isLoading } = useQuery({
    queryKey: ["fiscal-year-closing-report", fiscalYearId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fiscal_periods").select("*")
        .eq("id", fiscalYearId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!fiscalYearId,
  });

  const { data: auditDetails } = useQuery({
    queryKey: ["fiscal-closing-details", fiscalYearId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fiscal_year_audit_log")
        .select("*")
        .eq("fiscal_year_id", fiscalYearId)
        .eq("action", "close")
        .order("performed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!fiscalYearId,
  });

  const { data: balanceSummary = [] } = useQuery({
    queryKey: ["fiscal-balance-summary", fiscalYearId, companyId],
    queryFn: async () => {
      if (!fy) return [];
      const { data, error } = await (supabase as any).rpc("get_trial_balance", {
        p_company_id: companyId,
        p_start_date: fy.start_date,
        p_end_date: fy.end_date,
      });
      if (error) return [];
      return data || [];
    },
    enabled: !!fiscalYearId && !!fy && !!companyId,
  });

  if (!fiscalYearId) {
    return (
      <Card><CardContent className="py-8 text-center text-muted-foreground">
        {isRTL ? "يرجى اختيار سنة مالية" : "Please select a fiscal year"}
      </CardContent></Card>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const details = auditDetails?.details || {};
  const netProfit = details.net_profit || 0;
  const totalRevenue = details.total_revenue || 0;
  const totalExpense = details.total_expense || 0;

  const totalAssets = balanceSummary
    .filter((a: any) => a.account_type === "asset")
    .reduce((s: number, a: any) => s + (Number(a.debit_total) - Number(a.credit_total)), 0);
  const totalLiabilities = balanceSummary
    .filter((a: any) => a.account_type === "liability")
    .reduce((s: number, a: any) => s + (Number(a.credit_total) - Number(a.debit_total)), 0);
  const totalEquity = balanceSummary
    .filter((a: any) => a.account_type === "equity")
    .reduce((s: number, a: any) => s + (Number(a.credit_total) - Number(a.debit_total)), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            {isRTL ? "تقرير إقفال السنة المالية" : "Year Closing Report"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-muted/40">
              <p className="text-sm text-muted-foreground">{isRTL ? "السنة المالية" : "Fiscal Year"}</p>
              <p className="text-lg font-bold">{isRTL ? fy?.name : (fy?.name_en || fy?.name)}</p>
              <p className="text-sm">{fy?.start_date} → {fy?.end_date}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/40">
              <p className="text-sm text-muted-foreground">{isRTL ? "الحالة" : "Status"}</p>
              <Badge variant={fy?.status === "closed" ? "secondary" : "default"} className="mt-1">
                {fy?.status === "closed" ? (isRTL ? "مقفلة" : "Closed") : fy?.status === "temporarily_locked" ? (isRTL ? "مقفلة مؤقتاً" : "Temp Locked") : (isRTL ? "مفتوحة" : "Open")}
              </Badge>
            </div>
          </div>

          {fy?.status === "closed" && (
            <>
              <h3 className="font-semibold mb-3">{isRTL ? "ملخص قائمة الدخل" : "Income Statement Summary"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                  <TrendingUp className="h-5 w-5 text-emerald-600 mb-1" />
                  <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الإيرادات" : "Total Revenue"}</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{Number(totalRevenue).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                  <TrendingDown className="h-5 w-5 text-red-600 mb-1" />
                  <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المصروفات" : "Total Expenses"}</p>
                  <p className="text-xl font-bold text-red-700 dark:text-red-400">{Number(totalExpense).toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-lg border ${netProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"}`}>
                  {netProfit >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-600 mb-1" /> : <TrendingDown className="h-5 w-5 text-red-600 mb-1" />}
                  <p className="text-sm text-muted-foreground">{isRTL ? "صافي الربح/الخسارة" : "Net Profit/Loss"}</p>
                  <p className={`text-xl font-bold ${netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                    {Number(netProfit).toLocaleString()}
                  </p>
                </div>
              </div>

              <h3 className="font-semibold mb-3">{isRTL ? "ملخص الميزانية العمومية" : "Balance Sheet Summary"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الأصول" : "Total Assets"}</p>
                  <p className="text-xl font-bold">{totalAssets.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الخصوم" : "Total Liabilities"}</p>
                  <p className="text-xl font-bold">{totalLiabilities.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">{isRTL ? "حقوق الملكية" : "Equity"}</p>
                  <p className="text-xl font-bold">{totalEquity.toLocaleString()}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YearClosingReport;
