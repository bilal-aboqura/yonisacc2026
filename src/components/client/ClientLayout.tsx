import { useState, useEffect } from "react";
import AccountingAssistant from "./AccountingAssistant";
import CompanyDropdown from "./CompanyDropdown";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useRBAC } from "@/hooks/useRBAC";
import { useAllowedModules } from "@/hooks/useAllowedModules";
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
  Shield,
  User,
  Printer,
  CreditCard,
  Palette,
  AlertTriangle,
  Ruler,
  FolderTree,
  Warehouse,
  ArrowRightLeft,
  Wrench,
  Factory,
  Gem,
  Monitor,
  UtensilsCrossed,
  Gift,
  Stethoscope,
  Pill,
  HeartPulse,
  Landmark,
  KeyRound,
  Home,
  Truck,
  MinusCircle,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  labelEn: string;
  path?: string;
  /** RBAC permission code required to see this item */
  permission?: string;
  /** Module key for allowed_modules filtering */
  moduleKey?: string;
  children?: MenuItem[];
}

const baseMenuItems: MenuItem[] = [
  { 
    icon: LayoutDashboard, 
    label: "لوحة التحكم", 
    labelEn: "Dashboard", 
    path: "/client",
    permission: "VIEW_DASHBOARD",
  },
  {
    icon: Calculator,
    label: "المحاسبة المالية",
    labelEn: "Financial Accounting",
    moduleKey: "accounting",
    children: [
      { icon: FileSpreadsheet, label: "الأرصدة الإفتتاحية", labelEn: "Opening Balances", path: "/client/accounts/opening-balances", permission: "VIEW_OPENING_BALANCES" },
      { icon: Target, label: "مراكز التكلفة", labelEn: "Cost Centers", path: "/client/cost-centers", permission: "VIEW_COST_CENTERS" },
      { icon: BookOpen, label: "قيود اليومية", labelEn: "Journal Entries", path: "/client/journal", permission: "VIEW_JOURNAL" },
      { icon: Wallet, label: "الخزينة و البنوك", labelEn: "Treasury & Banks", path: "/client/treasury", permission: "VIEW_TREASURY" },
      { icon: ListChecks, label: "سجل العمليات", labelEn: "Operations Log", path: "/client/operations-log", permission: "VIEW_JOURNAL" },
    ]
  },
  {
    icon: ShoppingCart,
    label: "المبيعات",
    labelEn: "Sales",
    moduleKey: "sales",
    children: [
      { icon: Users, label: "العملاء", labelEn: "Customers", path: "/client/customers", permission: "VIEW_CUSTOMERS" },
      { icon: FileText, label: "عرض سعر", labelEn: "Quotations", path: "/client/quotes", permission: "VIEW_QUOTES" },
      { icon: Receipt, label: "فاتورة مبيعات", labelEn: "Sales Invoice", path: "/client/sales", permission: "VIEW_SALES" },
      { icon: Settings, label: "تجهيز الحسابات", labelEn: "Account Setup", path: "/client/sales/setup", permission: "VIEW_SETTINGS" },
    ]
  },
  {
    icon: Package,
    label: "المشتريات",
    labelEn: "Purchases",
    moduleKey: "purchases",
    children: [
      { icon: UserPlus, label: "الموردين", labelEn: "Vendors", path: "/client/vendors", permission: "VIEW_VENDORS" },
      { icon: FileText, label: "أمر شراء", labelEn: "Purchase Order", path: "/client/purchase-orders", permission: "VIEW_PURCHASE_ORDERS" },
      { icon: Receipt, label: "فاتورة مشتريات", labelEn: "Purchase Invoice", path: "/client/purchases", permission: "VIEW_PURCHASES" },
      { icon: Settings, label: "تجهيز الحسابات", labelEn: "Account Setup", path: "/client/purchases/setup", permission: "VIEW_SETTINGS" },
    ]
  },
  {
    icon: UserCheck,
    label: "الموارد البشرية",
    labelEn: "Human Resources",
    moduleKey: "hr",
    children: [
      { icon: LayoutDashboard, label: "لوحة تحكم HR", labelEn: "HR Dashboard", path: "/client/hr", permission: "VIEW_HR" },
      { icon: Users, label: "الموظفين", labelEn: "Employees", path: "/client/hr/employees", permission: "MANAGE_EMPLOYEES" },
      { icon: Building, label: "الأقسام", labelEn: "Departments", path: "/client/hr/departments", permission: "VIEW_HR" },
      { icon: Calendar, label: "الإجازات", labelEn: "Leaves", path: "/client/hr/leaves", permission: "MANAGE_LEAVES" },
      { icon: Clock, label: "فترات الدوام", labelEn: "Work Shifts", path: "/client/hr/periods", permission: "VIEW_HR" },
      { icon: Clock, label: "الحضور و الانصراف", labelEn: "Attendance", path: "/client/hr/attendance", permission: "MANAGE_ATTENDANCE" },
      { icon: Banknote, label: "السلف و القروض", labelEn: "Loans & Advances", path: "/client/hr/loans", permission: "VIEW_HR" },
      { icon: MinusCircle, label: "الخصومات", labelEn: "Deductions", path: "/client/hr/deductions", permission: "VIEW_HR" },
      { icon: DollarSign, label: "الرواتب", labelEn: "Payroll", path: "/client/hr/payroll", permission: "MANAGE_PAYROLL" },
      { icon: Award, label: "نهاية الخدمة", labelEn: "End of Service", path: "/client/hr/end-of-service", permission: "VIEW_HR" },
      { icon: BarChart3, label: "التقارير", labelEn: "Reports", path: "/client/hr/reports", permission: "VIEW_HR" },
      { icon: Shield, label: "تجهيز الخصومات", labelEn: "Penalty Rules", path: "/client/hr/penalty-rules", permission: "VIEW_HR" },
      { icon: Settings, label: "تجهيز الحسابات", labelEn: "Account Setup", path: "/client/hr/setup", permission: "VIEW_HR" },
    ]
  },
  {
    icon: Package,
    label: "المخزون",
    labelEn: "Inventory",
    moduleKey: "inventory",
    children: [
      { icon: Package, label: "المنتجات", labelEn: "Products", path: "/client/inventory", permission: "VIEW_INVENTORY" },
      { icon: Ruler, label: "الوحدات", labelEn: "Units", path: "/client/inventory/units", permission: "VIEW_UNITS" },
      { icon: FolderTree, label: "التصنيفات", labelEn: "Categories", path: "/client/inventory/categories", permission: "VIEW_CATEGORIES" },
      { icon: Warehouse, label: "نظرة على المخزون", labelEn: "Stock Overview", path: "/client/inventory/stock", permission: "VIEW_INVENTORY" },
      { icon: ClipboardList, label: "تسوية المخزون", labelEn: "Stock Adjustments", path: "/client/inventory/adjustments", permission: "VIEW_ADJUSTMENTS" },
      { icon: ArrowRightLeft, label: "تحويل بين الفروع", labelEn: "Stock Transfers", path: "/client/inventory/transfers", permission: "VIEW_TRANSFERS" },
      { icon: Wrench, label: "الاستهلاك الداخلي", labelEn: "Internal Consumption", path: "/client/inventory/consumptions", permission: "VIEW_CONSUMPTIONS" },
      { icon: Factory, label: "التصنيع", labelEn: "Manufacturing", path: "/client/inventory/manufacturing", permission: "VIEW_MANUFACTURING" },
      { icon: BarChart3, label: "تقارير المخزون", labelEn: "Inventory Reports", path: "/client/inventory/reports", permission: "VIEW_INVENTORY_REPORTS" },
      { icon: Settings, label: "تجهيز الحسابات", labelEn: "Account Setup", path: "/client/inventory/setup", permission: "VIEW_SETTINGS" },
    ]
  },
  {
    icon: Monitor,
    label: "نقاط البيع",
    labelEn: "Point of Sale",
    moduleKey: "pos",
    children: [
      { icon: Monitor, label: "شاشة البيع", labelEn: "POS Screen", path: "/client/pos", permission: "VIEW_POS" },
      { icon: Receipt, label: "الفواتير", labelEn: "Invoices", path: "/client/pos/invoices", permission: "POS_VIEW_INVOICES" },
      { icon: UtensilsCrossed, label: "الطاولات", labelEn: "Tables", path: "/client/pos/tables", permission: "VIEW_POS" },
      { icon: ClipboardList, label: "المنيو", labelEn: "Menus", path: "/client/pos/menus", permission: "VIEW_POS" },
      { icon: Gift, label: "العروض", labelEn: "Promotions", path: "/client/pos/promotions", permission: "POS_MANAGE_PROMOTIONS" },
      { icon: Tag, label: "الكوبونات", labelEn: "Coupons", path: "/client/pos/coupons", permission: "POS_MANAGE_COUPONS" },
      { icon: Target, label: "الأهداف", labelEn: "Targets", path: "/client/pos/targets", permission: "VIEW_POS" },
      { icon: Users, label: "المستخدمين", labelEn: "Users", path: "/client/pos/users", permission: "POS_MANAGE_USERS" },
      { icon: ClipboardList, label: "سجل المستخدمين", labelEn: "User Logs", path: "/client/pos/user-logs", permission: "POS_VIEW_REPORTS" },
      { icon: BarChart3, label: "تقارير POS", labelEn: "POS Reports", path: "/client/pos/reports", permission: "POS_VIEW_REPORTS" },
      { icon: Settings, label: "إعدادات POS", labelEn: "POS Settings", path: "/client/pos/settings", permission: "VIEW_POS" },
      { icon: Settings, label: "تجهيز الحسابات", labelEn: "Account Setup", path: "/client/pos/account-setup", permission: "VIEW_SETTINGS" },
    ]
  },
  {
    icon: BarChart3,
    label: "التقارير",
    labelEn: "Reports",
    moduleKey: "reports",
    children: [
      { icon: BookOpenCheck, label: "دفتر الأستاذ", labelEn: "General Ledger", path: "/client/ledger", permission: "VIEW_LEDGER" },
      { icon: FileText, label: "ميزان المراجعة", labelEn: "Trial Balance", path: "/client/reports/trial-balance", permission: "VIEW_TRIAL_BALANCE" },
      { icon: TrendingUp, label: "قائمة الدخل", labelEn: "Income Statement", path: "/client/reports/income-statement", permission: "VIEW_INCOME_STATEMENT" },
      { icon: BarChart3, label: "الميزانية العمومية", labelEn: "Balance Sheet", path: "/client/reports/balance-sheet", permission: "VIEW_BALANCE_SHEET" },
      { icon: Wallet, label: "التدفقات النقدية", labelEn: "Cash Flow", path: "/client/reports/cash-flow", permission: "VIEW_CASH_FLOW" },
      { icon: Receipt, label: "تقرير ضريبة القيمة المضافة", labelEn: "VAT Report", path: "/client/reports/vat", permission: "VIEW_VAT_REPORT" },
      { icon: BarChart3, label: "تقارير مراكز التكلفة", labelEn: "Cost Center Reports", path: "/client/cost-centers/reports", permission: "VIEW_COST_CENTER_REPORTS" },
      { icon: ShoppingCart, label: "تقارير المبيعات", labelEn: "Sales Reports", path: "/client/reports/sales", permission: "VIEW_SALES" },
      { icon: ClipboardList, label: "تقارير المشتريات", labelEn: "Purchase Reports", path: "/client/reports/purchases", permission: "VIEW_PURCHASES" },
      { icon: Package, label: "تقارير المخزون", labelEn: "Inventory Reports", path: "/client/reports/inventory", permission: "VIEW_INVENTORY" },
      { icon: Factory, label: "التقارير التشغيلية", labelEn: "Operational Reports", path: "/client/reports/operations", permission: "VIEW_INVENTORY" },
    ]
  },
  {
    icon: Settings,
    label: "الإعدادات",
    labelEn: "Settings",
    children: [
      { icon: Building2, label: "الشركة", labelEn: "Company", path: "/client/settings", permission: "VIEW_SETTINGS" },
      { icon: Users, label: "الفريق", labelEn: "Team", path: "/client/settings/team", permission: "VIEW_SETTINGS" },
      { icon: Shield, label: "الأدوار والصلاحيات", labelEn: "Roles & Permissions", path: "/client/settings/roles", permission: "VIEW_SETTINGS" },
      { icon: User, label: "الملف الشخصي", labelEn: "Profile", path: "/client/settings/profile", permission: "VIEW_SETTINGS" },
      { icon: Building, label: "الفروع", labelEn: "Branches", path: "/client/settings/branch-management", permission: "VIEW_SETTINGS" },
      { icon: Building2, label: "حسابات الفروع", labelEn: "Branch Accounts", path: "/client/settings/branches", permission: "VIEW_SETTINGS" },
      { icon: Printer, label: "الطباعة", labelEn: "Print", path: "/client/settings/print", permission: "VIEW_SETTINGS" },
      { icon: CreditCard, label: "طرق الدفع", labelEn: "Payment Methods", path: "/client/settings/payment-methods", permission: "VIEW_SETTINGS" },
      { icon: Palette, label: "المظهر", labelEn: "Appearance", path: "/client/settings/appearance", permission: "VIEW_SETTINGS" },
      { icon: Receipt, label: "الفوترة الإلكترونية", labelEn: "E-Invoicing (ZATCA)", path: "/client/settings/zatca", permission: "VIEW_SETTINGS" },
      { icon: Clock, label: "الفترات المالية", labelEn: "Fiscal Periods", path: "/client/settings/fiscal-periods", permission: "VIEW_SETTINGS" },
    ]
  },
];

