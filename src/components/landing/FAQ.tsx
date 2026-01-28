import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQ = () => {
  const { t } = useTranslation();

  const faqs = t("landing.faq.items", { returnObjects: true }) as Array<{
    question: string;
    answer: string;
  }>;

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
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="glass-card rounded-2xl px-6 border-none"
            >
              <AccordionTrigger className="text-right hover:no-underline py-6 text-lg font-semibold" data-accordion-trigger>
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6 text-base leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

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
