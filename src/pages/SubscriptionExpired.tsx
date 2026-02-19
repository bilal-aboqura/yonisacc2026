import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, LogOut, Mail } from "lucide-react";

const SubscriptionExpired = () => {
  const { isRTL } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-0 shadow-xl">
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {isRTL ? "الاشتراك غير نشط" : "Subscription Inactive"}
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              {isRTL
                ? "اشتراكك الحالي غير نشط. يرجى التواصل مع إدارة المنصة لتجديد اشتراكك أو ترقية خطتك للوصول إلى لوحة التحكم."
                : "Your current subscription is inactive. Please contact the platform administration to renew your subscription or upgrade your plan to access the dashboard."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              {isRTL ? "تسجيل الخروج" : "Sign Out"}
            </Button>
            <Button
              className="gap-2 gradient-primary text-primary-foreground"
              onClick={() => window.location.href = "mailto:support@costamine.com"}
            >
              <Mail className="h-4 w-4" />
              {isRTL ? "تواصل مع الدعم" : "Contact Support"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionExpired;