const autoPartsMenuGroup: MenuItem = {
  icon: Car,
  label: "قطع الغيار",
  labelEn: "Auto Parts",
  moduleKey: "autoparts",
  children: [
    { icon: LayoutDashboard, label: "لوحة التحكم", labelEn: "Dashboard", path: "/client/auto-parts", permission: "VIEW_AUTO_PARTS" },
    { icon: Search, label: "كتالوج القطع", labelEn: "Parts Catalog", path: "/client/auto-parts/catalog", permission: "VIEW_AUTO_PARTS" },
    { icon: Car, label: "ماركات السيارات", labelEn: "Car Brands", path: "/client/auto-parts/brands", permission: "VIEW_AUTO_PARTS" },
    { icon: Tag, label: "موديلات السيارات", labelEn: "Car Models", path: "/client/auto-parts/models", permission: "VIEW_AUTO_PARTS" },
    { icon: BarChart3, label: "التقارير", labelEn: "Reports", path: "/client/auto-parts/reports", permission: "VIEW_AUTO_PARTS" },
    { icon: Settings, label: "تجهيز الحسابات", labelEn: "Account Setup", path: "/client/auto-parts/setup", permission: "VIEW_SETTINGS" },
  ]
};

const fixedAssetsMenuGroup: MenuItem = {
  icon: Building2,
  label: "الأصول الثابتة",
  labelEn: "Fixed Assets",
  moduleKey: "assets",
  children: [
    { icon: Building2, label: "سجل الأصول", labelEn: "Asset Register", path: "/client/assets", permission: "VIEW_ACCOUNTS" },
    { icon: FolderTree, label: "تصنيفات الأصول", labelEn: "Categories", path: "/client/assets/categories", permission: "VIEW_ACCOUNTS" },
    { icon: Calculator, label: "تشغيل الإهلاك", labelEn: "Run Depreciation", path: "/client/assets/depreciation", permission: "VIEW_ACCOUNTS" },
    { icon: BarChart3, label: "تقارير الأصول", labelEn: "Asset Reports", path: "/client/assets/reports", permission: "VIEW_ACCOUNTS" },
    { icon: Settings, label: "تجهيز الحسابات", labelEn: "Account Setup", path: "/client/assets/setup", permission: "VIEW_SETTINGS" },
  ]
};

