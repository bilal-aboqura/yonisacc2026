import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  FileText,
  TrendingUp,
  Wallet,
  Package,
  Users,
  Calendar,
  Download,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

const ClientReports = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const reports = [
    {
      category: isRTL ? "التقارير المالية" : "Financial Reports",
      items: [
        {
          title: isRTL ? "قائمة الدخل" : "Income Statement",
          description: isRTL ? "الإيرادات والمصروفات وصافي الربح" : "Revenue, expenses, and net profit",
          icon: TrendingUp,
          path: "/client/reports/income-statement",
        },
        {
          title: isRTL ? "الميزانية العمومية" : "Balance Sheet",
          description: isRTL ? "الأصول والخصوم وحقوق الملكية" : "Assets, liabilities, and equity",
          icon: BarChart3,
          path: "/client/reports/balance-sheet",
        },
        {
          title: isRTL ? "التدفقات النقدية" : "Cash Flow",
          description: isRTL ? "حركة النقدية الداخلة والخارجة" : "Cash inflows and outflows",
          icon: Wallet,
          path: "/client/reports/cash-flow",
        },
        {
          title: isRTL ? "ميزان المراجعة" : "Trial Balance",
          description: isRTL ? "أرصدة جميع الحسابات" : "All account balances",
          icon: FileText,
          path: "/client/reports/trial-balance",
        },
      ],
    },
    {
      category: isRTL ? "تقارير المبيعات" : "Sales Reports",
      items: [
        {
          title: isRTL ? "تقرير المبيعات" : "Sales Report",
          description: isRTL ? "تفاصيل المبيعات حسب الفترة" : "Sales details by period",
          icon: TrendingUp,
        },
        {
          title: isRTL ? "تقرير العملاء" : "Customers Report",
          description: isRTL ? "أرصدة وحركات العملاء" : "Customer balances and transactions",
          icon: Users,
        },
        {
          title: isRTL ? "تقرير أعمار الديون" : "Aging Report",
          description: isRTL ? "تحليل المستحقات حسب العمر" : "Receivables analysis by age",
          icon: Calendar,
        },
      ],
    },
    {
      category: isRTL ? "تقارير المخزون" : "Inventory Reports",
      items: [
        {
          title: isRTL ? "جرد المخزون" : "Stock Count",
          description: isRTL ? "الكميات المتاحة في المستودعات" : "Available quantities in warehouses",
          icon: Package,
        },
        {
          title: isRTL ? "حركة المخزون" : "Stock Movement",
          description: isRTL ? "الوارد والصادر من المخزون" : "Incoming and outgoing stock",
          icon: BarChart3,
        },
        {
          title: isRTL ? "تقييم المخزون" : "Inventory Valuation",
          description: isRTL ? "قيمة المخزون الحالية" : "Current inventory value",
          icon: TrendingUp,
        },
      ],
    },
  ];

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isRTL ? "التقارير" : "Reports"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "استعرض التقارير المالية والإدارية" : "View financial and management reports"}
        </p>
      </div>

      {/* Reports Categories */}
      {reports.map((category, categoryIndex) => (
        <div key={categoryIndex}>
          <h2 className="text-lg font-semibold mb-4">{category.category}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.items.map((report, reportIndex) => (
              <Card
                key={reportIndex}
                className="hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => (report as any).path && navigate((report as any).path)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <report.icon className="h-5 w-5 text-primary" />
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg mt-3">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between group-hover:text-primary">
                    {isRTL ? "عرض التقرير" : "View Report"}
                    <Arrow className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ClientReports;
