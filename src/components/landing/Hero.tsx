import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Play, Calculator, Users, ShoppingCart, Package, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Skeleton } from "@/components/ui/skeleton";

interface HeroData {
  id: string;
  title_ar: string;
  title_en: string;
  subtitle_ar: string;
  subtitle_en: string;
  badge_ar: string | null;
  badge_en: string | null;
  cta_text_ar: string;
  cta_text_en: string;
  demo_text_ar: string | null;
  demo_text_en: string | null;
  stat1_value: string | null;
  stat1_label_ar: string | null;
  stat1_label_en: string | null;
  stat2_value: string | null;
  stat2_label_ar: string | null;
  stat2_label_en: string | null;
  stat3_value: string | null;
  stat3_label_ar: string | null;
  stat3_label_en: string | null;
}

export const Hero = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const { data: heroData, isLoading } = useQuery({
    queryKey: ["landing-hero-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_hero")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data as HeroData | null;
    },
  });

  const featurePills = [
    { icon: Calculator, label: t("landing.features.pills.accounting") },
    { icon: Users, label: t("landing.features.pills.hr") },
    { icon: ShoppingCart, label: t("landing.features.pills.pos") },
    { icon: Package, label: t("landing.features.pills.inventory") },
  ];

  // Use dynamic data from database or fallback to translations
  const title = heroData 
    ? (isRTL ? heroData.title_ar : heroData.title_en)
    : t("landing.hero.title");
  
  const subtitle = heroData 
    ? (isRTL ? heroData.subtitle_ar : heroData.subtitle_en)
    : t("landing.hero.subtitle");
  
  const badge = heroData 
    ? (isRTL ? heroData.badge_ar : heroData.badge_en)
    : t("landing.hero.badge");
  
  const ctaText = heroData 
    ? (isRTL ? heroData.cta_text_ar : heroData.cta_text_en)
    : t("landing.hero.cta");
  
  const demoText = heroData 
    ? (isRTL ? heroData.demo_text_ar : heroData.demo_text_en)
    : t("landing.hero.demo");

  const stats = heroData ? [
    { 
      value: heroData.stat1_value || "+500", 
      label: isRTL ? heroData.stat1_label_ar : heroData.stat1_label_en 
    },
    { 
      value: heroData.stat2_value || "+10K", 
      label: isRTL ? heroData.stat2_label_ar : heroData.stat2_label_en 
    },
    { 
      value: heroData.stat3_value || "99.9%", 
      label: isRTL ? heroData.stat3_label_ar : heroData.stat3_label_en 
    },
  ] : [
    { value: "1000+", label: t("landing.hero.stats.companies") },
    { value: "50K+", label: t("landing.hero.stats.users") },
    { value: "99.9%", label: t("landing.hero.stats.uptime") },
  ];

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  if (isLoading) {
    return (
      <section className="relative min-h-screen pt-24 pb-16 overflow-hidden gradient-hero">
        <div className="container-custom px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-6rem)]">
            <div className="space-y-8">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-14 w-40" />
                <Skeleton className="h-14 w-40" />
              </div>
            </div>
            <Skeleton className="h-[500px] rounded-3xl" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen pt-24 pb-16 overflow-hidden gradient-hero">
      {/* Background Decorations */}
      <div className="absolute top-20 right-0 w-[600px] h-[600px] blob-primary rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] blob-accent rounded-full blur-3xl opacity-40 pointer-events-none" />

      <div className="container-custom px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-6rem)]">
          {/* Content */}
          <div className="space-y-8 animate-slide-up">
            {/* Badge */}
            {badge && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-sm font-medium text-primary">{badge}</span>
              </div>
            )}

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                {title}
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl">
                {subtitle}
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              {featurePills.map((pill, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm"
                >
                  <pill.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{pill.label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register-company">
                <Button size="lg" className="gradient-primary text-white btn-primary-shadow text-lg px-8 h-14 rounded-xl group w-full sm:w-auto">
                  {ctaText}
                  <ArrowIcon className="ms-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14 rounded-xl group"
                onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Play className="me-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                {demoText}
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2 space-x-reverse">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-background flex items-center justify-center text-xs font-bold text-primary"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{stats[0]?.value}</span> {stats[0]?.label}
              </div>
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative animate-slide-in-left">
            {/* Main Dashboard Card */}
            <div className="glass-card rounded-3xl p-1 shadow-2xl">
              {/* Browser Bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    nizam.app/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center p-4 rounded-xl bg-muted/30">
                      <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Chart Placeholder */}
                <div className="h-40 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-border/50 flex items-end justify-around p-4">
                  {[60, 80, 45, 90, 70, 85, 95].map((height, i) => (
                    <div
                      key={i}
                      className="w-8 rounded-t-lg gradient-primary opacity-70"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                  <div className="flex-1 p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{t("landing.dashboard.newInvoice")}</span>
                    </div>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-accent/10 border border-accent/20">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">{t("landing.dashboard.salesReport")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute -top-4 -left-4 glass-card rounded-2xl p-4 shadow-xl animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("landing.dashboard.salesGrowth")}</div>
                  <div className="text-lg font-bold text-green-500">+24%</div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-4 glass-card rounded-2xl p-4 shadow-xl animate-float-delayed">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("landing.dashboard.newInvoice")}</div>
                  <div className="text-sm font-bold">INV-2024-0158</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
