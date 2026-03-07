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
  ArrowRight,
  ArrowLeft,
  ShoppingCart,
  Truck,
  Factory,
  ClipboardList,
  Receipt,
  CreditCard,
  UserCheck,
  AlertTriangle,
  Layers,
  RotateCcw,
  Wrench,
  Flame,
  ListChecks,
  BoxSelect,
  Clock,
} from "lucide-react";

const ClientReports = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const reports = [
    {
      category: isRTL ? "التقارير المالية" : "Financial Reports",
      color: "from-blue-500/10 to-blue-600/5",
      items: [
        { title: isRTL ? "قائمة الدخل" : "Income Statement", description: isRTL ? "الإيرادات والمصروفات وصافي الربح" : "Revenue, expenses, and net profit", icon: TrendingUp, path: "/client/reports/income-statement" },
        { title: isRTL ? "الميزانية العمومية" : "Balance Sheet", description: isRTL ? "الأصول والخصوم وحقوق الملكية" : "Assets, liabilities, and equity", icon: BarChart3, path: "/client/reports/balance-sheet" },
        { title: isRTL ? "التدفقات النقدية" : "Cash Flow", description: isRTL ? "حركة النقدية الداخلة والخارجة" : "Cash inflows and outflows", icon: Wallet, path: "/client/reports/cash-flow" },
        { title: isRTL ? "ميزان المراجعة" : "Trial Balance", description: isRTL ? "أرصدة جميع الحسابات" : "All account balances", icon: FileText, path: "/client/reports/trial-balance" },
        { title: isRTL ? "تقرير ضريبة القيمة المضافة" : "VAT Report", description: isRTL ? "إقرار وتفاصيل ضريبة القيمة المضافة" : "VAT declaration and details", icon: Receipt, path: "/client/reports/vat" },
      ],
    },
    {
      category: isRTL ? "تقارير المبيعات" : "Sales Reports",
      color: "from-emerald-500/10 to-emerald-600/5",
      items: [
        { title: isRTL ? "عروض أسعار المبيعات" : "Sales Quotations", description: isRTL ? "جميع عروض الأسعار وحالاتها" : "All quotations and their status", icon: FileText, path: "/client/reports/sales?tab=quotations" },
        { title: isRTL ? "طلبات المبيعات" : "Sales Orders", description: isRTL ? "طلبات المبيعات المؤكدة والمعلقة" : "Confirmed and pending sales orders", icon: ClipboardList, path: "/client/reports/sales?tab=orders" },
        { title: isRTL ? "سندات التسليم" : "Delivery Notes", description: isRTL ? "سندات التسليم والشحن" : "Delivery and shipping notes", icon: Truck, path: "/client/reports/sales?tab=delivery" },
        { title: isRTL ? "فواتير المبيعات" : "Sales Invoices", description: isRTL ? "جميع فواتير المبيعات" : "All sales invoices", icon: Receipt, path: "/client/reports/sales?tab=invoices" },
        { title: isRTL ? "المبيعات حسب الصنف / العميل / التصنيف" : "Sales by Item / Customer / Category", description: isRTL ? "تحليل المبيعات بعدة محاور" : "Multi-dimensional sales analysis", icon: BarChart3, path: "/client/reports/sales?tab=analysis" },
        { title: isRTL ? "أعمار ذمم المبيعات" : "Sales Aging Report", description: isRTL ? "تحليل المستحقات حسب العمر" : "Receivables aging analysis", icon: Calendar, path: "/client/reports/sales?tab=aging" },
        { title: isRTL ? "كشف حساب العملاء" : "Customer Statement", description: isRTL ? "كشف حساب تفصيلي لكل عميل" : "Detailed customer account statement", icon: Users, path: "/client/reports/sales?tab=statement" },
        { title: isRTL ? "الحد الائتماني للعملاء" : "Customer Credit Limits", description: isRTL ? "متابعة الحدود الائتمانية والمتبقي" : "Monitor credit limits and remaining", icon: CreditCard, path: "/client/reports/sales?tab=credit" },
      ],
    },
    {
      category: isRTL ? "تقارير المشتريات" : "Purchase Reports",
      color: "from-orange-500/10 to-orange-600/5",
      items: [
        { title: isRTL ? "عروض المشتريات" : "Purchase Quotations", description: isRTL ? "عروض الأسعار المستلمة من الموردين" : "Vendor quotations received", icon: FileText, path: "/client/reports/purchases?tab=quotations" },
        { title: isRTL ? "طلبات المشتريات" : "Purchase Orders", description: isRTL ? "أوامر الشراء وحالاتها" : "Purchase orders and their status", icon: ClipboardList, path: "/client/reports/purchases?tab=orders" },
        { title: isRTL ? "سندات الاستلام" : "Receiving Notes", description: isRTL ? "سندات استلام البضائع" : "Goods receiving notes", icon: Truck, path: "/client/reports/purchases?tab=receiving" },
        { title: isRTL ? "فواتير المشتريات" : "Purchase Invoices", description: isRTL ? "جميع فواتير المشتريات" : "All purchase invoices", icon: Receipt, path: "/client/reports/purchases?tab=invoices" },
        { title: isRTL ? "المشتريات حسب الصنف / المورد" : "Purchases by Item / Vendor", description: isRTL ? "تحليل المشتريات بعدة محاور" : "Multi-dimensional purchase analysis", icon: BarChart3, path: "/client/reports/purchases?tab=analysis" },
        { title: isRTL ? "مرتجع المشتريات" : "Purchase Returns", description: isRTL ? "المرتجعات ومبالغ الاسترداد" : "Returns and refund amounts", icon: RotateCcw, path: "/client/reports/purchases?tab=returns" },
        { title: isRTL ? "مدفوعات المشتريات" : "Purchase Payments", description: isRTL ? "المدفوعات للموردين" : "Payments made to vendors", icon: CreditCard, path: "/client/reports/purchases?tab=payments" },
        { title: isRTL ? "أعمار ذمم الموردين" : "Vendor Aging Report", description: isRTL ? "تحليل المستحقات للموردين" : "Payables aging analysis", icon: Calendar, path: "/client/reports/purchases?tab=aging" },
        { title: isRTL ? "كشف حساب الموردين" : "Vendor Statement", description: isRTL ? "كشف حساب تفصيلي لكل مورد" : "Detailed vendor account statement", icon: UserCheck, path: "/client/reports/purchases?tab=statement" },
      ],
    },
    {
      category: isRTL ? "تقارير المخزون الأساسية" : "Core Inventory Reports",
      color: "from-purple-500/10 to-purple-600/5",
      items: [
        { title: isRTL ? "قائمة الأسعار المحدثة" : "Updated Price List", description: isRTL ? "أسعار البيع والشراء الحالية" : "Current selling and buying prices", icon: ListChecks, path: "/client/reports/inventory?tab=pricelist" },
        { title: isRTL ? "المخزون الحالي حسب التاريخ والمخزن" : "Current Stock by Date & Warehouse", description: isRTL ? "أرصدة المخزون بأي تاريخ" : "Stock balances at any date", icon: Package, path: "/client/reports/inventory?tab=stock" },
        { title: isRTL ? "جدول حركة الأصناف التفصيلي" : "Detailed Item Movements", description: isRTL ? "الوارد والصادر لكل صنف" : "Inbound and outbound per item", icon: BarChart3, path: "/client/reports/inventory?tab=movements" },
        { title: isRTL ? "ملخص عمليات الصنف" : "Item Operations Summary", description: isRTL ? "ملخص كافة عمليات الصنف" : "Summary of all item operations", icon: Layers, path: "/client/reports/inventory?tab=summary" },
        { title: isRTL ? "كرت الصنف الشامل" : "Comprehensive Item Card", description: isRTL ? "بطاقة تفصيلية للصنف" : "Detailed item card with full history", icon: BoxSelect, path: "/client/reports/inventory?tab=itemcard" },
        { title: isRTL ? "قائمة الأصناف حسب المورد" : "Items by Vendor", description: isRTL ? "الأصناف المرتبطة بكل مورد" : "Items linked to each vendor", icon: UserCheck, path: "/client/reports/inventory?tab=byvendor" },
        { title: isRTL ? "قائمة الأصناف حسب العميل" : "Items by Customer", description: isRTL ? "الأصناف المباعة لكل عميل" : "Items sold to each customer", icon: Users, path: "/client/reports/inventory?tab=bycustomer" },
        { title: isRTL ? "مخزون أول المدة" : "Opening Stock", description: isRTL ? "أرصدة المخزون الافتتاحية" : "Opening inventory balances", icon: Clock, path: "/client/reports/inventory?tab=opening" },
        { title: isRTL ? "المخزون الراكد" : "Dead Stock", description: isRTL ? "الأصناف بدون حركة للتخطيط الأمثل" : "Slow/non-moving items for planning", icon: AlertTriangle, path: "/client/reports/inventory?tab=deadstock" },
      ],
    },
    {
      category: isRTL ? "التقارير التشغيلية" : "Operational Reports",
      color: "from-red-500/10 to-red-600/5",
      items: [
        { title: isRTL ? "تحويلات المخزون" : "Stock Transfers", description: isRTL ? "حركات التحويل بين المستودعات" : "Inter-warehouse transfer movements", icon: Truck, path: "/client/reports/operations?tab=transfers" },
        { title: isRTL ? "المواد المستخدمة داخلياً" : "Internal Consumptions", description: isRTL ? "المواد المستهلكة للاستخدام الداخلي" : "Materials consumed internally", icon: Wrench, path: "/client/reports/operations?tab=consumptions" },
        { title: isRTL ? "الأصناف التالفة" : "Damaged Items", description: isRTL ? "الأصناف التالفة والمفقودة" : "Damaged and lost items report", icon: Flame, path: "/client/reports/operations?tab=damaged" },
        { title: isRTL ? "تسويات المخزون" : "Stock Adjustments", description: isRTL ? "جميع تسويات الزيادة والنقص" : "All adjustment entries", icon: ClipboardList, path: "/client/reports/operations?tab=adjustments" },
        { title: isRTL ? "عمليات التصنيع" : "Manufacturing Operations", description: isRTL ? "أوامر التصنيع وحالاتها" : "Manufacturing orders and statuses", icon: Factory, path: "/client/reports/operations?tab=manufacturing" },
        { title: isRTL ? "المواد المستهلكة في التصنيع" : "Manufacturing Materials", description: isRTL ? "المواد الخام المستخدمة في التصنيع" : "Raw materials used in manufacturing", icon: Package, path: "/client/reports/operations?tab=mfg-materials" },
      ],
    },
  ];

  return (
    <div className={`space-y-8 ${isRTL ? "rtl" : "ltr"}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isRTL ? "مركز التقارير" : "Reports Center"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "جميع التقارير المالية والتشغيلية في مكان واحد" : "All financial and operational reports in one place"}
        </p>
      </div>

      {reports.map((category, categoryIndex) => (
        <div key={categoryIndex} className="space-y-4">
          <div className={`flex items-center gap-3 pb-2 border-b`}>
            <div className={`h-1.5 w-1.5 rounded-full bg-primary`} />
            <h2 className="text-lg font-semibold text-foreground">{category.category}</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {category.items.length}
            </span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {category.items.map((report, reportIndex) => (
              <Card
                key={reportIndex}
                className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group border-border/60"
                onClick={() => report.path && navigate(report.path)}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/8 rounded-lg shrink-0 group-hover:bg-primary/12 transition-colors">
                      <report.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-medium leading-tight">{report.title}</CardTitle>
                      <CardDescription className="text-xs mt-1 line-clamp-2">{report.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-4">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    <span>{isRTL ? "عرض" : "View"}</span>
                    <Arrow className="h-3 w-3" />
                  </div>
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
