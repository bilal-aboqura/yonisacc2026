import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";

interface FAQ {
  id: string;
  question_ar: string;
  question_en: string;
  answer_ar: string;
  answer_en: string;
  sort_order: number;
}

export const FAQ = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const { data: faqs, isLoading } = useQuery({
    queryKey: ["landing-faq-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_faq")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (error) throw error;
      return data as FAQ[];
    },
  });

  return (
    <section id="faq" className="section-padding bg-muted/30 relative">
      {/* Background Decoration */}
      <div className="absolute bottom-0 left-1/2 w-[600px] h-[600px] blob-accent rounded-full blur-3xl opacity-20 pointer-events-none -translate-x-1/2" />

      <div className="container-custom max-w-4xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            {t("landing.faq.title")} <span className="gradient-text">{t("landing.faq.titleHighlight")}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("landing.faq.subtitle")}
          </p>
        </div>

        {/* FAQ Accordion */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl px-6 py-6">
                <Skeleton className="h-6 w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {faqs?.map((faq, index) => (
              <AccordionItem
                key={faq.id}
                value={`item-${index}`}
                className="glass-card rounded-2xl px-6 border-none"
              >
                <AccordionTrigger className="text-right hover:no-underline py-6 text-lg font-semibold" data-accordion-trigger>
                  {isRTL ? faq.question_ar : faq.question_en}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 text-base leading-relaxed">
                  {isRTL ? faq.answer_ar : faq.answer_en}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Contact CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            {t("landing.faq.contactCta")}
          </p>
          <button
            onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
            className="text-primary font-medium hover:underline"
          >
            {t("landing.faq.contactLink")}
          </button>
        </div>
      </div>
    </section>
  );
};
