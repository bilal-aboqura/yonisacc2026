import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch company
        const { data: companyData } = await supabase
          .from("companies")
          .select("id, name, name_en")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (companyData) {
          setCompany(companyData);

          // Fetch subscription
          const { data: subData } = await supabase
            .from("subscriptions")
            .select(`
              status,
              end_date,
              plan:subscription_plans(name_ar, name_en)
            `)
            .eq("company_id", companyData.id)
            .eq("status", "active")
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

  const stats = [
    {
      title: isRTL ? "إجمالي المبيعات" : "Total Sales",
      value: "0",
      change: "+0%",
      trend: "up",
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: isRTL ? "إجمالي المشتريات" : "Total Purchases",
      value: "0",
      change: "+0%",
      trend: "up",
      icon: TrendingDown,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: isRTL ? "رصيد الخزينة" : "Treasury Balance",
      value: "0",
      change: "0%",
      trend: "neutral",
      icon: Wallet,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: isRTL ? "قيمة المخزون" : "Inventory Value",
      value: "0",
      change: "0%",
      trend: "neutral",
      icon: Package,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
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
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">
          {isRTL ? "لم يتم تسجيل شركة بعد" : "No company registered yet"}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "مرحباً بك في" : "Welcome to"} {isRTL ? company.name : company.name_en || company.name}
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
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${stat.color}`} />
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                  ) : stat.trend === "down" ? (
                    <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                  ) : null}
                  <span className={stat.trend === "up" ? "text-green-500" : stat.trend === "down" ? "text-red-500" : "text-muted-foreground"}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 md:mt-4">
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{stat.value} ر.س</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
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

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">{isRTL ? "آخر العمليات" : "Recent Transactions"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
              {isRTL ? "لا توجد عمليات بعد" : "No transactions yet"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">{isRTL ? "التنبيهات" : "Alerts"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
              {isRTL ? "لا توجد تنبيهات" : "No alerts"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
