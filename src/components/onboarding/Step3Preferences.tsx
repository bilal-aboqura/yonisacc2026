import { useState } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Settings, Globe, Clock, DollarSign, Languages, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CURRENCIES = [
  { code: "SAR", label: "🇸🇦 ريال سعودي", symbol: "ر.س" },
  { code: "AED", label: "🇦🇪 درهم إماراتي", symbol: "د.إ" },
  { code: "KWD", label: "🇰🇼 دينار كويتي", symbol: "د.ك" },
  { code: "BHD", label: "🇧🇭 دينار بحريني", symbol: "د.ب" },
  { code: "QAR", label: "🇶🇦 ريال قطري", symbol: "ر.ق" },
  { code: "OMR", label: "🇴🇲 ريال عماني", symbol: "ر.ع" },
  { code: "EGP", label: "🇪🇬 جنيه مصري", symbol: "ج.م" },
  { code: "USD", label: "🇺🇸 دولار أمريكي", symbol: "$" },
  { code: "EUR", label: "🇪🇺 يورو", symbol: "€" },
];

const TIMEZONES = [
  { value: "Asia/Riyadh", label: "🕒 الرياض (UTC+3)" },
  { value: "Asia/Dubai", label: "🕓 دبي (UTC+4)" },
  { value: "Asia/Kuwait", label: "🕒 الكويت (UTC+3)" },
  { value: "Asia/Bahrain", label: "🕒 البحرين (UTC+3)" },
  { value: "Asia/Qatar", label: "🕒 قطر (UTC+3)" },
  { value: "Africa/Cairo", label: "🕑 القاهرة (UTC+2/3)" },
  { value: "Europe/London", label: "🕐 لندن (UTC+0/1)" },
  { value: "America/New_York", label: "🕔 نيويورك (UTC-5/4)" },
];

const COUNTRIES = [
  { code: "SA", label: "🇸🇦 المملكة العربية السعودية" },
  { code: "AE", label: "🇦🇪 الإمارات العربية المتحدة" },
  { code: "KW", label: "🇰🇼 الكويت" },
  { code: "BH", label: "🇧🇭 البحرين" },
  { code: "QA", label: "🇶🇦 قطر" },
  { code: "OM", label: "🇴🇲 عُمان" },
  { code: "EG", label: "🇪🇬 مصر" },
  { code: "JO", label: "🇯🇴 الأردن" },
  { code: "LB", label: "🇱🇧 لبنان" },
  { code: "OTHER", label: "🌍 أخرى" },
];

interface Props {
  isRTL: boolean;
  isFinalStep?: boolean;
}

const PrefRow = ({ icon: Icon, label, children }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-primary/30 transition-colors">
    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
    </div>
    <div className="w-44 sm:w-52 flex-shrink-0">
      {children}
    </div>
  </div>
);

