import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Testimonial {
  id: string;
  name: string;
  company: string | null;
  content_ar: string;
  content_en: string;
  rating: number | null;
}

export const Testimonials = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  if (isLoading) {
    return (
      <section id="testimonials" className="section-padding bg-background">
        <div className="container-custom">
          <div className="text-center mb-16">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-0 bg-card/50">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-20 w-full mb-4" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  return (
    <section id="testimonials" className="section-padding bg-background relative">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] blob-accent rounded-full blur-3xl opacity-20 pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {isRTL ? "ماذا يقول" : "What Our"}{" "}
            <span className="gradient-text">{isRTL ? "عملاؤنا" : "Clients Say"}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {isRTL 
              ? "آراء عملائنا الكرام حول تجربتهم مع نظام" 
              : "Testimonials from our valued customers about their experience with Nizam"
            }
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials?.slice(0, 6).map((testimonial) => (
            <Card 
              key={testimonial.id} 
              className="relative hover:shadow-xl transition-all duration-300 border-0 bg-card/50 backdrop-blur card-hover"
            >
              <CardContent className="p-6 pt-8">
                <Quote className="absolute top-4 end-4 h-8 w-8 text-primary/20" />
                
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating || 5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{isRTL ? testimonial.content_ar : testimonial.content_en}"
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-bold">{testimonial.name}</h5>
                    <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
