import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  CreditCard,
  Building2,
  TrendingUp,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

const OwnerDashboard = () => {
  const { isRTL } = useLanguage();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["owner-stats"],
    queryFn: async () => {
      const [companies, subscriptions, plans, messages] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact" }),
        supabase.from("subscriptions").select("id, status", { count: "exact" }),
        supabase.from("subscription_plans").select("id", { count: "exact" }),
        supabase.from("contact_messages").select("id, is_read", { count: "exact" }),
      ]);

      const activeSubscriptions = subscriptions.data?.filter(s => s.status === "active").length || 0;
      const pendingSubscriptions = subscriptions.data?.filter(s => s.status === "pending").length || 0;
      const unreadMessages = messages.data?.filter(m => !m.is_read).length || 0;

      return {
        totalCompanies: companies.count || 0,
        totalSubscriptions: subscriptions.count || 0,
        activeSubscriptions,
        pendingSubscriptions,
        totalPlans: plans.count || 0,
        totalMessages: messages.count || 0,
        unreadMessages,
      };
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
    {
      title: isRTL ? "إجمالي المستخدمين" : "Total Users",
      value: stats?.totalCompanies || 0,
      icon: Users,
      color: "from-cyan-500 to-cyan-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {isRTL ? "لوحة التحكم" : "Dashboard"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "نظرة عامة على النظام" : "System overview"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <p className="text-3xl font-bold">{stat.value}</p>
                  )}
                </div>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="h-7 w-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{isRTL ? "النشاط الأخير" : "Recent Activity"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {isRTL ? "لا يوجد نشاط حديث" : "No recent activity"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerDashboard;