export const Step3Preferences = ({ isRTL, isFinalStep }: Props) => {
  const { data, update, goNext, goBack } = useOnboarding();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: verticals } = useQuery({
    queryKey: ["registration-verticals"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("business_verticals")
        .select("id, name_ar, name_en")
        .eq("is_active", true)
        .eq("status", "active")
        .order("sort_order");
      if (error) throw error;
      return (rows || []) as Array<{ id: string; name_ar: string; name_en: string }>;
    },
  });

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: data.full_name },
        },
      });

      if (signUpError) {
        const errMsg = signUpError.message?.toLowerCase() || "";
        let msg = isRTL ? "حدث خطأ أثناء إنشاء الحساب" : "Failed to create account";
        if (errMsg.includes("already registered") || errMsg.includes("already been registered") || signUpError.status === 422) {
          msg = isRTL ? "هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول أو استخدام بريد آخر." : "This email is already registered. Please sign in or use a different email.";
        } else if (errMsg.includes("password")) {
          msg = isRTL ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters";
        }
        throw new Error(msg);
      }

      // Supabase returns user with empty identities when email already exists (no error thrown)
      const identities = signUpData.user?.identities;
      if (!identities || identities.length === 0) {
        throw new Error(
          isRTL
            ? "هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول أو استخدام بريد آخر."
            : "This email is already registered. Please sign in or use a different email."
        );
      }

      if (!signUpData.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (signInError || !signInData.session) {
          throw new Error(isRTL ? "تم إنشاء الحساب بنجاح. يرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول." : "Account created. Please confirm your email then sign in.");
        }
      }

      const payload: Record<string, unknown> = {
        full_name: data.full_name.trim(),
        name: data.company_name.trim(),
        name_en: data.company_name_en.trim() || null,
        email: data.email.trim(),
        phone: data.phone.trim(),
        commercial_register: data.commercial_register.trim() || null,
        tax_number: data.tax_number.trim() || null,
        address: data.address.trim() || null,
        industry: data.industry || null,
        country: data.country,
        timezone: data.timezone,
        language: data.language,
        base_currency: data.base_currency,
        modules: [], // No module selection — all access controlled via RBAC
      };
      if (data.plan_id) {
        payload.plan_id = data.plan_id;
      }

      const response = await supabase.functions.invoke("provision-tenant", { body: payload });
      const result = response.data;
      const fnError = response.error;

      let errorBody: any = result && typeof result === "object" ? result : null;
      if ((!errorBody || !errorBody.error) && fnError && typeof (fnError as any).context?.json === "function") {
        try {
          errorBody = await (fnError as any).context.json();
        } catch {
          // no-op: keep fallback message below
        }
      }

      if (fnError || errorBody?.error) {
        const errorCode = errorBody?.code;

        if (errorCode === "PHONE_ALREADY_EXISTS") {
          await supabase.auth.signOut();
          toast.error(
            isRTL
              ? "رقم الجوال مستخدم بالفعل. سجّل الدخول بالحساب المرتبط بهذا الرقم أو استخدم رقمًا آخر."
              : "This phone number is already registered. Sign in with the existing account or use another number."
          );
          navigate("/auth");
          return;
        }

        const msg = errorBody?.error || fnError?.message || (isRTL ? "حدث خطأ في إنشاء الشركة" : "Failed to create company");
        throw new Error(msg);
      }

      if (!result?.company_id) throw new Error(isRTL ? "لم يتم إرجاع معرف الشركة" : "Company ID not returned");

      localStorage.setItem("activeCompany", result.company_id);
      // Sign out so the user logs in fresh with their new account
      await supabase.auth.signOut();
      toast.success(isRTL ? "تم إنشاء حسابك وشركتك بنجاح! سجّل دخولك الآن 🎉" : "Account & company created! Please sign in 🎉");
      navigate("/auth");
    } catch (err: any) {
      console.error("Onboarding error:", err);
      toast.error(err.message || (isRTL ? "حدث خطأ غير متوقع" : "Unexpected error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-info/10 via-info/5 to-transparent border border-info/20 p-6 sm:p-8">
        <div className="absolute top-0 left-0 w-28 h-28 bg-info/10 rounded-full -translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
            <Settings className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {isRTL ? "تفضيلات النظام" : "System Preferences"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? "اضبط الإعدادات الافتراضية — يمكن تغييرها لاحقاً من الإعدادات"
                : "Set your defaults — you can change these later in settings"}
            </p>
          </div>
        </div>
      </div>

      {/* Preferences list */}
      <div className="space-y-3">
        <PrefRow icon={Globe} label={isRTL ? "نوع النشاط التجاري" : "Industry"}>
          <Select
            value={data.industry || "__general__"}
            onValueChange={(v) => update({ industry: v === "__general__" ? "" : v })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={isRTL ? "اختر النشاط" : "Select"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__general__">{isRTL ? "🏪 تجارة عامة" : "🏪 General Trade"}</SelectItem>
              {verticals?.map((v) => (
                <SelectItem key={v.id} value={v.name_en}>
                  {isRTL ? v.name_ar : v.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PrefRow>

        <PrefRow icon={Globe} label={isRTL ? "الدولة" : "Country"}>
          <Select value={data.country} onValueChange={(v) => update({ country: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PrefRow>

        <PrefRow icon={Clock} label={isRTL ? "المنطقة الزمنية" : "Timezone"}>
          <Select value={data.timezone} onValueChange={(v) => update({ timezone: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PrefRow>

        <PrefRow icon={DollarSign} label={isRTL ? "العملة الأساسية" : "Base Currency"}>
          <Select value={data.base_currency} onValueChange={(v) => update({ base_currency: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PrefRow>

        <PrefRow icon={Languages} label={isRTL ? "لغة النظام" : "System Language"}>
          <Select value={data.language} onValueChange={(v) => update({ language: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">🇸🇦 العربية</SelectItem>
              <SelectItem value="en">🇺🇸 English</SelectItem>
            </SelectContent>
          </Select>
        </PrefRow>
      </div>

      {/* Summary strip (shown when final step) */}
      {isFinalStep && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            {isRTL ? "ملخص التسجيل" : "Registration Summary"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <span className="text-muted-foreground flex gap-2">
              <span>🏢</span>
              <span className="text-foreground font-medium truncate">{data.company_name || "—"}</span>
            </span>
            <span className="text-muted-foreground flex gap-2">
              <span>📧</span>
              <span className="text-foreground font-medium truncate">{data.email || "—"}</span>
            </span>
            <span className="text-muted-foreground flex gap-2">
              <span>💰</span>
              <span className="text-foreground font-medium">{data.base_currency}</span>
            </span>
            <span className="text-muted-foreground flex gap-2">
              <span>🌍</span>
              <span className="text-foreground font-medium">{data.country} • {data.timezone.split("/")[1]}</span>
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={goBack} disabled={isSubmitting} className="gap-2">
          <ArrowRight className={cn("h-4 w-4", !isRTL && "rotate-180")} />
          {isRTL ? "السابق" : "Back"}
        </Button>
        {isFinalStep ? (
          <Button onClick={handleFinish} disabled={isSubmitting} size="lg" className="gap-2 min-w-[180px]">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isRTL ? "جاري الإنشاء..." : "Creating..."}
              </>
            ) : (
              <>{isRTL ? "إنشاء الحساب والشركة 🚀" : "Create Account & Company 🚀"}</>
            )}
          </Button>
        ) : (
          <Button onClick={goNext} size="lg" className="gap-2 min-w-[160px]">
            {isRTL ? "التالي" : "Continue"}
            <ArrowLeft className={cn("h-4 w-4", !isRTL && "rotate-180")} />
          </Button>
        )}
      </div>
    </div>
  );
};