const goldMenuGroup: MenuItem = {
  icon: Gem,
  label: "الذهب والمجوهرات",
  labelEn: "Gold & Jewelry",
  moduleKey: "gold",
  children: [
    { icon: Gem, label: "أصناف الذهب", labelEn: "Gold Items", path: "/client/gold/items", permission: "VIEW_INVENTORY" },
    { icon: ShoppingCart, label: "مشتريات الذهب", labelEn: "Gold Purchases", path: "/client/gold/purchases", permission: "VIEW_PURCHASES" },
    { icon: Receipt, label: "مبيعات الذهب", labelEn: "Gold Sales", path: "/client/gold/sales", permission: "VIEW_SALES" },
    { icon: TrendingUp, label: "أسعار الذهب", labelEn: "Gold Prices", path: "/client/gold/prices", permission: "VIEW_INVENTORY" },
    { icon: BarChart3, label: "تقارير الذهب", labelEn: "Gold Reports", path: "/client/gold/reports", permission: "VIEW_INVENTORY" },
    { icon: Settings, label: "تجهيز الحسابات", labelEn: "Account Setup", path: "/client/gold/setup", permission: "VIEW_SETTINGS" },
  ]
};

const clinicMenuGroup: MenuItem = {
  icon: Stethoscope,
  label: "إدارة العيادة",
  labelEn: "Medical Clinic",
  children: [
    { icon: Users, label: "سجل المرضى", labelEn: "Patients", path: "/client/clinic/patients", permission: "VIEW_ACCOUNTS" },
    { icon: HeartPulse, label: "الأطباء", labelEn: "Doctors", path: "/client/clinic/doctors", permission: "VIEW_ACCOUNTS" },
    { icon: Calendar, label: "المواعيد", labelEn: "Appointments", path: "/client/clinic/appointments", permission: "VIEW_ACCOUNTS" },
    { icon: Pill, label: "الوصفات الطبية", labelEn: "Prescriptions", path: "/client/clinic/prescriptions", permission: "VIEW_ACCOUNTS" },
    { icon: Receipt, label: "الفوترة", labelEn: "Billing", path: "/client/clinic/billing", permission: "VIEW_ACCOUNTS" },
    { icon: BarChart3, label: "التقارير", labelEn: "Reports", path: "/client/clinic/reports", permission: "VIEW_ACCOUNTS" },
    { icon: Settings, label: "تجهيز الحسابات", labelEn: "Account Setup", path: "/client/clinic/setup", permission: "VIEW_SETTINGS" },
  ]
};

