import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { 
  LayoutDashboard, Users, CreditCard, Settings, 
  LogOut, BarChart3, Building2, Loader2
} from "lucide-react";

const Dashboard = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const stats = [
    { 
      title: isRTL ? "إجمالي الإيرادات" : "Total Revenue", 
      value: "0 SAR", 
      icon: BarChart3,
      color: "from-blue-500 to-blue-600"
    },
    { 
      title: isRTL ? "المشتركين النشطين" : "Active Subscribers", 
      value: "0", 
      icon: Users,
      color: "from-green-500 to-green-600"
    },
    { 
      title: isRTL ? "الاشتراكات المعلقة" : "Pending Subscriptions", 
      value: "0", 
      icon: CreditCard,
      color: "from-amber-500 to-amber-600"
    },
    { 
      title: isRTL ? "الشركات المسجلة" : "Registered Companies", 
      value: "0", 
      icon: Building2,
      color: "from-purple-500 to-purple-600"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gradient">{t("common.appName")}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <Button variant="ghost" onClick={handleSignOut} className="gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.logout")}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            {t("dashboard.welcome")}، {user.email?.split("@")[0]}! 👋
          </h2>
          <p className="text-muted-foreground">
            {isRTL ? "هذه لوحة التحكم الخاصة بك" : "This is your dashboard"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              {t("dashboard.quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Users className="h-6 w-6" />
                {isRTL ? "إدارة المشتركين" : "Manage Subscribers"}
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <CreditCard className="h-6 w-6" />
                {isRTL ? "إدارة الباقات" : "Manage Plans"}
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <BarChart3 className="h-6 w-6" />
                {isRTL ? "التقارير" : "Reports"}
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Settings className="h-6 w-6" />
                {isRTL ? "الإعدادات" : "Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
