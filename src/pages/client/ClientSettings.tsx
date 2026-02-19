import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Building2, User, Bell, Shield, Palette, Users } from "lucide-react";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import TeamManagement from "@/components/client/TeamManagement";

const ClientSettings = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isRTL ? "الإعدادات" : "Settings"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "إدارة إعدادات الحساب والشركة" : "Manage account and company settings"}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            {isRTL ? "الشركة" : "Company"}
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            {isRTL ? "الفريق" : "Team"}
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            {isRTL ? "الملف الشخصي" : "Profile"}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            {isRTL ? "المظهر" : "Appearance"}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            {isRTL ? "الإشعارات" : "Notifications"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "بيانات الشركة" : "Company Information"}</CardTitle>
              <CardDescription>
                {isRTL ? "تحديث بيانات الشركة الأساسية" : "Update basic company information"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم الشركة (عربي)" : "Company Name (Arabic)"}</Label>
                  <Input placeholder={isRTL ? "اسم الشركة" : "Company name"} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم الشركة (إنجليزي)" : "Company Name (English)"}</Label>
                  <Input placeholder="Company name" dir="ltr" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input type="email" placeholder="info@company.com" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "رقم الهاتف" : "Phone"}</Label>
                  <Input placeholder="+966" dir="ltr" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "العنوان" : "Address"}</Label>
                <Input placeholder={isRTL ? "عنوان الشركة" : "Company address"} />
              </div>
              <Button>{isRTL ? "حفظ التغييرات" : "Save Changes"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <TeamManagement />
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "الملف الشخصي" : "Profile"}</CardTitle>
              <CardDescription>
                {isRTL ? "تحديث بيانات حسابك" : "Update your account information"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "الاسم الكامل" : "Full Name"}</Label>
                  <Input placeholder={isRTL ? "الاسم الكامل" : "Full name"} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input type="email" value={user?.email || ""} disabled dir="ltr" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "رقم الهاتف" : "Phone"}</Label>
                <Input placeholder="+966" dir="ltr" />
              </div>
              <Button>{isRTL ? "حفظ التغييرات" : "Save Changes"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "المظهر" : "Appearance"}</CardTitle>
              <CardDescription>
                {isRTL ? "تخصيص مظهر التطبيق" : "Customize the application appearance"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{isRTL ? "اللغة" : "Language"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "اختر لغة الواجهة" : "Choose interface language"}
                  </p>
                </div>
                <LanguageToggle />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{isRTL ? "المظهر" : "Theme"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "اختر المظهر الفاتح أو الداكن" : "Choose light or dark theme"}
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "الإشعارات" : "Notifications"}</CardTitle>
              <CardDescription>
                {isRTL ? "إدارة تفضيلات الإشعارات" : "Manage notification preferences"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                {isRTL ? "إعدادات الإشعارات قيد التطوير" : "Notification settings coming soon"}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientSettings;