const realEstateMenuGroup: MenuItem = {
  icon: Landmark,
  label: "إدارة العقارات",
  labelEn: "Real Estate",
  children: [
    { icon: Building2, label: "العقارات", labelEn: "Properties", path: "/client/realestate/properties", permission: "VIEW_ACCOUNTS" },
    { icon: Home, label: "الوحدات", labelEn: "Units", path: "/client/realestate/units", permission: "VIEW_ACCOUNTS" },
    { icon: Users, label: "المستأجرين", labelEn: "Tenants", path: "/client/realestate/tenants", permission: "VIEW_ACCOUNTS" },
    { icon: FileText, label: "عقود الإيجار", labelEn: "Leases", path: "/client/realestate/leases", permission: "VIEW_ACCOUNTS" },
    { icon: Receipt, label: "فواتير الإيجار", labelEn: "Rent Invoices", path: "/client/realestate/invoices", permission: "VIEW_ACCOUNTS" },
    { icon: Wrench, label: "طلبات الصيانة", labelEn: "Maintenance", path: "/client/realestate/maintenance", permission: "VIEW_ACCOUNTS" },
    { icon: BarChart3, label: "التقارير", labelEn: "Reports", path: "/client/realestate/reports", permission: "VIEW_ACCOUNTS" },
    { icon: Settings, label: "تجهيز الحسابات", labelEn: "Account Setup", path: "/client/realestate/setup", permission: "VIEW_SETTINGS" },
  ]
};

