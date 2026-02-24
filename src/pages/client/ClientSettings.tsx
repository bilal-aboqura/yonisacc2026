import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, Bell, Palette, Users, Loader2 } from "lucide-react";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import TeamManagement from "@/components/client/TeamManagement";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const ClientSettings = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch company data
  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ["settings-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch profile data
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["settings-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Company form state
  const [companyName, setCompanyName] = useState("");
  const [companyNameEn, setCompanyNameEn] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [commercialRegister, setCommercialRegister] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");

  // Populate forms when data loads
  useEffect(() => {
    if (company) {
      setCompanyName(company.name || "");
      setCompanyNameEn(company.name_en || "");
      setCompanyEmail(company.email || "");
      setCompanyPhone(company.phone || "");
      setCompanyAddress(company.address || "");
      setCommercialRegister(company.commercial_register || "");
      setTaxNumber(company.tax_number || "");
    }
  }, [company]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setProfilePhone(profile.phone || profile.phone_number || "");
    }
  }, [profile]);

  // Save company mutation
  const saveCompany = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("No company found");
      const { error } = await supabase
        .from("companies")
        .update({
          name: companyName,
          name_en: companyNameEn,
          email: companyEmail,
          phone: companyPhone,
          address: companyAddress,
          commercial_register: commercialRegister,
          tax_number: taxNumber,
        })
        .eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-company"] });
      toast.success(isRTL ? "تم حفظ بيانات الشركة بنجاح" : "Company data saved successfully");
    },
    onError: () => {
      toast.error(isRTL ? "فشل في حفظ البيانات" : "Failed to save data");
    },
  });

  // Save profile mutation
  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: profilePhone,
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      toast.success(isRTL ? "تم حفظ الملف الشخصي بنجاح" : "Profile saved successfully");
    },
    onError: () => {
      toast.error(isRTL ? "فشل في حفظ البيانات" : "Failed to save data");
    },
  });

  const isLoading = loadingCompany || loadingProfile;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isRTL ? "الإعدادات" : "Settings"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "إدارة إعدادات الحساب والشركة" : "Manage account and company settings"}
        </p>
      </div>

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

        {/* Company Tab */}
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
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={isRTL ? "اسم الشركة" : "Company name"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم الشركة (إنجليزي)" : "Company Name (English)"}</Label>
                  <Input
                    value={companyNameEn}
                    onChange={(e) => setCompanyNameEn(e.target.value)}
                    placeholder="Company name"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="info@company.com"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "رقم الهاتف" : "Phone"}</Label>
                  <Input
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+966"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "السجل التجاري" : "Commercial Register"}</Label>
                  <Input
                    value={commercialRegister}
                    onChange={(e) => setCommercialRegister(e.target.value)}
                    placeholder={isRTL ? "رقم السجل التجاري" : "Commercial register number"}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الرقم الضريبي" : "Tax Number"}</Label>
                  <Input
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder={isRTL ? "الرقم الضريبي" : "Tax number"}
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "العنوان" : "Address"}</Label>
                <Input
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder={isRTL ? "عنوان الشركة" : "Company address"}
                />
              </div>
              <Button onClick={() => saveCompany.mutate()} disabled={saveCompany.isPending}>
                {saveCompany.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {isRTL ? "حفظ التغييرات" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <TeamManagement />
        </TabsContent>

        {/* Profile Tab */}
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
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isRTL ? "الاسم الكامل" : "Full name"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input type="email" value={user?.email || ""} disabled dir="ltr" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "رقم الهاتف" : "Phone"}</Label>
                <Input
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+966"
                  dir="ltr"
                />
              </div>
              <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
                {saveProfile.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {isRTL ? "حفظ التغييرات" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
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

        {/* Notifications Tab */}
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
