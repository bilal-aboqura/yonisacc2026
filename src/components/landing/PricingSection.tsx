import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { Check, Crown, Zap, Rocket, Building } from "lucide-react";

export const PricingSection = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const plans = [
    { 
      name: isRTL ? "مجاني" : "Free", 
      icon: Zap,
      price: 0, 
      invoices: 50, 
      entries: 100, 
      users: 1, 
      branches: 1, 
      hr: false,
      color: "border-muted"
    },
    { 
      name: isRTL ? "أساسي" : "Basic", 
      icon: Rocket,
      price: 199, 
      invoices: 500, 
      entries: 1000, 
      users: 3, 
      branches: 2, 
      hr: false,
      color: "border-blue-500"
    },
    { 
      name: isRTL ? "متقدم" : "Advanced", 
      icon: Crown,
      price: 399, 
      invoices: 2000, 
      entries: 5000, 
      users: 10, 
      branches: 5, 
      hr: true, 
      popular: true,
      color: "border-primary"
    },
    { 
      name: isRTL ? "مؤسسات" : "Enterprise", 
      icon: Building,
      price: 799, 
      invoices: null, 
      entries: null, 
      users: null, 
      branches: null, 
      hr: true,
      color: "border-accent"
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">{t("landing.pricing.title")}</h3>
          <p className="text-muted-foreground text-lg">{t("landing.pricing.subtitle")}</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative border-2 ${plan.color} ${plan.popular ? 'shadow-2xl scale-105 z-10' : 'hover:shadow-lg'} transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="gradient-primary text-white text-sm px-4 py-1.5 rounded-full font-medium shadow-lg flex items-center gap-1">
                    <Crown className="h-4 w-4" />
                    {t("landing.pricing.popular")}
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-2 pt-8">
                <div className={`w-14 h-14 mx-auto mb-4 rounded-xl ${plan.popular ? 'gradient-primary' : 'bg-muted'} flex items-center justify-center`}>
                  <plan.icon className={`h-7 w-7 ${plan.popular ? 'text-white' : 'text-foreground'}`} />
                </div>
                <h4 className="text-xl font-bold">{plan.name}</h4>
              </CardHeader>
              
              <CardContent className="pt-4">
                <div className="text-center mb-6">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm ms-1">
                    SAR/{t("landing.pricing.monthly")}
                  </span>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0" />
                    <span>{plan.invoices || t("landing.pricing.unlimited")} {t("landing.pricing.invoices")}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0" />
                    <span>{plan.entries || t("landing.pricing.unlimited")} {t("landing.pricing.entries")}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0" />
                    <span>{plan.users || t("landing.pricing.unlimited")} {t("landing.pricing.users")}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0" />
                    <span>{plan.branches || t("landing.pricing.unlimited")} {t("landing.pricing.branches")}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className={`h-4 w-4 shrink-0 ${plan.hr ? 'text-accent' : 'text-muted-foreground'}`} />
                    <span className={!plan.hr ? 'text-muted-foreground' : ''}>
                      {plan.hr ? t("landing.pricing.withHR") : t("landing.pricing.noHR")}
                    </span>
                  </li>
                </ul>
                
                <Button 
                  className={`w-full ${plan.popular ? 'gradient-primary text-white shadow-lg' : ''}`} 
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                >
                  {t("landing.pricing.choosePlan")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