const deliveryMenuGroup: MenuItem = {
  icon: Truck,
  label: "إدارة التوصيل",
  labelEn: "Delivery",
  children: [
    { icon: LayoutDashboard, label: "لوحة التحكم", labelEn: "Dashboard", path: "/client/delivery", permission: "VIEW_ACCOUNTS" },
    { icon: Package, label: "طلبات التوصيل", labelEn: "Orders", path: "/client/delivery/orders", permission: "VIEW_ACCOUNTS" },
    { icon: Users, label: "السائقين", labelEn: "Drivers", path: "/client/delivery/drivers", permission: "VIEW_ACCOUNTS" },
    { icon: Building, label: "مناطق التوصيل", labelEn: "Areas", path: "/client/delivery/areas", permission: "VIEW_ACCOUNTS" },
    { icon: Calculator, label: "تقفيل حساب السائقين", labelEn: "Driver Settlement", path: "/client/delivery/settlement", permission: "VIEW_ACCOUNTS" },
    { icon: BarChart3, label: "التقارير", labelEn: "Reports", path: "/client/delivery/reports", permission: "VIEW_ACCOUNTS" },
    { icon: Settings, label: "تجهيز الحسابات", labelEn: "Account Setup", path: "/client/delivery/setup", permission: "VIEW_SETTINGS" },
  ]
};

