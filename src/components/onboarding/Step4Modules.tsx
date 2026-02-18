import { useState } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Layers, Check, Loader2,
  BookOpen, Users, Truck, Wrench,
  ShoppingCart, Package, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const MODULES = [
  {
    id: "accounting",
    labelAr: "المحاسبة المالية",
    labelEn: "Financial Accounting",
    descAr: "دليل الحسابات • القيود اليومية • التقارير",
    descEn: "Chart of accounts • Journal entries • Reports",
    icon: BookOpen,
    color: "bg-primary/10 text-primary border-primary/20",
    activeColor: "bg-primary text-primary-foreground",
    required: true,
  },
  {
    id: "sales",
    labelAr: "المبيعات",
    labelEn: "Sales",
    descAr: "فواتير البيع • العروض • العملاء",
    descEn: "Invoices • Quotes • Customers",
    icon: ShoppingCart,
    color: "bg-accent/10 text-accent-foreground border-accent/20",
    activeColor: "bg-accent text-accent-foreground",
    required: false,
  },
  {
    id: "purchases",
    labelAr: "المشتريات",
    labelEn: "Purchases",
    descAr: "فواتير الشراء • أوامر الشراء • الموردون",
    descEn: "Invoices • Purchase orders • Vendors",
    icon: Truck,
    color: "bg-info/10 text-info border-info/20",
    activeColor: "bg-info text-info-foreground",
    required: false,
  },
  {
    id: "inventory",
    labelAr: "المخزون",
    labelEn: "Inventory",
    descAr: "المنتجات • المستودعات • حركة المخزون",
    descEn: "Products • Warehouses • Stock movements",
    icon: Package,
    color: "bg-success/10 text-success border-success/20",
    activeColor: "bg-success text-success-foreground",
    required: false,
  },
  {
    id: "hr",
    labelAr: "الموارد البشرية",
    labelEn: "Human Resources",
    descAr: "الموظفون • الرواتب • الإجازات • الحضور",
    descEn: "Employees • Payroll • Leaves • Attendance",
    icon: Users,
    color: "bg-warning/10 text-warning-foreground border-warning/20",
    activeColor: "bg-warning text-warning-foreground",
    required: false,
  },
  {
    id: "autoparts",
    labelAr: "قطع غيار السيارات",
    labelEn: "Auto Parts",
    descAr: "كتالوج القطع • الماركات • التوافق",
    descEn: "Parts catalog • Car brands • Compatibility",
    icon: Wrench,
    color: "bg-muted text-muted-foreground border-border",
    activeColor: "bg-foreground text-background",
    required: false,
  },
];

interface Props {
  isRTL: boolean;
}

export const Step4Modules = ({ isRTL }: Props) => {
  const { data, update, goBack } = useOnboarding();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSelected = (id: string) => id === "accounting" || data.selected_modules.includes(id);

  const toggleModule = (id: string) => {
    const mod = MODULES.find((m) => m.id === id);
    if (mod?.required) return;
    const current = data.selected_modules;
    const next = current.includes(id)
      ? current.filter((m) => m !== id)
      : [...current, id];
    update({ selected_modules: next });
  };

  const selectedCount = 1 + data.selected_modules.length;

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Step 1: Create the auth account first
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: data.full_name },
        },
      });

      if (signUpError) {
        let msg = isRTL ? "حدث خطأ أثناء إنشاء الحساب" : "Failed to create account";
        if (signUpError.message.includes("already registered")) {
          msg = isRTL ? "هذا البريد الإلكتروني مسجل مسبقاً" : "This email is already registered";
        }
        throw new Error(msg);
      }

      if (!signUpData.session) {
        // Auto-confirm is off — account created but not signed in yet.
        // We still try to sign in to get a session for provisioning.
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (signInError || !signInData.session) {
          // Account created but email confirmation required
          toast.success(isRTL ? "تم إنشاء حسابك! تحقق من بريدك الإلكتروني لتفعيل الحساب" : "Account created! Check your email to verify.");
          navigate("/auth");
          return;
        }
      }

      // Step 2: Provision the company
      const payload = {
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
        modules: ["accounting", ...data.selected_modules.filter((m) => m !== "accounting")],
      };

      const { data: result, error } = await supabase.functions.invoke("provision-tenant", {
        body: payload,
      });

      if (error) {
        // Parse structured errors from edge function
        let msg = error.message || (isRTL ? "حدث خطأ في إنشاء الشركة" : "Failed to create company");
        try {
          const parsed = JSON.parse(error.message);
          if (parsed?.code === 'PHONE_ALREADY_EXISTS') {
            msg = isRTL ? "رقم الجوال مستخدم بالفعل" : "This phone number is already registered";
          } else if (parsed?.error) {
            msg = isRTL ? parsed.error : (parsed.error_en || parsed.error);
          }
        } catch { /* not JSON, use raw message */ }
        throw new Error(msg);
      }

      // Also handle 409 from result body
      if (result?.code === 'PHONE_ALREADY_EXISTS') {
        throw new Error(isRTL ? "رقم الجوال مستخدم بالفعل" : "This phone number is already registered");
      }

      if (!result?.company_id) throw new Error(isRTL ? "لم يتم إرجاع معرف الشركة" : "Company ID not returned");

      localStorage.setItem("activeCompany", result.company_id);
      toast.success(isRTL ? "تم إنشاء حسابك وشركتك بنجاح! أهلاً بك 🎉" : "Account & company created! Welcome 🎉");
      navigate("/client/dashboard");
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success/10 via-success/5 to-transparent border border-success/20 p-6 sm:p-8">
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-success/10 rounded-full translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
            <Layers className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {isRTL ? "اختر وحدات نظامك" : "Choose Your Modules"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? `${selectedCount} وحدات محددة — يمكنك التغيير لاحقاً من الإعدادات`
                : `${selectedCount} modules selected — you can change this later`}
            </p>
          </div>
        </div>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULES.map((mod) => {
          const selected = isSelected(mod.id);
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => toggleModule(mod.id)}
              disabled={mod.required}
              className={cn(
                "relative group flex items-start gap-3 p-4 rounded-xl border-2 text-start transition-all duration-200",
                selected
                  ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
                mod.required && "cursor-default"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                  selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">
                    {isRTL ? mod.labelAr : mod.labelEn}
                  </span>
                  {mod.required && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                      {isRTL ? "أساسي" : "Required"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {isRTL ? mod.descAr : mod.descEn}
                </p>
              </div>

              {/* Check badge */}
              <div
                className={cn(
                  "absolute top-3 end-3 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200",
                  selected
                    ? "bg-primary opacity-100 scale-100"
                    : "bg-border opacity-0 scale-75 group-hover:opacity-60 group-hover:scale-90"
                )}
              >
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary strip */}
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

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={goBack} disabled={isSubmitting} className="gap-2">
          <ArrowRight className={cn("h-4 w-4", !isRTL && "rotate-180")} />
          {isRTL ? "السابق" : "Back"}
        </Button>
        <Button
          onClick={handleFinish}
          disabled={isSubmitting}
          size="lg"
          className="gap-2 min-w-[180px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isRTL ? "جاري الإنشاء..." : "Creating..."}
            </>
          ) : (
            <>
              {isRTL ? "إنشاء الحساب والشركة 🚀" : "Create Account & Company 🚀"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
