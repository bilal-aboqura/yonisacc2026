import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Check, Loader2, BookOpen, Users, Truck, Wrench, ShoppingCart, BarChart3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const MODULES = [
  {
    id: "accounting",
    labelAr: "المحاسبة المالية",
    labelEn: "Financial Accounting",
    descAr: "دليل الحسابات، القيود، التقارير المالية",
    descEn: "Chart of accounts, journal entries, financial reports",
    icon: BookOpen,
    required: true,
  },
  {
    id: "sales",
    labelAr: "المبيعات والفواتير",
    labelEn: "Sales & Invoicing",
    descAr: "فواتير البيع، العروض، العملاء",
    descEn: "Sales invoices, quotes, customers",
    icon: ShoppingCart,
    required: false,
  },
  {
    id: "purchases",
    labelAr: "المشتريات",
    labelEn: "Purchases",
    descAr: "فواتير الشراء، أوامر الشراء، الموردين",
    descEn: "Purchase invoices, purchase orders, vendors",
    icon: Truck,
    required: false,
  },
  {
    id: "inventory",
    labelAr: "المخزون",
    labelEn: "Inventory",
    descAr: "إدارة المنتجات والمستودعات وحركة المخزون",
    descEn: "Products, warehouses, stock movements",
    icon: BarChart3,
    required: false,
  },
  {
    id: "hr",
    labelAr: "الموارد البشرية",
    labelEn: "Human Resources",
    descAr: "الموظفون، الرواتب، الإجازات، الحضور",
    descEn: "Employees, payroll, leaves, attendance",
    icon: Users,
    required: false,
  },
  {
    id: "autoparts",
    labelAr: "قطع غيار السيارات",
    labelEn: "Auto Parts",
    descAr: "كتالوج القطع، ماركات السيارات، التوافق",
    descEn: "Parts catalog, car brands, compatibility",
    icon: Wrench,
    required: false,
  },
];

interface Props {
  isRTL: boolean;
}

export const Step4Modules = ({ isRTL }: Props) => {
  const { data, update, goBack } = useOnboarding();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleModule = (id: string) => {
    const mod = MODULES.find((m) => m.id === id);
    if (mod?.required) return; // cannot deselect required modules
    const current = data.selected_modules;
    const next = current.includes(id)
      ? current.filter((m) => m !== id)
      : [...current, id];
    update({ selected_modules: next });
  };

  const isSelected = (id: string) =>
    id === "accounting" || data.selected_modules.includes(id);

  const handleFinish = async () => {
    if (!user) {
      toast.error(isRTL ? "يرجى تسجيل الدخول أولاً" : "Please sign in first");
      return;
    }

    if (isSubmitting) return; // prevent double submit
    setIsSubmitting(true);

    try {
      const payload = {
        // Account
        full_name: data.full_name.trim(),
        // Company
        name: data.company_name.trim(),
        name_en: data.company_name_en.trim() || null,
        email: data.email.trim(),
        phone: data.phone.trim(),
        commercial_register: data.commercial_register.trim() || null,
        tax_number: data.tax_number.trim() || null,
        address: data.address.trim() || null,
        // Preferences
        industry: data.industry || null,
        country: data.country,
        timezone: data.timezone,
        language: data.language,
        base_currency: data.base_currency,
        // Modules (always include accounting)
        modules: ["accounting", ...data.selected_modules.filter((m) => m !== "accounting")],
      };

      const { data: result, error } = await supabase.functions.invoke("provision-tenant", {
        body: payload,
      });

      if (error) {
        throw new Error(error.message || (isRTL ? "حدث خطأ في إنشاء الشركة" : "Error creating company"));
      }

      if (!result?.company_id) {
        throw new Error(isRTL ? "لم يتم إرجاع معرف الشركة" : "No company ID returned");
      }

      localStorage.setItem("activeCompany", result.company_id);
      toast.success(isRTL ? "تم إنشاء الشركة بنجاح! مرحباً بك 🎉" : "Company created successfully! Welcome 🎉");
      navigate("/client/dashboard");
    } catch (err: any) {
      console.error("Onboarding submission error:", err);
      toast.error(err.message || (isRTL ? "حدث خطأ غير متوقع" : "Unexpected error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          {isRTL ? "اختيار الوحدات" : "Select Modules"}
        </CardTitle>
        <CardDescription>
          {isRTL
            ? "اختر الوحدات التي تريد تفعيلها في نظامك. يمكن تغيير هذا لاحقاً."
            : "Choose which modules to activate. You can change this later."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
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
                  "relative flex items-start gap-3 p-4 rounded-lg border-2 text-start transition-all duration-200",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/40",
                  mod.required && "opacity-90 cursor-default"
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">
                      {isRTL ? mod.labelAr : mod.labelEn}
                    </span>
                    {mod.required && (
                      <Badge variant="secondary" className="text-xs">
                        {isRTL ? "أساسي" : "Required"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isRTL ? mod.descAr : mod.descEn}
                  </p>
                </div>
                {selected && (
                  <div className="absolute top-2 end-2">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
          <p className="font-medium text-foreground">
            {isRTL ? "ملخص التسجيل" : "Registration Summary"}
          </p>
          <div className="text-muted-foreground space-y-1">
            <p>🏢 {data.company_name || "—"}</p>
            <p>📧 {data.email || "—"}</p>
            <p>💰 {data.base_currency} • 🌐 {data.country} • ⏰ {data.timezone}</p>
            <p>
              {isRTL ? "الوحدات: " : "Modules: "}
              {["accounting", ...data.selected_modules.filter((m) => m !== "accounting")]
                .map((id) => {
                  const m = MODULES.find((x) => x.id === id);
                  return m ? (isRTL ? m.labelAr : m.labelEn) : id;
                })
                .join(" • ")}
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={goBack} disabled={isSubmitting}>
            {isRTL ? "السابق" : "Back"}
          </Button>
          <Button onClick={handleFinish} disabled={isSubmitting} size="lg" className="min-w-[160px]">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isRTL ? "جاري الإنشاء..." : "Creating..."}
              </>
            ) : (
              isRTL ? "إنشاء الشركة 🚀" : "Create Company 🚀"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
