import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ar } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  pending: "#f59e0b",
  expired: "#ef4444",
  cancelled: "#6b7280",
  suspended: "#8b5cf6",
  trialing: "#3b82f6",
};

const OwnerReports = () => {
  const { isRTL } = useLanguage();

  // ── Subscriptions by status ──
  const { data: subsByStatus, isLoading: subsLoading } = useQuery({
    queryKey: ["report-subs-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status");
      const counts: Record<string, number> = {};
      (data || []).forEach((s) => {
        const st = s.status as string;
        counts[st] = (counts[st] || 0) + 1;
      });
      return Object.entries(counts).map(([status, count]) => ({
        name: status,
        value: count,
        color: STATUS_COLORS[status] || "#94a3b8",
      }));
    },
  });

  // ── Subscriptions by plan ──
  const { data: subsByPlan, isLoading: planSubsLoading } = useQuery({
    queryKey: ["report-subs-plan"],
    queryFn: async () => {
      const [{ data: subs }, { data: plans }] = await Promise.all([
        supabase.from("subscriptions").select("plan_id, status"),
        supabase.from("subscription_plans").select("id, name_ar, name_en, price"),
      ]);
      const planMap = new Map(
        (plans || []).map((p) => [p.id, p])
      );
      const counts: Record<string, { name: string; active: number; other: number }> = {};
      (subs || []).forEach((s) => {
        const plan = planMap.get(s.plan_id);
        const name = plan ? (isRTL ? plan.name_ar : plan.name_en) : "Unknown";
        if (!counts[s.plan_id]) counts[s.plan_id] = { name, active: 0, other: 0 };
        if (s.status === "active") counts[s.plan_id].active++;
        else counts[s.plan_id].other++;
      });
      return Object.values(counts);
    },
  });

  // ── Monthly revenue ──
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["report-revenue"],
    queryFn: async () => {
      const [{ data: subs }, { data: plans }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("plan_id, created_at, status")
          .in("status", ["active", "expired"]),
        supabase.from("subscription_plans").select("id, price"),
      ]);
      const priceMap = new Map((plans || []).map((p) => [p.id, p.price]));
      const months: Record<string, number> = {};
      for (let i = 11; i >= 0; i--) {
        const m = format(subMonths(new Date(), i), "yyyy-MM");
        months[m] = 0;
      }
      (subs || []).forEach((s) => {
        const m = format(parseISO(s.created_at), "yyyy-MM");
        if (months[m] !== undefined) {
          months[m] += priceMap.get(s.plan_id) || 0;
        }
      });
      return Object.entries(months).map(([month, revenue]) => ({
        month: format(
          startOfMonth(parseISO(month + "-01")),
          "MMM yyyy",
          { locale: isRTL ? ar : undefined }
        ),
        revenue,
      }));
    },
  });

  // ── Company growth ──
  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ["report-growth"],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("created_at")
        .is("deleted_at", null)
        .order("created_at");
      const months: Record<string, number> = {};
      for (let i = 11; i >= 0; i--) {
        const m = format(subMonths(new Date(), i), "yyyy-MM");
        months[m] = 0;
      }
      (data || []).forEach((c) => {
        const m = format(parseISO(c.created_at), "yyyy-MM");
        if (months[m] !== undefined) months[m]++;
      });
      let cumulative = 0;
      return Object.entries(months).map(([month, count]) => {
        cumulative += count;
        return {
          month: format(
            startOfMonth(parseISO(month + "-01")),
            "MMM yyyy",
            { locale: isRTL ? ar : undefined }
          ),
          newCompanies: count,
          total: cumulative,
        };
      });
    },
  });

  // ── Top companies by usage ──
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ["report-usage"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select(`
          invoices_used,
          entries_used,
          company:companies(name, name_en)
        `)
        .eq("status", "active")
        .order("invoices_used", { ascending: false })
        .limit(10);
      return (data || []).map((s: any) => ({
        company: isRTL
          ? s.company?.name || "—"
          : s.company?.name_en || s.company?.name || "—",
        invoices: s.invoices_used || 0,
        entries: s.entries_used || 0,
      }));
    },
  });

  const statusLabels: Record<string, { ar: string; en: string }> = {
    active: { ar: "نشط", en: "Active" },
    pending: { ar: "معلق", en: "Pending" },
    expired: { ar: "منتهي", en: "Expired" },
    cancelled: { ar: "ملغي", en: "Cancelled" },
    suspended: { ar: "معلق", en: "Suspended" },
    trialing: { ar: "تجريبي", en: "Trialing" },
  };

  const renderLoading = () => (
    <div className="space-y-4 p-4">
      <Skeleton className="h-64 w-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {isRTL ? "التقارير" : "Reports"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "تقارير وإحصائيات النظام" : "System reports and statistics"}
        </p>
      </div>

      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-6">
          <TabsTrigger
            value="subscriptions"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 gap-2"
          >
            <PieChartIcon className="h-4 w-4" />
            {isRTL ? "الاشتراكات" : "Subscriptions"}
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            {isRTL ? "الإيرادات" : "Revenue"}
          </TabsTrigger>
          <TabsTrigger
            value="growth"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            {isRTL ? "النمو" : "Growth"}
          </TabsTrigger>
          <TabsTrigger
            value="usage"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 gap-2"
          >
            <Activity className="h-4 w-4" />
            {isRTL ? "الاستخدام" : "Usage"}
          </TabsTrigger>
        </TabsList>

        {/* ── Subscriptions Tab ── */}
        <TabsContent value="subscriptions" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">
                  {isRTL ? "توزيع الاشتراكات حسب الحالة" : "Subscriptions by Status"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subsLoading ? (
                  renderLoading()
                ) : subsByStatus && subsByStatus.length > 0 ? (
                  <div>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={subsByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, value }) => `${isRTL ? statusLabels[name]?.ar || name : statusLabels[name]?.en || name}: ${value}`}
                        >
                          {subsByStatus.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      {subsByStatus.map((s) => (
                        <Badge
                          key={s.name}
                          variant="outline"
                          className="gap-1.5"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: s.color }}
                          />
                          {isRTL ? statusLabels[s.name]?.ar || s.name : statusLabels[s.name]?.en || s.name}:{" "}
                          {s.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">
                    {isRTL ? "لا توجد بيانات" : "No data"}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">
                  {isRTL ? "الاشتراكات حسب الباقة" : "Subscriptions by Plan"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {planSubsLoading ? (
                  renderLoading()
                ) : subsByPlan && subsByPlan.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={subsByPlan} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="active"
                        fill="#22c55e"
                        name={isRTL ? "نشط" : "Active"}
                        radius={[0, 4, 4, 0]}
                        stackId="a"
                      />
                      <Bar
                        dataKey="other"
                        fill="#94a3b8"
                        name={isRTL ? "أخرى" : "Other"}
                        radius={[0, 4, 4, 0]}
                        stackId="a"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">
                    {isRTL ? "لا توجد بيانات" : "No data"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Revenue Tab ── */}
        <TabsContent value="revenue" className="mt-0">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">
                {isRTL ? "الإيرادات الشهرية (آخر 12 شهر)" : "Monthly Revenue (Last 12 Months)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                renderLoading()
              ) : revenueData && revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={1} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()} SAR`, isRTL ? "الإيرادات" : "Revenue"]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      name={isRTL ? "الإيرادات" : "Revenue"}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12 text-muted-foreground">
                  {isRTL ? "لا توجد بيانات" : "No data"}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Growth Tab ── */}
        <TabsContent value="growth" className="mt-0">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">
                {isRTL ? "نمو الشركات (آخر 12 شهر)" : "Company Growth (Last 12 Months)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {growthLoading ? (
                renderLoading()
              ) : growthData && growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={1} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="newCompanies"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name={isRTL ? "شركات جديدة" : "New Companies"}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name={isRTL ? "الإجمالي التراكمي" : "Cumulative Total"}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12 text-muted-foreground">
                  {isRTL ? "لا توجد بيانات" : "No data"}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Usage Tab ── */}
        <TabsContent value="usage" className="mt-0">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">
                {isRTL ? "أكثر الشركات استخداماً (أعلى 10)" : "Top 10 Companies by Usage"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                renderLoading()
              ) : usageData && usageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={usageData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      dataKey="company"
                      type="category"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="invoices"
                      fill="#3b82f6"
                      name={isRTL ? "الفواتير" : "Invoices"}
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="entries"
                      fill="#8b5cf6"
                      name={isRTL ? "القيود" : "Entries"}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12 text-muted-foreground">
                  {isRTL ? "لا توجد بيانات" : "No data"}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerReports;
