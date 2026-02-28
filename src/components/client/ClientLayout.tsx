import { useState, useEffect } from "react";
import AccountingAssistant from "./AccountingAssistant";
import CompanyDropdown from "./CompanyDropdown";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useAutoPartsAccess } from "@/hooks/useAutoPartsAccess";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useScreenAccess } from "@/hooks/useScreenAccess";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Calculator,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Menu,
  Building2,
  Wallet,
  ShoppingCart,
  ClipboardList,
  TrendingUp,
  UserCheck,
  FileSpreadsheet,
  DollarSign,
  Calendar,
  Clock,
  Banknote,
  Award,
  Building,
  UserPlus,
  Receipt,
  BookOpenCheck,
  Target,
  ListChecks,
  Car,
  Search,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  labelEn: string;
  path?: string;
  screenKey?: string;
  children?: MenuItem[];
}

const baseMenuItems: MenuItem[] = [
  { 
    icon: LayoutDashboard, 
    label: "لوحة التحكم", 
    labelEn: "Dashboard", 
    path: "/client",
    screenKey: "dashboard",
  },
  {
    icon: Calculator,
    label: "المحاسبة المالية",
    labelEn: "Financial Accounting",
    children: [
      { icon: ClipboardList, label: "دليل الحسابات", labelEn: "Chart of Accounts", path: "/client/accounts", screenKey: "accounts" },
      { icon: FileSpreadsheet, label: "الأرصدة الإفتتاحية", labelEn: "Opening Balances", path: "/client/accounts/opening-balances", screenKey: "opening_balances" },
      { icon: Target, label: "مراكز التكلفة", labelEn: "Cost Centers", path: "/client/cost-centers", screenKey: "cost_centers" },
      { icon: BookOpen, label: "قيود اليومية", labelEn: "Journal Entries", path: "/client/journal", screenKey: "journal_entries" },
      { icon: Wallet, label: "الخزينة و البنوك", labelEn: "Treasury & Banks", path: "/client/treasury", screenKey: "treasury" },
      
      { icon: ListChecks, label: "سجل العمليات", labelEn: "Operations Log", path: "/client/operations-log", screenKey: "operations_log" },
    ]
  },
  {
    icon: ShoppingCart,
    label: "المبيعات",
    labelEn: "Sales",
    children: [
      { icon: Users, label: "العملاء", labelEn: "Customers", path: "/client/customers", screenKey: "customers" },
      { icon: FileText, label: "عرض سعر", labelEn: "Quotations", path: "/client/quotes", screenKey: "quotes" },
      { icon: Receipt, label: "فاتورة مبيعات", labelEn: "Sales Invoice", path: "/client/sales", screenKey: "sales_invoices" },
    ]
  },
  {
    icon: Package,
    label: "المشتريات",
    labelEn: "Purchases",
    children: [
      { icon: UserPlus, label: "الموردين", labelEn: "Vendors", path: "/client/vendors", screenKey: "vendors" },
      { icon: FileText, label: "أمر شراء", labelEn: "Purchase Order", path: "/client/purchase-orders", screenKey: "purchase_orders" },
      { icon: Receipt, label: "فاتورة مشتريات", labelEn: "Purchase Invoice", path: "/client/purchases", screenKey: "purchase_invoices" },
    ]
  },
  {
    icon: UserCheck,
    label: "الموارد البشرية",
    labelEn: "Human Resources",
    children: [
      { icon: LayoutDashboard, label: "لوحة تحكم HR", labelEn: "HR Dashboard", path: "/client/hr", screenKey: "hr_dashboard" },
      { icon: Users, label: "الموظفين", labelEn: "Employees", path: "/client/hr/employees", screenKey: "employees" },
      { icon: Building, label: "الأقسام", labelEn: "Departments", path: "/client/hr/departments", screenKey: "departments" },
      { icon: Calendar, label: "الإجازات", labelEn: "Leaves", path: "/client/hr/leaves", screenKey: "leaves" },
      { icon: Clock, label: "الفترات", labelEn: "Periods", path: "/client/hr/periods", screenKey: "periods" },
      { icon: Clock, label: "الحضور و الانصراف", labelEn: "Attendance", path: "/client/hr/attendance", screenKey: "attendance" },
      { icon: Banknote, label: "السلف و القروض", labelEn: "Loans & Advances", path: "/client/hr/loans", screenKey: "loans" },
      { icon: DollarSign, label: "الرواتب", labelEn: "Payroll", path: "/client/hr/payroll", screenKey: "payroll" },
      { icon: Award, label: "نهاية الخدمة", labelEn: "End of Service", path: "/client/hr/end-of-service", screenKey: "end_of_service" },
      { icon: BarChart3, label: "التقارير", labelEn: "Reports", path: "/client/hr/reports", screenKey: "hr_reports" },
    ]
  },
  { 
    icon: Package, 
    label: "المخزون", 
    labelEn: "Inventory", 
    path: "/client/inventory",
    screenKey: "products",
  },
  {
    icon: BarChart3,
    label: "التقارير",
    labelEn: "Reports",
    children: [
      { icon: BookOpenCheck, label: "دفتر الأستاذ", labelEn: "General Ledger", path: "/client/ledger", screenKey: "ledger" },
      { icon: FileText, label: "ميزان المراجعة", labelEn: "Trial Balance", path: "/client/reports/trial-balance", screenKey: "trial_balance" },
      { icon: TrendingUp, label: "قائمة الدخل", labelEn: "Income Statement", path: "/client/reports/income-statement", screenKey: "income_statement" },
      { icon: BarChart3, label: "الميزانية العمومية", labelEn: "Balance Sheet", path: "/client/reports/balance-sheet", screenKey: "balance_sheet" },
      { icon: Wallet, label: "التدفقات النقدية", labelEn: "Cash Flow", path: "/client/reports/cash-flow", screenKey: "cash_flow" },
      { icon: Receipt, label: "تقرير ضريبة القيمة المضافة", labelEn: "VAT Report", path: "/client/reports/vat", screenKey: "vat_report" },
      { icon: BarChart3, label: "تقارير مراكز التكلفة", labelEn: "Cost Center Reports", path: "/client/cost-centers/reports", screenKey: "cost_center_reports" },
    ]
  },
  { 
    icon: Settings, 
    label: "الإعدادات", 
    labelEn: "Settings", 
    path: "/client/settings",
    screenKey: "settings",
  },
];

