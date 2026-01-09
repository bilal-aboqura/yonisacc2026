import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
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
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  labelEn: string;
  path?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { 
    icon: LayoutDashboard, 
    label: "لوحة التحكم", 
    labelEn: "Dashboard", 
    path: "/client" 
  },
  {
    icon: Calculator,
    label: "المحاسبة المالية",
    labelEn: "Financial Accounting",
    children: [
      { icon: ClipboardList, label: "دليل الحسابات", labelEn: "Chart of Accounts", path: "/client/accounts" },
      { icon: FileSpreadsheet, label: "الأرصدة الإفتتاحية", labelEn: "Opening Balances", path: "/client/accounts/opening-balances" },
      { icon: Target, label: "مراكز التكلفة", labelEn: "Cost Centers", path: "/client/cost-centers" },
      { icon: BookOpen, label: "قيود اليومية", labelEn: "Journal Entries", path: "/client/journal" },
      { icon: Wallet, label: "الخزينة و البنوك", labelEn: "Treasury & Banks", path: "/client/treasury" },
      { icon: BookOpenCheck, label: "دفتر الأستاذ", labelEn: "General Ledger", path: "/client/ledger" },
      { icon: BarChart3, label: "تقارير مراكز التكلفة", labelEn: "Cost Center Reports", path: "/client/cost-centers/reports" },
      { icon: ListChecks, label: "سجل العمليات", labelEn: "Operations Log", path: "/client/operations-log" },
    ]
  },
  {
    icon: ShoppingCart,
    label: "المبيعات",
    labelEn: "Sales",
    children: [
      { icon: Users, label: "العملاء", labelEn: "Customers", path: "/client/customers" },
      { icon: FileText, label: "عرض سعر", labelEn: "Quotations", path: "/client/quotes" },
      { icon: Receipt, label: "فاتورة مبيعات", labelEn: "Sales Invoice", path: "/client/sales" },
    ]
  },
  {
    icon: Package,
    label: "المشتريات",
    labelEn: "Purchases",
    children: [
      { icon: UserPlus, label: "الموردين", labelEn: "Vendors", path: "/client/vendors" },
      { icon: FileText, label: "أمر شراء", labelEn: "Purchase Order", path: "/client/purchase-orders" },
      { icon: Receipt, label: "فاتورة مشتريات", labelEn: "Purchase Invoice", path: "/client/purchases" },
    ]
  },
  {
    icon: UserCheck,
    label: "الموارد البشرية",
    labelEn: "Human Resources",
    children: [
      { icon: LayoutDashboard, label: "لوحة تحكم HR", labelEn: "HR Dashboard", path: "/client/hr" },
      { icon: Users, label: "الموظفين", labelEn: "Employees", path: "/client/hr/employees" },
      { icon: Building, label: "الأقسام", labelEn: "Departments", path: "/client/hr/departments" },
      { icon: Calendar, label: "الإجازات", labelEn: "Leaves", path: "/client/hr/leaves" },
      { icon: Clock, label: "الفترات", labelEn: "Periods", path: "/client/hr/periods" },
      { icon: Clock, label: "الحضور و الانصراف", labelEn: "Attendance", path: "/client/hr/attendance" },
      { icon: Banknote, label: "السلف و القروض", labelEn: "Loans & Advances", path: "/client/hr/loans" },
      { icon: DollarSign, label: "الرواتب", labelEn: "Payroll", path: "/client/hr/payroll" },
      { icon: Award, label: "نهاية الخدمة", labelEn: "End of Service", path: "/client/hr/end-of-service" },
      { icon: BarChart3, label: "التقارير", labelEn: "Reports", path: "/client/hr/reports" },
    ]
  },
  { 
    icon: Package, 
    label: "المخزون", 
    labelEn: "Inventory", 
    path: "/client/inventory" 
  },
  { 
    icon: BarChart3, 
    label: "التقارير", 
    labelEn: "Reports", 
    path: "/client/reports" 
  },
  { 
    icon: TrendingUp, 
    label: "الإحصائيات", 
    labelEn: "Analytics", 
    path: "/client/analytics" 
  },
  { 
    icon: Settings, 
    label: "الإعدادات", 
    labelEn: "Settings", 
    path: "/client/settings" 
  },
];

const ClientLayout = () => {
  const { isRTL } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

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
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
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
                isRTL ? "flex-row-reverse" : "flex-row",
                groupActive && "bg-primary/10 text-primary"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 shrink-0",
                groupActive && "text-primary"
              )} />
              {!collapsed && (
                <span className="truncate flex-1 text-start">{isRTL ? item.label : item.labelEn}</span>
              )}
              {!collapsed && (
                <ChevronDown className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  groupOpen && "rotate-180"
                )} />
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
          isChild && !collapsed && (isRTL ? "pe-10" : "ps-10"),
          isActive(item.path) && "bg-primary text-primary-foreground font-medium"
        )}
        onClick={() => item.path && handleNavigate(item.path)}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <span className="truncate flex-1 text-start">{isRTL ? item.label : item.labelEn}</span>
        )}
      </Button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("h-16 px-4 border-b flex items-center", isRTL && "flex-row-reverse justify-end")}>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Building2 className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && (
            <span className="font-bold text-lg text-foreground">محاسبي</span>
          )}
        </div>
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
            collapsed && "justify-center px-2"
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <span className="truncate flex-1 text-start">{isRTL ? "تسجيل الخروج" : "Logout"}</span>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-card border-e transition-all duration-300",
          collapsed ? "w-[70px]" : "w-[280px]"
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
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-16 border-b bg-card px-4 flex items-center justify-between">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Desktop: Collapse Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex"
          >
            {collapsed ? (
              isRTL ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />
            ) : (
              isRTL ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />
            )}
          </Button>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;
