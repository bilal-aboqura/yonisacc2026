import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const Pricing = () => {
  const { t } = useTranslation();

  const plans = [
    {
      key: "starter",
      popular: false,
    },
    {
      key: "business",
      popular: true,
    },
    {
      key: "retail",
      popular: false,
    },
    {
      key: "enterprise",
      popular: false,
    },
  ];

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
          {plans.map((plan, index) => {
            const planData = {
              name: t(`landing.pricing.plans.${plan.key}.name`),
              description: t(`landing.pricing.plans.${plan.key}.description`),
              price: t(`landing.pricing.plans.${plan.key}.price`),
              features: t(`landing.pricing.plans.${plan.key}.features`, { returnObjects: true }) as string[],
              notIncluded: t(`landing.pricing.plans.${plan.key}.notIncluded`, { returnObjects: true }) as string[],
            };
            const hasPrice = plan.key !== "enterprise";

            return (
              <div
                key={index}
                className={cn(
                  "rounded-3xl p-6 card-hover relative",
                  plan.popular
                    ? "bg-gradient-to-b from-primary/10 to-primary/5 border-2 border-primary shadow-xl"
                    : "glass-card"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full gradient-primary text-white text-sm font-medium shadow-lg">
                      {t("landing.pricing.popular")}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Plan Header */}
                  <div className="text-center pt-4">
                    <h3 className="text-xl font-bold mb-1">{planData.name}</h3>
                    <p className="text-sm text-muted-foreground">{planData.description}</p>
                  </div>

                  {/* Price */}
                  <div className="text-center">
                    {hasPrice ? (
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold gradient-text">{planData.price}</span>
                        <span className="text-muted-foreground">{t("landing.pricing.currency")}/{t("landing.pricing.period")}</span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold gradient-text">{planData.price}</span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {planData.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-green-500" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {planData.notIncluded.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 opacity-50">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs">-</span>
                        </div>
                        <span className="text-sm line-through">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link to="/register-company" className="block">
                    <Button
                      className={cn(
                        "w-full rounded-xl h-12",
                        plan.popular
                          ? "gradient-primary text-white btn-primary-shadow"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {hasPrice ? t("landing.pricing.startNow") : t("landing.pricing.contactUs")}
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
