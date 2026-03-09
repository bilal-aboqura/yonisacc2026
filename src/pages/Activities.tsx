import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Navbar } from "@/components/landing/Navbar";
import { NizamFooter } from "@/components/landing/NizamFooter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Check, ArrowRight, ArrowLeft, Sparkles,
  Gem, Car, ShoppingCart, Scissors,
  Stethoscope, Pill, Building2, UtensilsCrossed, Store
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Gem, Car, ShoppingCart, Scissors, Sparkles,
  Stethoscope, Pill, Building2, UtensilsCrossed, Store,
};

interface BusinessVertical {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  icon: string;
  color: string;
  monthly_price: number;
  yearly_price: number;
  features_ar: string[];
  features_en: string[];
  status: string;
  sort_order: number;
}

const Activities = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [isYearly, setIsYearly] = useState(false);

  const { data: verticals, isLoading } = useQuery({
    queryKey: ["business-verticals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_verticals" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as BusinessVertical[];
    },
  });

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-28 sm:pt-32 pb-12 sm:pb-16">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
            {isRTL ? "حلول متخصصة لكل نشاط" : "Specialized Solutions for Every Business"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {isRTL ? "الحلول " : "Specialized "}
            <span className="text-gradient">{isRTL ? "المتخصصة" : "Solutions"}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            {isRTL 
              ? "اختر النشاط المناسب لعملك واحصل على نظام مصمم خصيصاً لاحتياجاتك" 
              : "Choose the right solution for your business and get a system designed specifically for your needs"}
          </p>

          {/* Monthly/Yearly Toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <div className="inline-flex items-center rounded-full border border-border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => setIsYearly(false)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-all",
                  !isYearly ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {!isYearly && <Check className="w-3.5 h-3.5" />}
                {isRTL ? "شهري" : "Monthly"}
              </button>
              <button
                type="button"
                onClick={() => setIsYearly(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-all",
                  isYearly ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isYearly && <Check className="w-3.5 h-3.5" />}
                {isRTL ? "سنوي" : "Yearly"}
              </button>
            </div>
            {isYearly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Sparkles className="w-3 h-3" />
                {isRTL ? "وفّر 20%" : "Save 20%"}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Verticals Grid */}
      <section className="pb-20 sm:pb-28">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-40 bg-muted/50" />
                  <CardContent className="space-y-3 p-6">
                    <div className="h-4 bg-muted/50 rounded w-3/4" />
                    <div className="h-4 bg-muted/50 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {verticals?.map((vertical) => {
                const IconComp = iconMap[vertical.icon] || Store;
                const name = isRTL ? vertical.name_ar : vertical.name_en;
                const description = isRTL ? vertical.description_ar : vertical.description_en;
                const features = isRTL ? vertical.features_ar : vertical.features_en;

                const monthlyPrice = vertical.monthly_price;
                const yearlyPrice = vertical.yearly_price;
                const originalYearly = monthlyPrice * 12;
                const savings = originalYearly - yearlyPrice;

                return (
                  <Card 
                    key={vertical.id} 
                    className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl border-2 hover:border-primary"
                  >
                    <CardHeader className="pb-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br shadow-md",
                        vertical.color
                      )}>
                        <IconComp className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold">{name}</h3>
                      <p className="text-muted-foreground text-sm mt-1">{description}</p>
                    </CardHeader>

                    <CardContent className="pb-4">
                      {/* Price */}
                      <div className="mb-6">
                        {isYearly ? (
                          <div className="space-y-1">
                            <span className="text-sm text-muted-foreground line-through">
                              {originalYearly} {isRTL ? "ر.س" : "SAR"}
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-bold">{yearlyPrice}</span>
                              <span className="text-muted-foreground text-sm">
                                {isRTL ? "ر.س" : "SAR"} / {isRTL ? "سنة" : "year"}
                              </span>
                            </div>
                            {savings > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                <Sparkles className="w-3 h-3" />
                                {isRTL ? `توفير ${savings} ر.س` : `Save ${savings} SAR`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">{monthlyPrice}</span>
                            <span className="text-muted-foreground text-sm">
                              {isRTL ? "ر.س" : "SAR"} / {isRTL ? "شهر" : "month"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-3">
                        {features?.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-4" />
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <NizamFooter />
    </div>
  );
};

export default Activities;
