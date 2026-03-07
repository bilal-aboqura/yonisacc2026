import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Building2, Eye, EyeOff, Save, Loader2, Phone, Mail, MapPin, Key, CreditCard, Share2, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BankAccountSettings {
  bank_name: string;
  bank_name_en: string;
  account_name: string;
  account_number: string;
  iban: string;
  is_visible: boolean;
}

interface PaymentSettings {
  show_bank_transfer: boolean;
  transfer_instructions_ar: string;
  transfer_instructions_en: string;
}

interface ContactInfoSettings {
  phone: string;
  email: string;
  location_ar: string;
  location_en: string;
  show_phone: boolean;
  show_email: boolean;
  show_location: boolean;
}

interface ResendApiSettings {
  api_key: string;
}

interface PaymentGatewaySettings {
  tabby_enabled: boolean;
  tabby_environment: 'sandbox' | 'production';
  tabby_public_key: string;
  tabby_secret_key: string;
  tamara_enabled: boolean;
  tamara_environment: 'sandbox' | 'production';
  tamara_api_token: string;
  tamara_notification_token: string;
}

interface SocialMediaLink {
  id: string;
  platform: string;
  url: string;
  is_visible: boolean;
}

interface SocialMediaSettings {
  links: SocialMediaLink[];
}

const PRESET_PLATFORMS = [
  { value: 'facebook', label: 'Facebook', icon: 'f' },
  { value: 'youtube', label: 'YouTube', icon: '▶' },
  { value: 'telegram', label: 'Telegram', icon: '✈' },
  { value: 'tiktok', label: 'TikTok', icon: '♪' },
  { value: 'twitter', label: 'X (Twitter)', icon: '𝕏' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'in' },
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'snapchat', label: 'Snapchat', icon: '👻' },
  { value: 'other', label: 'Other', icon: '🔗' },
];

