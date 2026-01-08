import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { ArrowLeft, ArrowRight, Play, Sparkles } from "lucide-react";

export const HeroSection = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 gradient-hero opacity-10" />
      <div className="absolute top-20 start-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 end-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>{isRTL ? "جديد! نظام الموارد البشرية المتكامل" : "New! Integrated HR System"}</span>
          </div>

          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            <span className="text-gradient">{t("landing.hero.title")}</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {t("landing.hero.subtitle")}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="gradient-primary text-white text-lg px-8 h-14 rounded-xl shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate("/register-company")}
            >
              {t("landing.hero.cta")}
              <Arrow className="ms-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 h-14 rounded-xl group">
              <Play className="me-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              {t("landing.hero.demo")}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">+500</div>
              <div className="text-muted-foreground text-sm mt-1">{isRTL ? "شركة" : "Companies"}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-accent">+10K</div>
              <div className="text-muted-foreground text-sm mt-1">{isRTL ? "مستخدم" : "Users"}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">99.9%</div>
              <div className="text-muted-foreground text-sm mt-1">{isRTL ? "وقت التشغيل" : "Uptime"}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
