import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Skeleton } from "@/components/ui/skeleton";

interface Plan {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  max_invoices: number | null;
  max_entries: number | null;
  max_users: number | null;
  max_branches: number | null;
  is_active: boolean;
  sort_order: number | null;
  features_ar?: string[] | null;
  features_en?: string[] | null;
  not_included_ar?: string[] | null;
  not_included_en?: string[] | null;
}

// Default features for plans if not stored in DB
const defaultPlanFeatures: Record<string, { features_ar: string[]; features_en: string[]; not_included_ar: string[]; not_included_en: string[] }> = {
  "Free": {
    features_ar: ["15 فاتورة شهرياً", "15 قيد محاسبي", "مستخدم واحد", "فرع واحد", "الدعم الفني"],
    features_en: ["15 invoices/month", "15 journal entries", "1 user", "1 branch", "Technical support"],
    not_included_ar: ["الموارد البشرية", "تعدد الفروع"],
    not_included_en: ["HR module", "Multi-branch"],
  },
  "Basic": {
    features_ar: ["50 فاتورة شهرياً", "100 قيد محاسبي", "مستخدم واحد", "فرع واحد", "الدعم الفني", "التقارير المالية"],
    features_en: ["50 invoices/month", "100 journal entries", "1 user", "1 branch", "Technical support", "Financial reports"],
    not_included_ar: ["الموارد البشرية", "تعدد الفروع"],
    not_included_en: ["HR module", "Multi-branch"],
  },
  "Advanced": {
    features_ar: ["75 فاتورة شهرياً", "150 قيد محاسبي", "3 مستخدمين", "فرعين", "الدعم الفني", "التقارير المالية", "إدارة المخزون"],
    features_en: ["75 invoices/month", "150 journal entries", "3 users", "2 branches", "Technical support", "Financial reports", "Inventory management"],
    not_included_ar: ["الموارد البشرية"],
    not_included_en: ["HR module"],
  },
  "Enterprise": {
    features_ar: ["فواتير غير محدودة", "قيود غير محدودة", "مستخدمين غير محدود", "فروع غير محدودة", "الدعم الفني المتميز", "التقارير المالية", "إدارة المخزون", "الموارد البشرية", "API مخصص"],
    features_en: ["Unlimited invoices", "Unlimited entries", "Unlimited users", "Unlimited branches", "Premium support", "Financial reports", "Inventory management", "HR module", "Custom API"],
    not_included_ar: [],
    not_included_en: [],
  },
};

export const Pricing = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (error) throw error;
      return data as Plan[];
    },
  });

  const getPlanFeatures = (plan: Plan) => {
    // Use DB features if available, otherwise fall back to defaults
    const defaultFeatures = defaultPlanFeatures[plan.name_en] || defaultPlanFeatures["Basic"];
    
    return {
      features: isRTL 
        ? (plan.features_ar?.length ? plan.features_ar : defaultFeatures.features_ar)
        : (plan.features_en?.length ? plan.features_en : defaultFeatures.features_en),
      notIncluded: isRTL
        ? (plan.not_included_ar?.length !== undefined ? plan.not_included_ar : defaultFeatures.not_included_ar)
        : (plan.not_included_en?.length !== undefined ? plan.not_included_en : defaultFeatures.not_included_en),
    };
  };

  const isPopular = (index: number) => index === 1;
  const isEnterprise = (plan: Plan) => plan.name_en === "Enterprise";

  if (isLoading) {
    return (
      <section id="pricing" className="section-padding bg-background relative">
        <div className="container-custom relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              {t("landing.pricing.title")} <span className="gradient-text">{t("landing.pricing.titleHighlight")}</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("landing.pricing.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[400px] rounded-3xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="section-padding bg-background relative">
      {/* Background Decoration */}
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] blob-primary rounded-full blur-3xl opacity-20 pointer-events-none -translate-y-1/2" />

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            {t("landing.pricing.title")} <span className="gradient-text">{t("landing.pricing.titleHighlight")}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("landing.pricing.subtitle")}
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {plans?.map((plan, index) => {
            const { features, notIncluded } = getPlanFeatures(plan);
            const popular = isPopular(index);
            const enterprise = isEnterprise(plan);

            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-2xl sm:rounded-3xl p-4 sm:p-6 card-hover relative",
                  popular
                    ? "bg-gradient-to-b from-primary/10 to-primary/5 border-2 border-primary shadow-xl sm:scale-105"
                    : "glass-card"
                )}
              >
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full gradient-primary text-white text-sm font-medium shadow-lg">
                      {t("landing.pricing.popular")}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Plan Header */}
                  <div className="text-center pt-4">
                    <h3 className="text-xl font-bold mb-1">
                      {isRTL ? plan.name_ar : plan.name_en}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? plan.description_ar : plan.description_en}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-center">
                    {enterprise ? (
                      <span className="text-2xl font-bold gradient-text">{t("landing.pricing.plans.enterprise.price")}</span>
                    ) : plan.price > 0 ? (
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold gradient-text">{plan.price}</span>
                        <span className="text-muted-foreground">{t("landing.pricing.currency")}/{t("landing.pricing.period")}</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold gradient-text">{isRTL ? "مجاني" : "Free"}</span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {notIncluded.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-muted-foreground/40" />
                        </div>
                        <span className="text-sm text-muted-foreground/50 line-through">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link to="/register-company" className="block">
                    <Button
                      className="w-full rounded-xl h-12 gradient-primary text-white btn-primary-shadow"
                    >
                      {enterprise ? t("landing.pricing.contactUs") : t("landing.pricing.startNow")}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <p className="text-center text-muted-foreground mt-8">
          {t("landing.pricing.vatNote")}
        </p>
      </div>
    </section>
  );
};
