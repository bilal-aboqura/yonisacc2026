import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Send, Building2, CreditCard, Hash, Landmark,
  Phone, Mail, MapPin, Loader2
} from "lucide-react";

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

// Validation schema
const contactSchema = z.object({
  name: z.string().trim().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }).max(100),
  email: z.string().trim().email({ message: "البريد الإلكتروني غير صالح" }).max(255),
  phone: z.string().optional(),
  message: z.string().trim().min(10, { message: "الرسالة يجب أن تكون 10 أحرف على الأقل" }).max(1000),
});

export const ContactSection = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch owner settings from database
  const { data: ownerSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["owner-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_settings")
        .select("*");
      
      if (error) throw error;
      
      const bankSetting = data?.find(s => s.setting_key === "bank_account");
      const paymentSetting = data?.find(s => s.setting_key === "payment_settings");
      
      return {
        bankAccount: bankSetting?.setting_value as unknown as BankAccountSettings | null,
        paymentSettings: paymentSetting?.setting_value as unknown as PaymentSettings | null,
      };
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("contact_messages")
        .insert([{
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone?.trim() || null,
          message: formData.message.trim(),
        }]);

      if (error) throw error;

      // Send notifications via edge function
      try {
        await supabase.functions.invoke("send-contact-notification", {
          body: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone?.trim() || "",
            message: formData.message.trim(),
          },
        });
      } catch (notifyError) {
        console.error("Notification error:", notifyError);
        // Don't fail the form submission if notifications fail
      }

      toast({
        title: isRTL ? "تم الإرسال" : "Sent",
        description: isRTL ? "تم إرسال رسالتك بنجاح، سنتواصل معك قريباً" : "Your message has been sent successfully",
      });

      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ، حاول مرة أخرى" : "An error occurred, please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get bank info from settings or use fallback
  const bankAccount = ownerSettings?.bankAccount;
  const paymentSettings = ownerSettings?.paymentSettings;
  
  const showBankInfo = bankAccount?.is_visible && paymentSettings?.show_bank_transfer;
  
  const bankInfo = {
    bankName: isRTL 
      ? (bankAccount?.bank_name || "البنك الأهلي السعودي") 
      : (bankAccount?.bank_name_en || "Saudi National Bank"),
    accountName: bankAccount?.account_name || (isRTL ? "شركة محاسبي للتقنية" : "Mohaseby Tech Co."),
    accountNumber: bankAccount?.account_number || "1234567890",
    iban: bankAccount?.iban || "SA0380000000608010167519"
  };

  const transferInstructions = isRTL 
    ? paymentSettings?.transfer_instructions_ar 
    : paymentSettings?.transfer_instructions_en;

  return (
    <section id="contact" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">{t("landing.contact.title")}</h3>
          <p className="text-muted-foreground text-lg">{t("landing.contact.subtitle")}</p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Contact Form */}
          <Card className="border-0 shadow-xl">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("landing.contact.name")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`h-12 ${errors.name ? "border-destructive" : ""}`}
                    disabled={isLoading}
                    placeholder={isRTL ? "أدخل اسمك" : "Enter your name"}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("landing.contact.email")} <span className="text-destructive">*</span></Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`h-12 ${errors.email ? "border-destructive" : ""}`}
                      disabled={isLoading}
                      placeholder={isRTL ? "أدخل بريدك الإلكتروني" : "Enter your email"}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("landing.contact.phone")}</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="h-12"
                      disabled={isLoading}
                      placeholder={isRTL ? "أدخل رقم جوالك" : "Enter your phone"}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">{t("landing.contact.message")} <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    className={`resize-none ${errors.message ? "border-destructive" : ""}`}
                    disabled={isLoading}
                    placeholder={isRTL ? "اكتب رسالتك هنا" : "Write your message here"}
                  />
                  {errors.message && (
                    <p className="text-sm text-destructive">{errors.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full gradient-primary text-white h-12"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="me-2 h-5 w-5" />
                      {t("landing.contact.send")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Bank Info */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-6 w-6 text-primary" />
                {t("landing.contact.bankInfo")}
              </CardTitle>
              {transferInstructions && (
                <p className="text-sm text-muted-foreground mt-2">{transferInstructions}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSettings ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-background/80">
                    <Building2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("landing.contact.bankName")}</p>
                      <p className="font-semibold">{bankInfo.bankName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-background/80">
                    <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("landing.contact.accountName")}</p>
                      <p className="font-semibold">{bankInfo.accountName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-background/80">
                    <Hash className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("landing.contact.accountNumber")}</p>
                      <p className="font-semibold font-mono">{bankInfo.accountNumber}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-background/80">
                    <Landmark className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("landing.contact.iban")}</p>
                      <p className="font-semibold font-mono text-sm">{bankInfo.iban}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t space-y-3">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-5 w-5" />
                  <span>+966 50 123 4567</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-5 w-5" />
                  <span>support@mohaseby.com</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                  <span>{isRTL ? "الرياض، المملكة العربية السعودية" : "Riyadh, Saudi Arabia"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};