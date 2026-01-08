import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Menu,
  Building2,
  Wallet,
  ShoppingCart,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const ClientLayout = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: "لوحة التحكم", labelEn: "Dashboard", path: "/client" },
    { icon: FileText, label: "فواتير المبيعات", labelEn: "Sales Invoices", path: "/client/sales" },
    { icon: ShoppingCart, label: "فواتير المشتريات", labelEn: "Purchase Invoices", path: "/client/purchases" },
    { icon: BookOpen, label: "القيود اليومية", labelEn: "Journal Entries", path: "/client/journal" },
    { icon: ClipboardList, label: "دليل الحسابات", labelEn: "Chart of Accounts", path: "/client/accounts" },
    { icon: Wallet, label: "الخزينة", labelEn: "Treasury", path: "/client/treasury" },
    { icon: Package, label: "المخزون", labelEn: "Inventory", path: "/client/inventory" },
    { icon: Users, label: "العملاء والموردين", labelEn: "Customers & Vendors", path: "/client/contacts" },
    { icon: BarChart3, label: "التقارير", labelEn: "Reports", path: "/client/reports" },
    { icon: TrendingUp, label: "الإحصائيات", labelEn: "Analytics", path: "/client/analytics" },
    { icon: Settings, label: "الإعدادات", labelEn: "Settings", path: "/client/settings" },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-foreground">محاسبي</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex"
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
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11",
                  collapsed && "justify-center px-2",
                  isActive && "bg-primary/10 text-primary"
                )}
                onClick={() => handleNavigate(item.path)}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="truncate">{isRTL ? item.label : item.labelEn}</span>
                )}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t space-y-2">
        <div className={cn("flex gap-2", collapsed ? "flex-col items-center" : "")}>
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center px-2"
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>{isRTL ? "تسجيل الخروج" : "Logout"}</span>}
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
          collapsed ? "w-[70px]" : "w-[260px]"
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
        <header className="h-16 border-b bg-card px-4 flex items-center justify-between md:justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2 md:hidden">
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
