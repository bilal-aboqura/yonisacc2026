import { useEffect, useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import {
  FileText,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionData {
  status: string;
  plan: {
    name_ar: string;
    name_en: string;
  };
  end_date: string;
}

/**
 * Get date range for the selected period
 */
const getPeriodRange = (period: string): { start: string; end: string } => {
  const now = new Date();
  let start: Date;
  const end = now;

  switch (period) {
    case "week": {
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      break;
    }
    case "month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1);
      break;
    }
    case "year": {
      start = new Date(now.getFullYear(), 0, 1);
      break;
    }
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

const ClientDashboard = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { companyId, company, isLoadingCompany } = useTenantIsolation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("month");
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  const { start, end } = useMemo(() => getPeriodRange(period), [period]);

  // Fetch subscription data
  useEffect(() => {
    const fetchSub = async () => {
      if (!companyId) return;
      const { data } = await supabase
        .from("subscriptions")
        .select("status, end_date, plan:subscription_plans(name_ar, name_en)")
        .eq("company_id", companyId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setSubscription(data as any);
    };
    fetchSub();
  }, [companyId]);

  // ----- KPI Queries -----

  // 1. Revenue (sum of credits on revenue accounts in period)
  const { data: totalRevenue = 0 } = useQuery({
    queryKey: ["dashboard-revenue", companyId, start, end],
    queryFn: async () => {
      if (!companyId) return 0;
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("credit, entry_id, journal_entries!inner(company_id, status, entry_date), accounts!inner(type, company_id)")
        .eq("journal_entries.company_id", companyId)
        .eq("journal_entries.status", "posted")
        .gte("journal_entries.entry_date", start)
        .lte("journal_entries.entry_date", end)
        .eq("accounts.type", "revenue");

      if (error) { console.error("Revenue query error:", error); return 0; }
      return (data || []).reduce((sum, row) => sum + (row.credit || 0), 0);
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // 2. Total Expenses (sum of debits on expense accounts in period)
  const { data: totalExpenses = 0 } = useQuery({
    queryKey: ["dashboard-expenses", companyId, start, end],
    queryFn: async () => {
      if (!companyId) return 0;
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("debit, entry_id, journal_entries!inner(company_id, status, entry_date), accounts!inner(type, company_id)")
        .eq("journal_entries.company_id", companyId)
        .eq("journal_entries.status", "posted")
        .gte("journal_entries.entry_date", start)
        .lte("journal_entries.entry_date", end)
        .eq("accounts.type", "expense");

      if (error) { console.error("Expenses query error:", error); return 0; }
      return (data || []).reduce((sum, row) => sum + (row.debit || 0), 0);
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // 3. Treasury balance (cash + bank accounts current balance)
  const { data: treasuryBalance = 0 } = useQuery({
    queryKey: ["dashboard-treasury", companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      // Cash and bank accounts (codes starting with 111)
      const { data, error } = await supabase
        .from("accounts")
        .select("balance, code")
        .eq("company_id", companyId)
        .eq("is_parent", false)
        .like("code", "111%");

      if (error) { console.error("Treasury query error:", error); return 0; }
      return (data || []).reduce((sum, row) => sum + (row.balance || 0), 0);
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // 4. Invoice counts + sales total
  const { data: invoiceStats } = useQuery({
    queryKey: ["dashboard-invoices", companyId, start, end],
    queryFn: async () => {
      if (!companyId) return { salesTotal: 0, purchasesTotal: 0, totalCount: 0, salesCount: 0, purchasesCount: 0 };
      
      const { data, error } = await supabase
        .from("invoices")
        .select("type, total, status")
        .eq("company_id", companyId)
        .gte("invoice_date", start)
        .lte("invoice_date", end)
        .neq("status", "cancelled");

      if (error) { console.error("Invoice query error:", error); return { salesTotal: 0, purchasesTotal: 0, totalCount: 0, salesCount: 0, purchasesCount: 0 }; }
      
      const sales = (data || []).filter(i => i.type === "sale");
      const purchases = (data || []).filter(i => i.type === "purchase");
      
      return {
        salesTotal: sales.reduce((s, i) => s + (i.total || 0), 0),
        purchasesTotal: purchases.reduce((s, i) => s + (i.total || 0), 0),
        totalCount: (data || []).length,
        salesCount: sales.length,
        purchasesCount: purchases.length,
      };
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // 5. Inventory value (sum of quantity * cost_price for all products)
  const { data: inventoryValue = 0 } = useQuery({
    queryKey: ["dashboard-inventory", companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { data, error } = await supabase
        .from("products")
        .select("purchase_price")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .eq("is_service", false);

      if (error) { console.error("Inventory query error:", error); return 0; }
      return (data || []).reduce((sum, p) => sum + (p.purchase_price || 0), 0);
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // 6. Recent journal entries
  const { data: recentEntries = [] } = useQuery({
    queryKey: ["dashboard-recent-entries", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, entry_number, entry_date, description, total_debit, status, reference_type")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) { console.error("Recent entries error:", error); return []; }
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // Computed values
  const salesTotal = invoiceStats?.salesTotal || 0;
  const purchasesTotal = invoiceStats?.purchasesTotal || 0;
  const netProfit = totalRevenue - totalExpenses;
  const totalInvoiceCount = invoiceStats?.totalCount || 0;

  const currency = isRTL ? "ر.س" : "SAR";

  const kpis = [
    {
      title: isRTL ? "إجمالي المبيعات" : "Total Sales",
      value: formatNumber(salesTotal || totalRevenue),
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      suffix: currency,
    },
    {
      title: isRTL ? "إجمالي المشتريات" : "Total Purchases",
      value: formatNumber(purchasesTotal || totalExpenses),
      icon: ShoppingCart,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      suffix: currency,
    },
    {
      title: isRTL ? "صافي الربح" : "Net Profit",
      value: formatNumber(netProfit),
      icon: DollarSign,
      color: netProfit >= 0 ? "text-emerald-500" : "text-red-500",
      bgColor: netProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      suffix: currency,
      trend: netProfit >= 0 ? "up" : "down",
    },
    {
      title: isRTL ? "رصيد الخزينة" : "Treasury Balance",
      value: formatNumber(treasuryBalance),
      icon: Wallet,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      suffix: currency,
    },
    {
      title: isRTL ? "عدد الفواتير" : "Total Invoices",
      value: formatNumber(totalInvoiceCount),
      icon: FileText,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      suffix: "",
    },
    {
      title: isRTL ? "قيمة المخزون" : "Inventory Value",
      value: formatNumber(inventoryValue),
      icon: Package,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      suffix: currency,
    },
  ];

  const quickActions = [
    { title: isRTL ? "فاتورة مبيعات" : "Sales Invoice", icon: FileText, path: "/client/sales/new", color: "bg-green-500" },
    { title: isRTL ? "فاتورة مشتريات" : "Purchase Invoice", icon: ShoppingCart, path: "/client/purchases/new", color: "bg-blue-500" },
    { title: isRTL ? "قيد يومية" : "Journal Entry", icon: Plus, path: "/client/journal/new", color: "bg-purple-500" },
    { title: isRTL ? "عميل جديد" : "New Customer", icon: Users, path: "/client/contacts/new", color: "bg-orange-500" },
  ];

  const getRefTypeLabel = (refType: string | null) => {
    switch (refType) {
      case "sale": return isRTL ? "مبيعات" : "Sale";
      case "purchase": return isRTL ? "مشتريات" : "Purchase";
      case "treasury": return isRTL ? "خزينة" : "Treasury";
      default: return isRTL ? "يدوي" : "Manual";
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "posted") return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">{isRTL ? "مرحّل" : "Posted"}</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600">{isRTL ? "مسودة" : "Draft"}</span>;
  };

  if (isLoadingCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    navigate("/register-company", { replace: true });
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "مرحباً بك في" : "Welcome to"}{" "}
            {isRTL ? company.name : (company as any).name_en || company.name}
          </h1>
          {subscription && (
            <p className="text-muted-foreground mt-1">
              {isRTL ? "الباقة:" : "Plan:"}{" "}
              <span className="font-medium text-primary">
                {isRTL ? subscription.plan.name_ar : subscription.plan.name_en}
              </span>
            </p>
          )}
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">{isRTL ? "هذا الأسبوع" : "This Week"}</SelectItem>
            <SelectItem value="month">{isRTL ? "هذا الشهر" : "This Month"}</SelectItem>
            <SelectItem value="quarter">{isRTL ? "هذا الربع" : "This Quarter"}</SelectItem>
            <SelectItem value="year">{isRTL ? "هذه السنة" : "This Year"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 sm:p-2.5 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${kpi.color}`} />
                </div>
                {"trend" in kpi && kpi.trend && (
                  <div className="flex items-center gap-0.5 text-xs">
                    {kpi.trend === "up" ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              <p className="text-lg sm:text-xl font-bold tabular-nums">
                {kpi.value}
                {kpi.suffix && <span className="text-xs font-normal text-muted-foreground ms-1">{kpi.suffix}</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {isRTL ? "ملخص المبيعات و المشتريات" : "Sales & Purchases Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">{isRTL ? "فواتير المبيعات" : "Sales Invoices"}</span>
              <div className="text-end">
                <span className="font-semibold">{invoiceStats?.salesCount || 0}</span>
                <span className="text-xs text-muted-foreground ms-2">({formatNumber(salesTotal)} {currency})</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">{isRTL ? "فواتير المشتريات" : "Purchase Invoices"}</span>
              <div className="text-end">
                <span className="font-semibold">{invoiceStats?.purchasesCount || 0}</span>
                <span className="text-xs text-muted-foreground ms-2">({formatNumber(purchasesTotal)} {currency})</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">{isRTL ? "إجمالي الإيرادات (من القيود)" : "Total Revenue (from entries)"}</span>
              <span className="font-bold text-green-600">{formatNumber(totalRevenue)} {currency}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">{isRTL ? "إجمالي المصروفات (من القيود)" : "Total Expenses (from entries)"}</span>
              <span className="font-bold text-red-600">{formatNumber(totalExpenses)} {currency}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {isRTL ? "ملخص الأرصدة" : "Balance Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">{isRTL ? "رصيد الخزينة (نقدي + بنوك)" : "Treasury (Cash + Banks)"}</span>
              <span className="font-semibold">{formatNumber(treasuryBalance)} {currency}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">{isRTL ? "قيمة المخزون" : "Inventory Value"}</span>
              <span className="font-semibold">{formatNumber(inventoryValue)} {currency}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">{isRTL ? "صافي الربح للفترة" : "Net Profit for Period"}</span>
              <span className={`font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatNumber(netProfit)} {currency}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">{isRTL ? "إجراءات سريعة" : "Quick Actions"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-20 sm:h-24 flex flex-col gap-1.5 sm:gap-2 hover:border-primary"
                onClick={() => navigate(action.path)}
              >
                <div className={`p-1.5 sm:p-2 rounded-lg ${action.color} text-white`}>
                  <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-center line-clamp-1">{action.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">{isRTL ? "آخر العمليات" : "Recent Transactions"}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">
              {isRTL ? "لا توجد عمليات بعد" : "No transactions yet"}
            </div>
          ) : (
            <div className="space-y-2">
              {recentEntries.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/client/journal/${entry.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{entry.entry_number}</span>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{entry.description || (isRTL ? "بدون وصف" : "No description")}</p>
                      <p className="text-xs text-muted-foreground">{entry.entry_date} • {getRefTypeLabel(entry.reference_type)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {getStatusBadge(entry.status)}
                    <span className="text-sm font-semibold tabular-nums">{formatNumber(entry.total_debit || 0)} {currency}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;