const ClientLayout = () => {
  const { isRTL } = useLanguage();
  const { signOut, user, isLoading } = useAuth();
  const { status: subStatus } = useSubscriptionGuard();
  const { can } = useRBAC();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // Filter menu items based on RBAC permissions
  const filterByPermission = (items: MenuItem[]): MenuItem[] => {
    return items
      .map(item => {
        if (item.children) {
          const filtered = filterByPermission(item.children);
          if (filtered.length === 0) return null;
          return { ...item, children: filtered };
        }
        // No permission required or user has permission
        if (!item.permission || can(item.permission)) return item;
        return null;
      })
      .filter(Boolean) as MenuItem[];
  };

  const menuItems = (() => {
    let items = filterByPermission([...baseMenuItems]);

    // Always show auto parts module
    {
      const reportsIdx = items.findIndex(i => i.labelEn === "Reports");
      if (reportsIdx !== -1) {
        items.splice(reportsIdx, 0, autoPartsMenuGroup);
      } else {
        items.push(autoPartsMenuGroup);
      }
    }

    // Fixed Assets module
    {
      const reportsIdx2 = items.findIndex(i => i.labelEn === "Reports");
      if (reportsIdx2 !== -1) {
        items.splice(reportsIdx2, 0, fixedAssetsMenuGroup);
      } else {
        items.push(fixedAssetsMenuGroup);
      }
    }

    // Always show gold & jewelry module
    {
      const reportsIdx = items.findIndex(i => i.labelEn === "Reports");
      if (reportsIdx !== -1) {
        items.splice(reportsIdx, 0, goldMenuGroup);
      } else {
        items.push(goldMenuGroup);
      }
    }

    // Medical Clinic module
    {
      const reportsIdx = items.findIndex(i => i.labelEn === "Reports");
      if (reportsIdx !== -1) {
        items.splice(reportsIdx, 0, clinicMenuGroup);
      } else {
        items.push(clinicMenuGroup);
      }
    }

    // Real Estate module
    {
      const reportsIdx = items.findIndex(i => i.labelEn === "Reports");
      if (reportsIdx !== -1) {
        items.splice(reportsIdx, 0, realEstateMenuGroup);
      } else {
        items.push(realEstateMenuGroup);
      }
    }

    // Delivery module
    {
      const reportsIdx = items.findIndex(i => i.labelEn === "Reports");
      if (reportsIdx !== -1) {
        items.splice(reportsIdx, 0, deliveryMenuGroup);
      } else {
        items.push(deliveryMenuGroup);
      }
    }

    const isTestOwner = user?.id === "87740311-8413-47eb-b936-b4c96daecaa5";
    if (isTestOwner) {
      const settingsGroup = items.find(i => i.labelEn === "Settings");
      if (settingsGroup?.children) {
        settingsGroup.children.push({
          icon: AlertTriangle,
          label: "منطقة الخطر",
          labelEn: "Danger Zone",
          path: "/client/settings/danger",
          permission: "VIEW_SETTINGS",
        });
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
    children?.some(child => child.path && location.pathname.startsWith(child.path));

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
