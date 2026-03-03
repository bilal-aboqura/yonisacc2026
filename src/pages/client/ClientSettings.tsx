import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, User, Bell, Palette, Users, Loader2, Printer, CreditCard, Shield, Trash2, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import TeamManagement from "@/components/client/TeamManagement";
import CompanyLogoUpload from "@/components/client/CompanyLogoUpload";
import PrintSettingsTab from "@/components/print/PrintSettingsTab";
import PaymentMethodsSettings from "@/components/client/PaymentMethodsSettings";
import RolesPermissionsManager from "@/components/client/RolesPermissionsManager";
import BranchAccountSettings from "@/components/client/BranchAccountSettings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

interface ClientSettingsProps {
  tab?: string;
}

const ClientSettings = ({ tab }: ClientSettingsProps) => {
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

  const isTestOwner = user?.id === "87740311-8413-47eb-b936-b4c96daecaa5";
  const isLoading = loadingCompany || loadingProfile;
  const activeTab = tab || "company";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const titleMap: Record<string, { ar: string; en: string }> = {
    company: { ar: "بيانات الشركة", en: "Company Information" },
    team: { ar: "إدارة الفريق", en: "Team Management" },
    roles: { ar: "الأدوار والصلاحيات", en: "Roles & Permissions" },
    profile: { ar: "الملف الشخصي", en: "Profile" },
    branches: { ar: "حسابات الفروع", en: "Branch Accounts" },
    print: { ar: "إعدادات الطباعة", en: "Print Settings" },
    "payment-methods": { ar: "طرق الدفع", en: "Payment Methods" },
    appearance: { ar: "المظهر", en: "Appearance" },
  };

  const currentTitle = titleMap[activeTab] || titleMap.company;

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isRTL ? currentTitle.ar : currentTitle.en}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "إدارة إعدادات الحساب والشركة" : "Manage account and company settings"}
        </p>
      </div>

      {activeTab === "company" && (
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "بيانات الشركة" : "Company Information"}</CardTitle>
            <CardDescription>
              {isRTL ? "تحديث بيانات الشركة الأساسية" : "Update basic company information"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {company?.id && (
              <div className="space-y-2">
                <Label>{isRTL ? "شعار الشركة" : "Company Logo"}</Label>
                <CompanyLogoUpload
                  companyId={company.id}
                  currentLogoUrl={company.logo_url}
                  isRTL={isRTL}
                  onLogoUpdated={() => queryClient.invalidateQueries({ queryKey: ["settings-company"] })}
                />
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "اسم الشركة (عربي)" : "Company Name (Arabic)"}</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={isRTL ? "اسم الشركة" : "Company name"} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "اسم الشركة (إنجليزي)" : "Company Name (English)"}</Label>
                <Input value={companyNameEn} onChange={(e) => setCompanyNameEn(e.target.value)} placeholder="Company name" dir="ltr" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                <Input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="info@company.com" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "رقم الهاتف" : "Phone"}</Label>
                <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+966" dir="ltr" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "السجل التجاري" : "Commercial Register"}</Label>
                <Input value={commercialRegister} onChange={(e) => setCommercialRegister(e.target.value)} placeholder={isRTL ? "رقم السجل التجاري" : "Commercial register number"} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الرقم الضريبي" : "Tax Number"}</Label>
                <Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} placeholder={isRTL ? "الرقم الضريبي" : "Tax number"} dir="ltr" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "العنوان" : "Address"}</Label>
              <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder={isRTL ? "عنوان الشركة" : "Company address"} />
            </div>
            <Button onClick={() => saveCompany.mutate()} disabled={saveCompany.isPending}>
              {saveCompany.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "حفظ التغييرات" : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "team" && <TeamManagement />}

      {activeTab === "roles" && <RolesPermissionsManager />}

      {activeTab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "الملف الشخصي" : "Profile"}</CardTitle>
            <CardDescription>{isRTL ? "تحديث بيانات حسابك" : "Update your account information"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم الكامل" : "Full Name"}</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={isRTL ? "الاسم الكامل" : "Full name"} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                <Input type="email" value={user?.email || ""} disabled dir="ltr" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "رقم الهاتف" : "Phone"}</Label>
              <Input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="+966" dir="ltr" />
            </div>
            <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
              {saveProfile.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "حفظ التغييرات" : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "branches" && (
        company?.id ? (
          <BranchAccountSettings companyId={company.id} />
        ) : (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{isRTL ? "لا توجد شركة مرتبطة" : "No company linked"}</CardContent></Card>
        )
      )}

      {activeTab === "print" && (
        company?.id ? (
          <PrintSettingsTab companyId={company.id} />
        ) : (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{isRTL ? "لا توجد شركة مرتبطة" : "No company linked"}</CardContent></Card>
        )
      )}

      {activeTab === "payment-methods" && (
        company?.id ? (
          <PaymentMethodsSettings companyId={company.id} />
        ) : (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{isRTL ? "لا توجد شركة مرتبطة" : "No company linked"}</CardContent></Card>
        )
      )}

      {activeTab === "appearance" && (
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "المظهر" : "Appearance"}</CardTitle>
            <CardDescription>{isRTL ? "تخصيص مظهر التطبيق" : "Customize the application appearance"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>{isRTL ? "اللغة" : "Language"}</Label>
                <p className="text-sm text-muted-foreground">{isRTL ? "اختر لغة الواجهة" : "Choose interface language"}</p>
              </div>
              <LanguageToggle />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{isRTL ? "المظهر" : "Theme"}</Label>
                <p className="text-sm text-muted-foreground">{isRTL ? "اختر المظهر الفاتح أو الداكن" : "Choose light or dark theme"}</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "danger" && isTestOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {isRTL ? "منطقة الخطر" : "Danger Zone"}
            </CardTitle>
            <CardDescription>{isRTL ? "عمليات لا يمكن التراجع عنها" : "Irreversible operations"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg">
              <div>
                <p className="font-medium">{isRTL ? "مسح جميع بيانات الشركة" : "Reset all company data"}</p>
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? "حذف جميع الفواتير، القيود، جهات الاتصال، المنتجات، والحركات. سيتم الاحتفاظ بدليل الحسابات وإعدادات الشركة."
                    : "Delete all invoices, journal entries, contacts, products, and transactions. Chart of accounts and company settings will be kept."}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2 shrink-0">
                    <Trash2 className="h-4 w-4" />
                    {isRTL ? "مسح البيانات" : "Reset Data"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">
                      {isRTL ? "⚠️ تأكيد مسح جميع البيانات" : "⚠️ Confirm Data Reset"}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">
                        {isRTL ? "سيتم حذف جميع البيانات التالية نهائياً:" : "The following data will be permanently deleted:"}
                      </span>
                      <span className="block text-sm">
                        {isRTL
                          ? "• الفواتير (مبيعات ومشتريات) • القيود المحاسبية • جهات الاتصال (عملاء وموردين) • المنتجات والمخزون • حركات الخزينة • الأرصدة الافتتاحية • الفترات المالية • الحسابات البنكية • مراكز التكلفة"
                          : "• Invoices (sales & purchases) • Journal entries • Contacts (customers & vendors) • Products & inventory • Treasury transactions • Opening balances • Fiscal periods • Bank accounts • Cost centers"}
                      </span>
                      <span className="block font-semibold text-destructive">
                        {isRTL ? "هذا الإجراء لا يمكن التراجع عنه!" : "This action cannot be undone!"}
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        if (!company?.id) return;
                        try {
                          const { error } = await (supabase.rpc as any)("reset_company_data", { p_company_id: company.id });
                          if (error) throw error;
                          queryClient.invalidateQueries();
                          toast.success(isRTL ? "تم مسح جميع البيانات بنجاح" : "All data has been reset successfully");
                        } catch (err: any) {
                          console.error("Reset failed:", err);
                          toast.error(isRTL ? "فشل في مسح البيانات" : "Failed to reset data");
                        }
                      }}
                    >
                      {isRTL ? "نعم، مسح الكل" : "Yes, Reset All"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientSettings;
