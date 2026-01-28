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
}

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

  const getFeatures = (plan: Plan): string[] => {
    const features: string[] = [];
    
    if (plan.max_invoices) {
      features.push(isRTL 
        ? `${plan.max_invoices} فاتورة` 
        : `${plan.max_invoices} Invoices`);
    } else {
      features.push(isRTL ? "فواتير غير محدودة" : "Unlimited Invoices");
    }
    
    if (plan.max_entries) {
      features.push(isRTL 
        ? `${plan.max_entries} قيد محاسبي` 
        : `${plan.max_entries} Journal Entries`);
    } else {
      features.push(isRTL ? "قيود غير محدودة" : "Unlimited Entries");
    }
    
    if (plan.max_users) {
      features.push(isRTL 
        ? `${plan.max_users} مستخدم` 
        : `${plan.max_users} Users`);
    } else {
      features.push(isRTL ? "مستخدمين غير محدود" : "Unlimited Users");
    }
    
    if (plan.max_branches) {
      features.push(isRTL 
        ? `${plan.max_branches} فرع` 
        : `${plan.max_branches} Branches`);
    } else {
      features.push(isRTL ? "فروع غير محدودة" : "Unlimited Branches");
    }

    return features;
  };

  const isPopular = (index: number) => index === 1;
  const isEnterprise = (plan: Plan) => plan.price === 0 && !plan.max_invoices;

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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans?.map((plan, index) => {
            const features = getFeatures(plan);
            const popular = isPopular(index);
            const enterprise = isEnterprise(plan);
            const hasPrice = plan.price > 0 || !enterprise;

            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-3xl p-6 card-hover relative",
                  popular
                    ? "bg-gradient-to-b from-primary/10 to-primary/5 border-2 border-primary shadow-xl"
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
                    {hasPrice && !enterprise ? (
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold gradient-text">{plan.price}</span>
                        <span className="text-muted-foreground">{t("landing.pricing.currency")}/{t("landing.pricing.period")}</span>
                      </div>
                    ) : enterprise ? (
                      <span className="text-2xl font-bold gradient-text">{t("landing.pricing.plans.enterprise.price")}</span>
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
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-accent" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link to="/register-company" className="block">
                    <Button
                      className={cn(
                        "w-full rounded-xl h-12",
                        popular
                          ? "gradient-primary text-white btn-primary-shadow"
                          : "bg-muted hover:bg-muted/80"
                      )}
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
