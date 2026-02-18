import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
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

interface CompanyData {
  id: string;
  name: string;
  name_en: string | null;
}

interface SubscriptionData {
  status: string;
  plan: {
    name_ar: string;
    name_en: string;
  };
  end_date: string;
}

const ClientDashboard = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name, name_en")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        const companyData = companies && companies.length > 0 ? companies[0] : null;

        if (companyData) {
          setCompany(companyData);

          const { data: subData } = await supabase
            .from("subscriptions")
            .select(`
              status,
              end_date,
              plan:subscription_plans(name_ar, name_en)
            `)
            .eq("company_id", companyData.id)
            .in("status", ["active", "trialing"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (subData) {
            setSubscription(subData as any);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const kpis = [
    {
      title: isRTL ? "إجمالي المبيعات" : "Total Sales",
      value: "0",
      change: "+0%",
      trend: "up",
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      suffix: isRTL ? "ر.س" : "SAR",
    },
    {
      title: isRTL ? "إجمالي المشتريات" : "Total Purchases",
      value: "0",
      change: "+0%",
      trend: "up",
      icon: ShoppingCart,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      suffix: isRTL ? "ر.س" : "SAR",
    },
    {
      title: isRTL ? "صافي الربح" : "Net Profit",
      value: "0",
      change: "+0%",
      trend: "up",
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      suffix: isRTL ? "ر.س" : "SAR",
    },
    {
      title: isRTL ? "رصيد الخزينة" : "Treasury Balance",
      value: "0",
      change: "0%",
      trend: "neutral",
      icon: Wallet,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      suffix: isRTL ? "ر.س" : "SAR",
    },
    {
      title: isRTL ? "عدد الفواتير" : "Total Invoices",
      value: "0",
      change: "+0%",
      trend: "neutral",
      icon: FileText,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      suffix: "",
    },
    {
      title: isRTL ? "قيمة المخزون" : "Inventory Value",
      value: "0",
      change: "0%",
      trend: "neutral",
      icon: Package,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      suffix: isRTL ? "ر.س" : "SAR",
    },
  ];

  const quickActions = [
    {
      title: isRTL ? "فاتورة مبيعات" : "Sales Invoice",
      icon: FileText,
      path: "/client/sales/new",
      color: "bg-green-500",
    },
    {
      title: isRTL ? "فاتورة مشتريات" : "Purchase Invoice",
      icon: ShoppingCart,
      path: "/client/purchases/new",
      color: "bg-blue-500",
    },
    {
      title: isRTL ? "قيد يومية" : "Journal Entry",
      icon: Plus,
      path: "/client/journal/new",
      color: "bg-purple-500",
    },
    {
      title: isRTL ? "عميل جديد" : "New Customer",
      icon: Users,
      path: "/client/contacts/new",
      color: "bg-orange-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    // Redirect to company registration if no company found
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
            {isRTL ? company.name : company.name_en || company.name}
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
                <div className="flex items-center gap-0.5 text-xs">
                  {kpi.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : kpi.trend === "down" ? (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  ) : null}
                  <span className={kpi.trend === "up" ? "text-green-500" : kpi.trend === "down" ? "text-red-500" : "text-muted-foreground"}>
                    {kpi.change}
                  </span>
                </div>
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

      {/* Charts Placeholder */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {isRTL ? "المبيعات الشهرية" : "Monthly Sales"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
              {isRTL ? "لا توجد بيانات كافية لعرض الرسم البياني" : "Not enough data to display chart"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {isRTL ? "المصروفات حسب الفئة" : "Expenses by Category"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
              {isRTL ? "لا توجد بيانات كافية لعرض الرسم البياني" : "Not enough data to display chart"}
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

      {/* Recent Activity & Top Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">{isRTL ? "أفضل المنتجات مبيعاً" : "Top Selling Products"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8 text-sm">
              {isRTL ? "لا توجد بيانات بعد" : "No data yet"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">{isRTL ? "أفضل العملاء" : "Top Customers"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8 text-sm">
              {isRTL ? "لا توجد بيانات بعد" : "No data yet"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">{isRTL ? "آخر العمليات" : "Recent Transactions"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6 text-sm">
            {isRTL ? "لا توجد عمليات بعد" : "No transactions yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;