const autoPartsMenuGroup: MenuItem = {
  icon: Car,
  label: "قطع الغيار",
  labelEn: "Auto Parts",
  children: [
    { icon: Search, label: "كتالوج القطع", labelEn: "Parts Catalog", path: "/client/auto-parts/catalog", screenKey: "auto_parts_catalog" },
    { icon: Car, label: "ماركات السيارات", labelEn: "Car Brands", path: "/client/auto-parts/brands", screenKey: "auto_parts_brands" },
    { icon: Tag, label: "موديلات السيارات", labelEn: "Car Models", path: "/client/auto-parts/models", screenKey: "auto_parts_models" },
  ]
};

const ClientLayout = () => {
  const { isRTL } = useLanguage();
  const { signOut, user, isLoading } = useAuth();
  const { isAutoPartsCompany } = useAutoPartsAccess();
  const { status: subStatus } = useSubscriptionGuard();
  const { isModuleEnabled } = useFeatureAccess();
  const { isScreenEnabled } = useScreenAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // Build menu items dynamically based on activity type AND plan features
  const menuItems = (() => {
    let items = [...baseMenuItems];
    
    // Filter modules based on plan features
    items = items.filter(item => {
      switch (item.labelEn) {
        case "Sales": return isModuleEnabled("sales");
        case "Purchases": return isModuleEnabled("purchases");
        case "Reports": return isModuleEnabled("reports");
        case "Inventory": return isModuleEnabled("inventory");
        case "Human Resources": return isModuleEnabled("hr");
        default: return true;
      }
    });

    // Filter individual screens within each module
    items = items.map(item => {
      if (item.children) {
        const filteredChildren = item.children.filter(child =>
          !child.screenKey || isScreenEnabled(child.screenKey)
        );
        // If no children remain after filtering, hide the whole module
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      // Filter top-level items by screen key
      if (item.screenKey && !isScreenEnabled(item.screenKey)) return null;
      return item;
    }).filter(Boolean) as MenuItem[];

    // Add auto parts group if enabled AND company is auto parts type
    if (isAutoPartsCompany && isModuleEnabled("auto_parts")) {
      const autoPartsFiltered = {
        ...autoPartsMenuGroup,
        children: autoPartsMenuGroup.children?.filter(child =>
          !child.screenKey || isScreenEnabled(child.screenKey)
        ),
      };
      if (autoPartsFiltered.children && autoPartsFiltered.children.length > 0) {
        const reportsIdx = items.findIndex(i => i.labelEn === "Reports");
        if (reportsIdx !== -1) {
          items.splice(reportsIdx, 0, autoPartsFiltered);
        } else {
          items.push(autoPartsFiltered);
        }
      }
    }

    return items;
  })();

  // Require authentication for client area
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/auth", { replace: true, state: { from: location.pathname } });
    }
  }, [isLoading, user, navigate, location.pathname]);

  // Block access if subscription is not active/trialing
  useEffect(() => {
    if (subStatus === "blocked") {
      navigate("/subscription-expired", { replace: true });
    }
  }, [subStatus, navigate]);

  // Auto-open group containing current path
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.children) {
        const hasActivePath = item.children.some(child => location.pathname === child.path);
        if (hasActivePath && !openGroups.includes(item.labelEn)) {
          setOpenGroups(prev => [...prev, item.labelEn]);
        }
      }
    });
  }, [location.pathname]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => 
      prev.includes(groupName) 
        ? []
        : [groupName]
    );
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (path?: string) => path && location.pathname === path;
  const isGroupActive = (children?: MenuItem[]) => 
    children?.some(child => location.pathname === child.path);

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    if (item.children) {
      const groupOpen = openGroups.includes(item.labelEn);
      const groupActive = isGroupActive(item.children);

      return (
        <Collapsible
          key={item.labelEn}
          open={groupOpen}
          onOpenChange={() => toggleGroup(item.labelEn)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full gap-3 h-11 px-3",
                collapsed ? "justify-center" : "justify-between",
                isRTL ? "flex-row-reverse" : "flex-row",
                groupActive && "bg-primary/10 text-primary"
              )}
            >
              <div className={cn("flex items-center gap-3 min-w-0", isRTL && "flex-row-reverse")}>
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    groupActive && "text-primary"
                  )}
                />
                {!collapsed && (
                  <span className="truncate min-w-0 text-start">{isRTL ? item.label : item.labelEn}</span>
                )}
              </div>
              {!collapsed && (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200",
                    groupOpen && "rotate-180"
                  )}
                />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {!collapsed && item.children.map(child => renderMenuItem(child, true))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Button
        key={item.path}
        variant="ghost"
        className={cn(
          "w-full gap-3 h-10 px-3",
          isRTL ? "flex-row-reverse" : "flex-row",
          collapsed ? "justify-center px-2" : "justify-start",
          isChild && !collapsed && (isRTL ? "pe-10" : "ps-10"),
          isActive(item.path) && "bg-primary text-primary-foreground font-medium"
        )}
        onClick={() => item.path && handleNavigate(item.path)}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <span className="truncate min-w-0 text-start">{isRTL ? item.label : item.labelEn}</span>
        )}
      </Button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo & Toggle */}
      <div className={cn("h-16 px-4 border-b flex items-center justify-between", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Building2 className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && (
            <span className="font-bold text-lg text-foreground">Costamine</span>
          )}
        </div>
        {/* Desktop Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "hidden md:flex h-8 w-8 rounded-full hover:bg-primary/10 transition-colors",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? (
            isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Menu Items */}
      <ScrollArea className="flex-1 p-2">
        <nav className="space-y-1">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>
      </ScrollArea>

      {/* Logout Button */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
        className={cn(
            "w-full gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10 px-3",
            isRTL ? "flex-row-reverse" : "flex-row",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <span className="truncate min-w-0 text-start">{isRTL ? "تسجيل الخروج" : "Logout"}</span>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-muted/30 flex w-full">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-card border-e transition-all duration-300 shrink-0",
          collapsed ? "w-[70px]" : "w-[260px] lg:w-[280px]"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side={isRTL ? "right" : "left"} className="p-0 w-[280px]">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="h-14 sm:h-16 border-b bg-card px-3 sm:px-4 flex items-center justify-between shrink-0">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Spacer for desktop */}
          <div className="hidden md:block" />

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <div className="h-6 w-px bg-border mx-0.5 sm:mx-1 hidden sm:block" />
            <CompanyDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <span className="text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</span>
            </div>
          ) : (
            <Outlet />
          )}
        </main>

        {/* AI Accounting Assistant */}
        <AccountingAssistant />
      </div>
    </div>
  );
};

export default ClientLayout;
