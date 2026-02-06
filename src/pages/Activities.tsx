import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Navbar } from "@/components/landing/Navbar";
import { NizamFooter } from "@/components/landing/NizamFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Clock, ArrowRight, ArrowLeft } from "lucide-react";
import {
  Gem, Car, ShoppingCart, Scissors, Sparkles,
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
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={cn(
              "font-medium transition-colors",
              !isYearly ? "text-foreground" : "text-muted-foreground"
            )}>
              {isRTL ? "شهري" : "Monthly"}
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={cn(
              "font-medium transition-colors",
              isYearly ? "text-foreground" : "text-muted-foreground"
            )}>
              {isRTL ? "سنوي" : "Yearly"}
            </span>
            {isYearly && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
                {isRTL ? "وفر 20%" : "Save 20%"}
              </Badge>
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
                const isComingSoon = vertical.status === "coming_soon";
                const name = isRTL ? vertical.name_ar : vertical.name_en;
                const description = isRTL ? vertical.description_ar : vertical.description_en;
                const features = isRTL ? vertical.features_ar : vertical.features_en;
                const price = isYearly ? vertical.yearly_price : vertical.monthly_price;

                return (
                  <Card 
                    key={vertical.id} 
                    className={cn(
                      "group relative overflow-hidden transition-all duration-300 hover:shadow-xl border-2",
                      isComingSoon ? "opacity-80 hover:opacity-100" : "hover:border-primary"
                    )}
                  >
                    {/* Status Badge */}
                    {isComingSoon && (
                      <div className="absolute top-4 end-4 z-10">
                        <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                          <Clock className="h-3 w-3" />
                          {isRTL ? "قريباً" : "Coming Soon"}
                        </Badge>
                      </div>
                    )}

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
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">{price}</span>
                          <span className="text-muted-foreground text-sm">
                            {isRTL ? "ر.س" : "SAR"} / {isYearly ? (isRTL ? "سنة" : "year") : (isRTL ? "شهر" : "month")}
                          </span>
                        </div>
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

                    <CardFooter className="pt-4">
                      {isComingSoon ? (
                        <Button disabled className="w-full gap-2" variant="secondary">
                          <Clock className="h-4 w-4" />
                          {isRTL ? "تحت التطوير" : "Under Development"}
                        </Button>
                      ) : (
                        <Link to="/register-company" className="w-full">
                          <Button className="w-full gap-2 gradient-primary text-white">
                            {isRTL ? "اشترك الآن" : "Subscribe Now"}
                            <ArrowIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </CardFooter>
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
