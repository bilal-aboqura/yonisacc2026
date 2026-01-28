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
import { Settings, Building2, Eye, EyeOff, Save, Loader2 } from "lucide-react";

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
      
      if (bankSetting?.setting_value) {
        setBankAccount(bankSetting.setting_value as unknown as BankAccountSettings);
      }
      if (paymentSetting?.setting_value) {
        setPaymentSettings(paymentSetting.setting_value as unknown as PaymentSettings);
      }
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from("owner_settings")
        .update({ setting_value: value as any })
        .eq("setting_key", key);
      
      if (error) throw error;
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
    </div>
  );
};

export default OwnerSettings;