const OwnerSettings = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  
  const [bankAccount, setBankAccount] = useState<BankAccountSettings>({
    bank_name: "",
    bank_name_en: "",
    account_name: "",
    account_number: "",
    iban: "",
    is_visible: false,
  });

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    show_bank_transfer: true,
    transfer_instructions_ar: "",
    transfer_instructions_en: "",
  });

  const [contactInfo, setContactInfo] = useState<ContactInfoSettings>({
    phone: "+966 50 123 4567",
    email: "support@costamine.com",
    location_ar: "الرياض، السعودية",
    location_en: "Riyadh, Saudi Arabia",
    show_phone: true,
    show_email: true,
    show_location: true,
  });

  const [resendApi, setResendApi] = useState<ResendApiSettings>({
    api_key: "",
  });

  const [paymentGateways, setPaymentGateways] = useState<PaymentGatewaySettings>({
    tabby_enabled: false,
    tabby_environment: 'sandbox',
    tabby_public_key: '',
    tabby_secret_key: '',
    tamara_enabled: false,
    tamara_environment: 'sandbox',
    tamara_api_token: '',
    tamara_notification_token: '',
  });

  const [socialMedia, setSocialMedia] = useState<SocialMediaSettings>({
    links: [
      { id: '1', platform: 'facebook', url: '', is_visible: true },
      { id: '2', platform: 'youtube', url: '', is_visible: true },
      { id: '3', platform: 'telegram', url: '', is_visible: true },
      { id: '4', platform: 'tiktok', url: '', is_visible: true },
    ],
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["owner-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_settings")
        .select("*");
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const bankSetting = settings.find(s => s.setting_key === "bank_account");
      const paymentSetting = settings.find(s => s.setting_key === "payment_settings");
      const contactSetting = settings.find(s => s.setting_key === "contact_info");
      const resendSetting = settings.find(s => s.setting_key === "resend_api_key");
      
      if (bankSetting?.setting_value) {
        setBankAccount(bankSetting.setting_value as unknown as BankAccountSettings);
      }
      if (paymentSetting?.setting_value) {
        setPaymentSettings(paymentSetting.setting_value as unknown as PaymentSettings);
      }
      if (contactSetting?.setting_value) {
        setContactInfo(contactSetting.setting_value as unknown as ContactInfoSettings);
      }
      if (resendSetting?.setting_value) {
        setResendApi(resendSetting.setting_value as unknown as ResendApiSettings);
      }
      const gatewaySetting = settings.find(s => s.setting_key === "payment_gateways");
      if (gatewaySetting?.setting_value) {
        setPaymentGateways(gatewaySetting.setting_value as unknown as PaymentGatewaySettings);
      }
      const socialSetting = settings.find(s => s.setting_key === "social_media");
      if (socialSetting?.setting_value) {
        setSocialMedia(socialSetting.setting_value as unknown as SocialMediaSettings);
      }
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      // Try update first
      const { data: updateData, error: updateError } = await supabase
        .from("owner_settings")
        .update({ setting_value: value as any })
        .eq("setting_key", key)
        .select();
      
      // If no rows updated, insert new row
      if (!updateError && (!updateData || updateData.length === 0)) {
        const { error: insertError } = await supabase
          .from("owner_settings")
          .insert({ setting_key: key, setting_value: value as any });
        
        if (insertError) throw insertError;
      } else if (updateError) {
        throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-settings"] });
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully",
      });
    },
    onError: () => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ أثناء الحفظ" : "An error occurred while saving",
        variant: "destructive",
      });
    },
  });

  const saveBankAccount = () => {
    updateSettingMutation.mutate({ key: "bank_account", value: bankAccount });
  };

  const savePaymentSettings = () => {
    updateSettingMutation.mutate({ key: "payment_settings", value: paymentSettings });
  };

  const saveContactInfo = () => {
    updateSettingMutation.mutate({ key: "contact_info", value: contactInfo });
  };

  const saveResendApi = () => {
    updateSettingMutation.mutate({ key: "resend_api_key", value: resendApi });
  };

  const saveSocialMedia = () => {
    updateSettingMutation.mutate({ key: "social_media", value: socialMedia });
  };

  const addSocialLink = () => {
    setSocialMedia(prev => ({
      links: [...prev.links, { id: crypto.randomUUID(), platform: 'other', url: '', is_visible: true }],
    }));
  };

  const removeSocialLink = (id: string) => {
    setSocialMedia(prev => ({
      links: prev.links.filter(l => l.id !== id),
    }));
  };

  const updateSocialLink = (id: string, field: keyof SocialMediaLink, value: string | boolean) => {
    setSocialMedia(prev => ({
      links: prev.links.map(l => l.id === id ? { ...l, [field]: value } : l),
    }));
  };

  const savePaymentGateways = () => {
    updateSettingMutation.mutate({ key: "payment_gateways", value: paymentGateways });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">
            {isRTL ? "الإعدادات" : "Settings"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إعدادات النظام العامة" : "General system settings"}
          </p>
        </div>
      </div>

      {/* Contact Info Settings */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {isRTL ? "بيانات التواصل" : "Contact Information"}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "بيانات التواصل التي تظهر في صفحة الهبوط" 
              : "Contact information displayed on the landing page"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 flex-1">
              <Phone className={`h-5 w-5 ${contactInfo.show_phone ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className="font-medium mb-2">
                  {isRTL ? "رقم الهاتف" : "Phone Number"}
                </p>
                <Input
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+966 50 123 4567"
                  dir="ltr"
                  className="max-w-xs"
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{isRTL ? "إظهار" : "Show"}</span>
              <Switch
                checked={contactInfo.show_phone}
                onCheckedChange={(checked) => 
                  setContactInfo(prev => ({ ...prev, show_phone: checked }))
                }
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 flex-1">
              <Mail className={`h-5 w-5 ${contactInfo.show_email ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className="font-medium mb-2">
                  {isRTL ? "البريد الإلكتروني" : "Email Address"}
                </p>
                <Input
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="support@costamine.com"
                  dir="ltr"
                  type="email"
                  className="max-w-xs"
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{isRTL ? "إظهار" : "Show"}</span>
              <Switch
                checked={contactInfo.show_email}
                onCheckedChange={(checked) => 
                  setContactInfo(prev => ({ ...prev, show_email: checked }))
                }
              />
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 flex-1">
              <MapPin className={`h-5 w-5 ${contactInfo.show_location ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className="font-medium mb-2">
                  {isRTL ? "الموقع" : "Location"}
                </p>
                <div className="grid md:grid-cols-2 gap-2 max-w-md">
                  <Input
                    value={contactInfo.location_ar}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, location_ar: e.target.value }))}
                    placeholder="الرياض، السعودية"
                    dir="rtl"
                  />
                  <Input
                    value={contactInfo.location_en}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, location_en: e.target.value }))}
                    placeholder="Riyadh, Saudi Arabia"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{isRTL ? "إظهار" : "Show"}</span>
              <Switch
                checked={contactInfo.show_location}
                onCheckedChange={(checked) => 
                  setContactInfo(prev => ({ ...prev, show_location: checked }))
                }
              />
            </div>
          </div>

          <Button
            onClick={saveContactInfo}
            disabled={updateSettingMutation.isPending}
            className="gradient-primary text-white"
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {isRTL ? "حفظ بيانات التواصل" : "Save Contact Info"}
          </Button>
        </CardContent>
      </Card>

      {/* Bank Account Settings */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isRTL ? "بيانات الحساب البنكي" : "Bank Account Details"}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "بيانات الحساب البنكي التي تظهر للعملاء عند التحويل البنكي" 
              : "Bank account details shown to customers for bank transfers"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {bankAccount.is_visible ? (
                <Eye className="h-5 w-5 text-accent" />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {isRTL ? "عرض بيانات الحساب" : "Show Account Details"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRTL 
                    ? "إظهار بيانات الحساب البنكي للعملاء" 
                    : "Display bank account info to customers"}
                </p>
              </div>
            </div>
            <Switch
              checked={bankAccount.is_visible}
              onCheckedChange={(checked) => 
                setBankAccount(prev => ({ ...prev, is_visible: checked }))
              }
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "اسم البنك (عربي)" : "Bank Name (Arabic)"}</Label>
              <Input
                value={bankAccount.bank_name}
                onChange={(e) => setBankAccount(prev => ({ ...prev, bank_name: e.target.value }))}
                placeholder={isRTL ? "مثال: بنك الراجحي" : "e.g. Al Rajhi Bank"}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "اسم البنك (إنجليزي)" : "Bank Name (English)"}</Label>
              <Input
                value={bankAccount.bank_name_en}
                onChange={(e) => setBankAccount(prev => ({ ...prev, bank_name_en: e.target.value }))}
                placeholder="e.g. Al Rajhi Bank"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isRTL ? "اسم صاحب الحساب" : "Account Holder Name"}</Label>
            <Input
              value={bankAccount.account_name}
              onChange={(e) => setBankAccount(prev => ({ ...prev, account_name: e.target.value }))}
              placeholder={isRTL ? "اسم صاحب الحساب كما في البنك" : "Account holder name as in bank"}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "رقم الحساب" : "Account Number"}</Label>
              <Input
                value={bankAccount.account_number}
                onChange={(e) => setBankAccount(prev => ({ ...prev, account_number: e.target.value }))}
                placeholder="1234567890"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "رقم الآيبان (IBAN)" : "IBAN Number"}</Label>
              <Input
                value={bankAccount.iban}
                onChange={(e) => setBankAccount(prev => ({ ...prev, iban: e.target.value }))}
                placeholder="SA..."
                dir="ltr"
              />
            </div>
          </div>

          <Button
            onClick={saveBankAccount}
            disabled={updateSettingMutation.isPending}
            className="gradient-primary text-white"
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {isRTL ? "حفظ بيانات البنك" : "Save Bank Details"}
          </Button>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {isRTL ? "إعدادات الدفع" : "Payment Settings"}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "إعدادات طرق الدفع وتعليمات التحويل" 
              : "Payment methods and transfer instructions settings"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show Bank Transfer Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">
                {isRTL ? "تفعيل التحويل البنكي" : "Enable Bank Transfer"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRTL 
                  ? "السماح للعملاء بالدفع عبر التحويل البنكي" 
                  : "Allow customers to pay via bank transfer"}
              </p>
            </div>
            <Switch
              checked={paymentSettings.show_bank_transfer}
              onCheckedChange={(checked) => 
                setPaymentSettings(prev => ({ ...prev, show_bank_transfer: checked }))
              }
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "تعليمات التحويل (عربي)" : "Transfer Instructions (Arabic)"}</Label>
              <Textarea
                value={paymentSettings.transfer_instructions_ar}
                onChange={(e) => setPaymentSettings(prev => ({ 
                  ...prev, 
                  transfer_instructions_ar: e.target.value 
                }))}
                placeholder={isRTL ? "أدخل تعليمات التحويل" : "Enter transfer instructions"}
                dir="rtl"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "تعليمات التحويل (إنجليزي)" : "Transfer Instructions (English)"}</Label>
              <Textarea
                value={paymentSettings.transfer_instructions_en}
                onChange={(e) => setPaymentSettings(prev => ({ 
                  ...prev, 
                  transfer_instructions_en: e.target.value 
                }))}
                placeholder="Enter transfer instructions"
                dir="ltr"
                rows={3}
              />
            </div>
          </div>

          <Button
            onClick={savePaymentSettings}
            disabled={updateSettingMutation.isPending}
            className="gradient-primary text-white"
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {isRTL ? "حفظ إعدادات الدفع" : "Save Payment Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Resend API Key */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {isRTL ? "مفتاح Resend API" : "Resend API Key"}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "مفتاح API لخدمة إرسال البريد الإلكتروني (Resend) - يُستخدم لإرسال دعوات الفريق" 
              : "API key for Resend email service - used for sending team invitations"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{isRTL ? "مفتاح API" : "API Key"}</Label>
            <Input
              value={resendApi.api_key}
              onChange={(e) => setResendApi(prev => ({ ...prev, api_key: e.target.value }))}
              placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxx"
              dir="ltr"
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              {isRTL 
                ? "احصل على المفتاح من resend.com/api-keys" 
                : "Get your key from resend.com/api-keys"}
            </p>
          </div>

          <Button
            onClick={saveResendApi}
            disabled={updateSettingMutation.isPending}
            className="gradient-primary text-white"
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {isRTL ? "حفظ مفتاح API" : "Save API Key"}
          </Button>
        </CardContent>
      </Card>

      {/* Payment Gateways Settings */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {isRTL ? "بوابات الدفع الإلكتروني" : "Payment Gateways"}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "إعدادات ربط بوابات الدفع الإلكتروني (تابي وتمارا)" 
              : "Configure electronic payment gateways (Tabby & Tamara)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tabby Section */}
          <div className="space-y-4 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3CFFD0]/10 flex items-center justify-center">
                  <span className="font-bold text-sm" style={{ color: '#3CFFD0' }}>T</span>
                </div>
                <div>
                  <p className="font-semibold">{isRTL ? "تابي (Tabby)" : "Tabby"}</p>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "الدفع على أقساط" : "Buy now, pay later"}
                  </p>
                </div>
              </div>
              <Switch
                checked={paymentGateways.tabby_enabled}
                onCheckedChange={(checked) => 
                  setPaymentGateways(prev => ({ ...prev, tabby_enabled: checked }))
                }
              />
            </div>

            {paymentGateways.tabby_enabled && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>{isRTL ? "البيئة" : "Environment"}</Label>
                  <Select
                    value={paymentGateways.tabby_environment}
                    onValueChange={(val: 'sandbox' | 'production') => 
                      setPaymentGateways(prev => ({ ...prev, tabby_environment: val }))
                    }
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">{isRTL ? "تجريبية (Sandbox)" : "Sandbox"}</SelectItem>
                      <SelectItem value="production">{isRTL ? "إنتاجية (Production)" : "Production"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Public Key</Label>
                    <Input
                      value={paymentGateways.tabby_public_key}
                      onChange={(e) => setPaymentGateways(prev => ({ ...prev, tabby_public_key: e.target.value }))}
                      placeholder="pk_xxxxxxxx"
                      dir="ltr"
                      type="password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secret Key</Label>
                    <Input
                      value={paymentGateways.tabby_secret_key}
                      onChange={(e) => setPaymentGateways(prev => ({ ...prev, tabby_secret_key: e.target.value }))}
                      placeholder="sk_xxxxxxxx"
                      dir="ltr"
                      type="password"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tamara Section */}
          <div className="space-y-4 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
                  <span className="font-bold text-sm" style={{ color: '#FF6B35' }}>T</span>
                </div>
                <div>
                  <p className="font-semibold">{isRTL ? "تمارا (Tamara)" : "Tamara"}</p>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "الدفع لاحقاً" : "Buy now, pay later"}
                  </p>
                </div>
              </div>
              <Switch
                checked={paymentGateways.tamara_enabled}
                onCheckedChange={(checked) => 
                  setPaymentGateways(prev => ({ ...prev, tamara_enabled: checked }))
                }
              />
            </div>

            {paymentGateways.tamara_enabled && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>{isRTL ? "البيئة" : "Environment"}</Label>
                  <Select
                    value={paymentGateways.tamara_environment}
                    onValueChange={(val: 'sandbox' | 'production') => 
                      setPaymentGateways(prev => ({ ...prev, tamara_environment: val }))
                    }
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">{isRTL ? "تجريبية (Sandbox)" : "Sandbox"}</SelectItem>
                      <SelectItem value="production">{isRTL ? "إنتاجية (Production)" : "Production"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>API Token</Label>
                    <Input
                      value={paymentGateways.tamara_api_token}
                      onChange={(e) => setPaymentGateways(prev => ({ ...prev, tamara_api_token: e.target.value }))}
                      placeholder="token_xxxxxxxx"
                      dir="ltr"
                      type="password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notification Token</Label>
                    <Input
                      value={paymentGateways.tamara_notification_token}
                      onChange={(e) => setPaymentGateways(prev => ({ ...prev, tamara_notification_token: e.target.value }))}
                      placeholder="notif_xxxxxxxx"
                      dir="ltr"
                      type="password"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={savePaymentGateways}
            disabled={updateSettingMutation.isPending}
            className="gradient-primary text-white"
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {isRTL ? "حفظ إعدادات بوابات الدفع" : "Save Payment Gateways"}
          </Button>
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {isRTL ? "روابط التواصل الاجتماعي" : "Social Media Links"}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "إدارة روابط التواصل الاجتماعي التي تظهر في أسفل صفحة الهبوط" 
              : "Manage social media links displayed in the landing page footer"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {socialMedia.links.map((link) => {
            const platformInfo = PRESET_PLATFORMS.find(p => p.value === link.platform);
            return (
              <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm">{platformInfo?.icon || '🔗'}</span>
                </div>
                <div className="flex-1 grid sm:grid-cols-[140px_1fr] gap-2">
                  <Select
                    value={link.platform}
                    onValueChange={(val) => updateSocialLink(link.id, 'platform', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_PLATFORMS.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.icon} {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={link.url}
                    onChange={(e) => updateSocialLink(link.id, 'url', e.target.value)}
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
                <Switch
                  checked={link.is_visible}
                  onCheckedChange={(checked) => updateSocialLink(link.id, 'is_visible', checked)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSocialLink(link.id)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <Button variant="outline" onClick={addSocialLink} className="w-full">
            <Plus className="h-4 w-4 me-2" />
            {isRTL ? "إضافة رابط جديد" : "Add New Link"}
          </Button>

          <Button
            onClick={saveSocialMedia}
            disabled={updateSettingMutation.isPending}
            className="gradient-primary text-white"
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {isRTL ? "حفظ روابط التواصل" : "Save Social Links"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerSettings;
