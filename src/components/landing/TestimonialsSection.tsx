import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { Star, Quote } from "lucide-react";

export const TestimonialsSection = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const testimonials = [
    {
      name: isRTL ? "أحمد محمد" : "Ahmed Mohammed",
      company: isRTL ? "شركة النجاح للتجارة" : "Success Trading Co.",
      content: isRTL 
        ? "برنامج رائع سهّل علينا إدارة الحسابات والفواتير بشكل كبير. أنصح به بشدة!"
        : "Amazing software that made managing accounts and invoices so much easier. Highly recommended!",
      rating: 5,
      avatar: "أ"
    },
    {
      name: isRTL ? "فاطمة علي" : "Fatima Ali",
      company: isRTL ? "مؤسسة الإبداع" : "Innovation Est.",
      content: isRTL 
        ? "نظام الموارد البشرية وفّر علينا وقت كبير في إدارة الرواتب والحضور. ممتاز!"
        : "The HR system saved us a lot of time in managing payroll and attendance. Excellent!",
      rating: 5,
      avatar: "ف"
    },
    {
      name: isRTL ? "خالد العمري" : "Khalid Al-Omari",
      company: isRTL ? "مصنع الجودة" : "Quality Factory",
      content: isRTL 
        ? "إدارة المخزون أصبحت سهلة جداً، والتقارير تساعدنا في اتخاذ قرارات أفضل."
        : "Inventory management became very easy, and reports help us make better decisions.",
      rating: 5,
      avatar: "خ"
    },
  ];

  return (
    <section id="testimonials" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">{t("landing.testimonials.title")}</h3>
          <p className="text-muted-foreground text-lg">{t("landing.testimonials.subtitle")}</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="relative hover:shadow-xl transition-all duration-300 border-0 bg-card/50 backdrop-blur"
            >
              <CardContent className="p-6 pt-8">
                <Quote className="absolute top-4 end-4 h-8 w-8 text-primary/20" />
                
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.avatar}
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
