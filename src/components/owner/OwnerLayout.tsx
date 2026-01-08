import { useTranslation } from "react-i18next";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Monitor,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Building2,
  BarChart3,
} from "lucide-react";

const OwnerLayout = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { 
      path: "/owner", 
      icon: LayoutDashboard, 
      label: isRTL ? "الرئيسية" : "Dashboard",
      end: true 
    },
    { 
      path: "/owner/subscribers", 
      icon: Users, 
      label: isRTL ? "المشتركين" : "Subscribers" 
    },
    { 
      path: "/owner/subscriptions", 
      icon: CreditCard, 
      label: isRTL ? "الاشتراكات" : "Subscriptions" 
    },
    { 
      path: "/owner/plans", 
      icon: Building2, 
      label: isRTL ? "الباقات" : "Plans" 
    },
    { 
      path: "/owner/screens", 
      icon: Monitor, 
      label: isRTL ? "الشاشات" : "Screens" 
    },
    { 
      path: "/owner/messages", 
      icon: MessageSquare, 
      label: isRTL ? "الرسائل" : "Messages" 
    },
    { 
      path: "/owner/reports", 
      icon: BarChart3, 
      label: isRTL ? "التقارير" : "Reports" 
    },
    { 
      path: "/owner/settings", 
      icon: Settings, 
      label: isRTL ? "الإعدادات" : "Settings" 
    },
  ];

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "p-4 border-b flex items-center",
        collapsed && !mobile ? "justify-center" : "justify-between"
      )}>
        {(!collapsed || mobile) && (
          <h1 
            className="text-xl font-bold text-gradient cursor-pointer" 
            onClick={() => navigate("/")}
          >
            {t("common.appName")}
          </h1>
        )}
        {!mobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex"
          >
            {isRTL ? (
              collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                "hover:bg-accent hover:text-accent-foreground",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground",
                collapsed && !mobile && "justify-center px-2"
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {(!collapsed || mobile) && (
              <span className="font-medium">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className={cn(
        "p-4 border-t",
        collapsed && !mobile && "px-2"
      )}>
        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          className={cn(
            "w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10",
            collapsed && !mobile && "px-2"
          )}
        >
          <LogOut className="h-4 w-4" />
          {(!collapsed || mobile) && (isRTL ? "تسجيل الخروج" : "Logout")}
        </Button>
      </div>
    </div>
  );

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col border-e bg-card transition-all duration-300",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 glass border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Mobile Menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side={isRTL ? "right" : "left"} className="p-0 w-[280px]">
                  <SidebarContent mobile />
                </SheetContent>
              </Sheet>

              <div className="lg:hidden">
                <h1 className="text-lg font-bold text-gradient">{t("common.appName")}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
              <div className="hidden sm:flex items-center gap-2 ps-2 border-s">
                <div className="text-sm text-end">
                  <p className="font-medium">{user.email?.split("@")[0]}</p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "مالك النظام" : "System Owner"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OwnerLayout;
