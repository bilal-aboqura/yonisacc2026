import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "هل يمكنني تجربة النظام مجاناً؟",
    answer:
      "نعم! نوفر فترة تجريبية مجانية لمدة 14 يوماً بدون الحاجة لبطاقة ائتمان. يمكنك استكشاف جميع المميزات خلال هذه الفترة.",
  },
  {
    question: "هل النظام يدعم ضريبة القيمة المضافة السعودية؟",
    answer:
      "نعم، النظام متوافق تماماً مع متطلبات هيئة الزكاة والضريبة والجمارك. يدعم إصدار الفواتير الإلكترونية وحساب ضريبة القيمة المضافة تلقائياً وإعداد الإقرارات الضريبية.",
  },
  {
    question: "هل يمكنني استيراد بياناتي من نظام آخر؟",
    answer:
      "بالتأكيد! نوفر أدوات استيراد سهلة تدعم ملفات Excel وCSV. كما يمكن لفريق الدعم مساعدتك في ترحيل البيانات من أي نظام محاسبي آخر.",
  },
  {
    question: "هل البيانات آمنة؟",
    answer:
      "نعم، نستخدم أحدث تقنيات التشفير (SSL/TLS) لحماية بياناتك. جميع البيانات مخزنة في مراكز بيانات آمنة مع نسخ احتياطي يومي تلقائي.",
  },
  {
    question: "هل يمكنني الترقية أو تخفيض الباقة لاحقاً؟",
    answer:
      "نعم، يمكنك تغيير باقتك في أي وقت من إعدادات حسابك. عند الترقية، سيتم احتساب الفرق بشكل تناسبي. عند التخفيض، سيسري التغيير من بداية الفترة التالية.",
  },
  {
    question: "هل يدعم النظام الفروع المتعددة؟",
    answer:
      "نعم، في باقة التجزئة وما فوق. يمكنك إدارة فروع متعددة بمستودعات منفصلة، صلاحيات مختلفة لكل فرع، وتقارير موحدة أو مفصلة حسب الفرع.",
  },
  {
    question: "كيف يعمل الدعم الفني؟",
    answer:
      "نوفر دعماً فنياً عبر عدة قنوات: البريد الإلكتروني، الدردشة المباشرة، والهاتف للباقات الأعلى. كما نوفر قاعدة معرفة شاملة ومقاطع فيديو تعليمية.",
  },
  {
    question: "هل يعمل نظام نقاط البيع بدون انترنت؟",
    answer:
      "نعم، يدعم نظام نقاط البيع العمل بدون اتصال (Offline Mode). سيتم حفظ العمليات محلياً ومزامنتها تلقائياً عند عودة الاتصال.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" className="section-padding bg-muted/30 relative">
      {/* Background Decoration */}
      <div className="absolute bottom-0 left-1/2 w-[600px] h-[600px] blob-accent rounded-full blur-3xl opacity-20 pointer-events-none -translate-x-1/2" />

      <div className="container-custom max-w-4xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            الأسئلة <span className="gradient-text">الشائعة</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            إجابات على الأسئلة الأكثر شيوعاً
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
            لم تجد إجابة لسؤالك؟
          </p>
          <button
            onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
            className="text-primary font-medium hover:underline"
          >
            تواصل مع فريق الدعم
          </button>
        </div>
      </div>
    </section>
  );
};
