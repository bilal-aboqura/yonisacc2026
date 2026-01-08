import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export const CTASection = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 gradient-primary" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>{isRTL ? "تجربة مجانية لمدة 14 يوم" : "14-day free trial"}</span>
          </div>
          
          <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">
            {t("landing.cta.title")}
          </h3>
          
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            {t("landing.cta.subtitle")}
          </p>
          
          <Button 
            size="lg" 
            variant="secondary" 
            className="text-lg px-8 h-14 rounded-xl shadow-xl hover:shadow-2xl transition-all font-bold"
          >
            {t("landing.cta.button")}
            <Arrow className="ms-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};
