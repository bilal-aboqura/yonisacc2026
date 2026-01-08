import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from "lucide-react";

const ClientAnalytics = () => {
  const { isRTL } = useLanguage();

  const kpis = [
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
      icon: ShoppingCart,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: isRTL ? "صافي الربح" : "Net Profit",
      value: "0",
      change: "+0%",
      trend: "up",
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: isRTL ? "عدد الفواتير" : "Total Invoices",
      value: "0",
      change: "+0%",
      trend: "neutral",
      icon: Package,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "الإحصائيات والتحليلات" : "Analytics & Statistics"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "نظرة شاملة على أداء الأعمال" : "Comprehensive business performance overview"}
          </p>
        </div>
        <Select defaultValue="month">
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${kpi.bgColor}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
                <span className={`text-sm font-medium ${
                  kpi.trend === "up" ? "text-green-500" : kpi.trend === "down" ? "text-red-500" : "text-muted-foreground"
                }`}>
                  {kpi.change}
                </span>
              </div>
              <p className="text-2xl font-bold">{kpi.value} ر.س</p>
              <p className="text-sm text-muted-foreground mt-1">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "المبيعات الشهرية" : "Monthly Sales"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              {isRTL ? "لا توجد بيانات كافية لعرض الرسم البياني" : "Not enough data to display chart"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "المصروفات حسب الفئة" : "Expenses by Category"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              {isRTL ? "لا توجد بيانات كافية لعرض الرسم البياني" : "Not enough data to display chart"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Items */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "أفضل المنتجات مبيعاً" : "Top Selling Products"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              {isRTL ? "لا توجد بيانات بعد" : "No data yet"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "أفضل العملاء" : "Top Customers"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              {isRTL ? "لا توجد بيانات بعد" : "No data yet"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientAnalytics;
