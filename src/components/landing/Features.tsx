import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { 
  Calculator, Users, ShoppingCart, Package, Receipt, FileText, 
  Globe, Shield, Zap, Building2, UserCheck, BarChart3, CreditCard,
  Clock, Lock, Settings, TrendingUp
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator, Users, ShoppingCart, Package, Receipt, FileText,
  Globe, Shield, Zap, Building2, UserCheck, BarChart3, CreditCard,
  Clock, Lock, Settings, TrendingUp
};

interface Feature {
  id: string;
  icon: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  color: string;
  sort_order: number;
}

export const Features = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const { data: features, isLoading } = useQuery({
    queryKey: ["landing-features-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_features")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (error) throw error;
      return data as Feature[];
    },
  });

  const highlights = [
    {
      icon: Globe,
      title: t("landing.features.highlights.arabic.title"),
      description: t("landing.features.highlights.arabic.description"),
    },
    {
      icon: Shield,
      title: t("landing.features.highlights.secure.title"),
      description: t("landing.features.highlights.secure.description"),
    },
    {
      icon: Zap,
      title: t("landing.features.highlights.fast.title"),
      description: t("landing.features.highlights.fast.description"),
    },
  ];

  return (
    <section id="features" className="section-padding bg-background relative">
      {/* Background Decoration */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] blob-primary rounded-full blur-3xl opacity-30 pointer-events-none -translate-y-1/2" />

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            {t("landing.features.title")} <span className="gradient-text">{t("landing.features.titleHighlight")}</span>?
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("landing.features.subtitle")}
          </p>
        </div>

        {/* Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {highlights.map((item, index) => (
            <div
              key={index}
              className="glass-card rounded-2xl p-6 card-hover text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg">
                <item.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-6">
                <Skeleton className="w-12 h-12 rounded-xl mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-1" />
              </div>
            ))
          ) : (
            features?.map((feature) => {
              const IconComponent = iconMap[feature.icon] || FileText;
              return (
                <div
                  key={feature.id}
                  className="group glass-card rounded-2xl p-6 card-hover"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">
                    {isRTL ? feature.title_ar : feature.title_en}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {isRTL ? feature.description_ar : feature.description_en}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
