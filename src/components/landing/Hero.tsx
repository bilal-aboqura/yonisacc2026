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
  video_url: string | null;
}

// Helper function to convert YouTube URL to embed URL
const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  
  // Already an embed URL
  if (url.includes('/embed/')) {
    const videoId = url.split('/embed/')[1]?.split('?')[0];
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0`;
    }
    return url;
  }
  
  // Standard YouTube URL (youtube.com/watch?v=...)
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) {
    const videoId = watchMatch[1];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0`;
  }
  
  // Short YouTube URL (youtu.be/...)
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) {
    const videoId = shortMatch[1];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0`;
  }
  
  return null;
};

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
      return data as unknown as HeroData | null;
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
    <section className="relative min-h-screen pt-20 sm:pt-24 pb-12 sm:pb-16 overflow-hidden gradient-hero">
      {/* Background Decorations */}
      <div className="absolute top-20 right-0 w-[300px] sm:w-[400px] lg:w-[600px] h-[300px] sm:h-[400px] lg:h-[600px] blob-primary rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[250px] sm:w-[350px] lg:w-[500px] h-[250px] sm:h-[350px] lg:h-[500px] blob-accent rounded-full blur-3xl opacity-40 pointer-events-none" />

      <div className="container-custom px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-16 items-center min-h-[calc(100vh-5rem)] sm:min-h-[calc(100vh-6rem)]">
          {/* Content */}
          <div className="space-y-6 sm:space-y-8 animate-slide-up order-2 lg:order-1">
            {/* Badge */}
            {badge && (
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs sm:text-sm font-medium text-primary">{badge}</span>
              </div>
            )}

            {/* Heading */}
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {title}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                {subtitle}
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {featurePills.map((pill, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-card border border-border shadow-sm"
                >
                  <pill.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium">{pill.label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link to="/register-company" className="w-full sm:w-auto">
                <Button size="lg" className="gradient-primary text-white btn-primary-shadow text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 rounded-xl group w-full">
                  {ctaText}
                  <ArrowIcon className="ms-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 rounded-xl group w-full sm:w-auto"
                onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Play className="me-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                {demoText}
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-4 sm:gap-6 pt-2 sm:pt-4">
              <div className="flex -space-x-2 space-x-reverse">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-background flex items-center justify-center text-xs font-bold text-primary"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{stats[0]?.value}</span> {stats[0]?.label}
              </div>
            </div>
          </div>

          {/* Video or Dashboard Mockup */}
          <div className="relative animate-slide-in-left order-1 lg:order-2">
            {/* Main Content Card */}
            <div className="glass-card rounded-2xl sm:rounded-3xl p-1 shadow-2xl overflow-hidden">
              {heroData?.video_url && getYouTubeEmbedUrl(heroData.video_url) ? (
                // YouTube Video
                <div className="aspect-video">
                  <iframe
                    src={getYouTubeEmbedUrl(heroData.video_url)!}
                    className="w-full h-full rounded-xl sm:rounded-2xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Nizam Demo Video"
                  />
                </div>
              ) : (
                // Fallback Dashboard Mockup
                <>
                  {/* Browser Bar */}
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-border/50">
                    <div className="flex gap-1 sm:gap-1.5">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-destructive/70" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-accent/70" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary/70" />
                    </div>
                    <div className="flex-1 text-center hidden sm:block">
                      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        nizam.app/dashboard
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Content */}
                  <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      {stats.map((stat, index) => (
                        <div key={index} className="text-center p-2 sm:p-4 rounded-lg sm:rounded-xl bg-muted/30">
                          <div className="text-lg sm:text-xl md:text-2xl font-bold gradient-text">{stat.value}</div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Chart Placeholder */}
                    <div className="h-24 sm:h-32 md:h-40 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-border/50 flex items-end justify-around p-2 sm:p-4">
                      {[60, 80, 45, 90, 70, 85, 95].map((height, i) => (
                        <div
                          key={i}
                          className="w-4 sm:w-6 md:w-8 rounded-t-md sm:rounded-t-lg gradient-primary opacity-70"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 sm:gap-3">
                      <div className="flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                          <span className="text-xs sm:text-sm font-medium truncate">{t("landing.dashboard.newInvoice")}</span>
                        </div>
                      </div>
                      <div className="flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-accent/10 border border-accent/20">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                          <span className="text-xs sm:text-sm font-medium truncate">{t("landing.dashboard.salesReport")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Floating Cards - Hidden on mobile */}
            <div className="hidden sm:block absolute -top-4 -left-4 glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl animate-float">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{t("landing.dashboard.salesGrowth")}</div>
                  <div className="text-base sm:text-lg font-bold text-primary">+24%</div>
                </div>
              </div>
            </div>

            <div className="hidden sm:block absolute -bottom-4 -right-4 glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl animate-float-delayed">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{t("landing.dashboard.newInvoice")}</div>
                  <div className="text-xs sm:text-sm font-bold">INV-2024-0158</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
