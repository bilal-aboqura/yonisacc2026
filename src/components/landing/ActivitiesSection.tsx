import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Clock } from "lucide-react";
import {
  Gem, Car, ShoppingCart, Scissors, Sparkles,
  Stethoscope, Pill, Building2, UtensilsCrossed, Store
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Gem, Car, ShoppingCart, Scissors, Sparkles,
  Stethoscope, Pill, Building2, UtensilsCrossed, Store,
};

interface Vertical {
  id: string;
  name_ar: string;
  name_en: string;
  icon: string;
  color: string;
  status: string;
}

export const ActivitiesSection = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const { data: verticals } = useQuery({
    queryKey: ["landing-verticals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_verticals" as any)
        .select("id, name_ar, name_en, icon, color, status")
        .eq("is_active", true)
        .order("sort_order")
        .limit(8);
      if (error) throw error;
      return (data || []) as unknown as Vertical[];
    },
  });

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  if (!verticals || verticals.length === 0) return null;

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h3 className="text-3xl md:text-4xl font-bold text-center mb-4">
          {isRTL ? "الحلول " : "Specialized "}
          <span className="text-gradient">{isRTL ? "المتخصصة" : "Solutions"}</span>
        </h3>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          {isRTL 
            ? "أنظمة مصممة خصيصاً لكل نوع نشاط تجاري" 
            : "Systems designed specifically for each type of business"}
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto mb-8">
          {verticals.map((vertical) => {
            const IconComp = iconMap[vertical.icon] || Store;
            const name = isRTL ? vertical.name_ar : vertical.name_en;
            const isComingSoon = vertical.status === "coming_soon";

            return (
              <Link to="/activities" key={vertical.id}>
                <Card 
                  className="group hover:shadow-xl transition-all duration-300 cursor-pointer hover:border-primary border-2 relative overflow-hidden"
                >
                  {isComingSoon && (
                    <div className="absolute top-2 end-2 z-10">
                      <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <Clock className="h-2.5 w-2.5" />
                        {isRTL ? "قريباً" : "Soon"}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6 sm:p-8 text-center">
                    <div className={cn(
                      "w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md bg-gradient-to-br",
                      vertical.color
                    )}>
                      <IconComp className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <h4 className="font-bold text-sm sm:text-base">{name}</h4>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="text-center">
          <Link 
            to="/activities" 
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            {isRTL ? "عرض جميع الأنشطة" : "View All Activities"}
            <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};
