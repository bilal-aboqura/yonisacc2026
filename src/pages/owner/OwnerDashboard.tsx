import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CreditCard,
  Building2,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  DollarSign,
  Clock,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

const OwnerDashboard = () => {
  const { isRTL } = useLanguage();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["owner-stats"],
    queryFn: async () => {
      const [companies, subscriptions, plans, messages, profiles] =
        await Promise.all([
          supabase
            .from("companies")
            .select("id", { count: "exact" })
            .is("deleted_at", null),
          supabase.from("subscriptions").select("id, status, end_date, plan_id, created_at"),
          supabase.from("subscription_plans").select("id, price, name_ar, name_en"),
          supabase
            .from("contact_messages")
            .select("id, is_read", { count: "exact" }),
          supabase
            .from("profiles")
            .select("id", { count: "exact" })
            .is("deleted_at", null)
            .eq("is_active", true),
        ]);

      const allSubs = subscriptions.data || [];
      const activeSubs = allSubs.filter((s) => s.status === "active");
      const pendingSubs = allSubs.filter((s) => s.status === "pending");
      const unreadMessages =
        messages.data?.filter((m) => !m.is_read).length || 0;

      // Expiring soon (within 30 days)
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringSoon = activeSubs.filter((s) => {
        if (!s.end_date) return false;
        const end = new Date(s.end_date);
        return end <= in30Days && end >= now;
      }).length;

      // Monthly revenue estimate from active subscriptions
      const planPrices = new Map(
        (plans.data || []).map((p) => [p.id, p.price])
      );
      const monthlyRevenue = activeSubs.reduce((sum, s) => {
        return sum + (planPrices.get(s.plan_id) || 0);
      }, 0);

      return {
        totalCompanies: companies.count || 0,
        totalUsers: profiles.count || 0,
        activeSubscriptions: activeSubs.length,
        pendingSubscriptions: pendingSubs.length,
        totalPlans: plans.data?.length || 0,
        unreadMessages,
        expiringSoon,
        monthlyRevenue,
      };
    },
  });

  // Recent activity from audit_logs
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["owner-recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, operation_type, table_name, details, created_at, company_id")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // New subscriptions chart (last 30 days)
  const { data: chartData } = useQuery({
    queryKey: ["owner-subs-chart"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("subscriptions")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at");
      if (error) throw error;

      // Group by day
      const grouped: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        const day = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
        grouped[day] = 0;
      }
      (data || []).forEach((s) => {
        const day = format(parseISO(s.created_at), "yyyy-MM-dd");
        if (grouped[day] !== undefined) grouped[day]++;
      });

      return Object.entries(grouped).map(([date, count]) => ({
        date: format(parseISO(date), "dd MMM", {
          locale: isRTL ? ar : undefined,
        }),
        count,
      }));
    },
  });

  const statCards = [
    {
      title: isRTL ? "الشركات المسجلة" : "Registered Companies",
      value: stats?.totalCompanies || 0,
      icon: Building2,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: isRTL ? "إجمالي المستخدمين" : "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "from-cyan-500 to-cyan-600",
    },
    {
      title: isRTL ? "الاشتراكات النشطة" : "Active Subscriptions",
      value: stats?.activeSubscriptions || 0,
      icon: CreditCard,
      color: "from-green-500 to-green-600",
    },
    {
      title: isRTL ? "اشتراكات معلقة" : "Pending Subscriptions",
      value: stats?.pendingSubscriptions || 0,
      icon: AlertCircle,
      color: "from-amber-500 to-amber-600",
    },
    {
      title: isRTL ? "تنتهي قريباً" : "Expiring Soon",
      value: stats?.expiringSoon || 0,
      icon: Clock,
      color: "from-red-500 to-red-600",
    },
    {
      title: isRTL ? "الإيرادات الشهرية" : "Monthly Revenue",
      value: `${(stats?.monthlyRevenue || 0).toLocaleString()} SAR`,
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: isRTL ? "إجمالي الباقات" : "Total Plans",
      value: stats?.totalPlans || 0,
      icon: TrendingUp,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: isRTL ? "رسائل غير مقروءة" : "Unread Messages",
      value: stats?.unreadMessages || 0,
      icon: MessageSquare,
      color: "from-pink-500 to-pink-600",
    },
  ];

  const getOperationLabel = (op: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      INSERT: { ar: "إنشاء", en: "Create" },
      UPDATE: { ar: "تعديل", en: "Update" },
      DELETE: { ar: "حذف", en: "Delete" },
    };
    return isRTL
      ? labels[op]?.ar || op
      : labels[op]?.en || op;
  };

  const getOperationColor = (op: string) => {
    switch (op) {
      case "INSERT": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "UPDATE": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "DELETE": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {isRTL ? "لوحة التحكم" : "Dashboard"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "نظرة عامة على النظام" : "System overview"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className="border-0 shadow-lg hover:shadow-xl transition-shadow"
          >
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1 line-clamp-1">
                    {stat.title}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-7 sm:h-9 w-12 sm:w-16" />
                  ) : (
                    <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                      {stat.value}
                    </p>
                  )}
                </div>
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg flex-shrink-0`}
                >
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscriptions Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              {isRTL
                ? "الاشتراكات الجديدة (آخر 30 يوم)"
                : "New Subscriptions (Last 30 Days)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    interval={4}
                    reversed={isRTL}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name={isRTL ? "اشتراكات" : "Subscriptions"}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? "لا توجد بيانات" : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-primary" />
              {isRTL ? "النشاط الأخير" : "Recent Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0.5 ${getOperationColor(log.operation_type)}`}
                    >
                      {getOperationLabel(log.operation_type)}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {log.table_name}
                      </p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground truncate">
                          {log.details}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(parseISO(log.created_at), "HH:mm dd/MM", {
                        locale: isRTL ? ar : undefined,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? "لا يوجد نشاط حديث" : "No recent activity"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerDashboard;
