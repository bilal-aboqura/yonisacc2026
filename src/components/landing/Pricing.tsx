import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "المبتدئ",
    description: "للأعمال الصغيرة والمستقلين",
    price: "99",
    period: "شهرياً",
    popular: false,
    features: [
      "مستخدم واحد",
      "500 فاتورة شهرياً",
      "المحاسبة الأساسية",
      "تقارير محدودة",
      "دعم بالبريد الإلكتروني",
    ],
    notIncluded: ["نقاط البيع", "الموارد البشرية", "فروع متعددة"],
  },
  {
    name: "الأعمال",
    description: "للشركات الصغيرة والمتوسطة",
    price: "249",
    period: "شهرياً",
    popular: true,
    features: [
      "5 مستخدمين",
      "فواتير غير محدودة",
      "محاسبة متكاملة",
      "نقاط البيع",
      "إدارة المخزون",
      "تقارير متقدمة",
      "دعم أولوية",
    ],
    notIncluded: ["الموارد البشرية", "فروع متعددة"],
  },
  {
    name: "التجزئة",
    description: "للمتاجر والمطاعم",
    price: "349",
    period: "شهرياً",
    popular: false,
    features: [
      "10 مستخدمين",
      "كل مميزات الأعمال",
      "نظام POS متقدم",
      "فروع متعددة (حتى 3)",
      "مستودعات متعددة",
      "تقارير تفصيلية",
      "دعم 24/7",
    ],
    notIncluded: ["الموارد البشرية"],
  },
  {
    name: "المؤسسات",
    description: "للشركات الكبيرة",
    price: "تواصل معنا",
    period: "",
    popular: false,
    features: [
      "مستخدمين غير محدود",
      "كل المميزات",
      "الموارد البشرية الكاملة",
      "فروع غير محدودة",
      "تخصيص كامل",
      "API للتكامل",
      "مدير حساب مخصص",
    ],
    notIncluded: [],
  },
];

export const Pricing = () => {
  return (
    <section id="pricing" className="section-padding bg-background relative">
      {/* Background Decoration */}
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] blob-primary rounded-full blur-3xl opacity-20 pointer-events-none -translate-y-1/2" />

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            خطط <span className="gradient-text">الأسعار</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            اختر الخطة المناسبة لحجم أعمالك
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={cn(
                "rounded-3xl p-6 card-hover relative",
                plan.popular
                  ? "bg-gradient-to-b from-primary/10 to-primary/5 border-2 border-primary shadow-xl"
                  : "glass-card"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full gradient-primary text-white text-sm font-medium shadow-lg">
                    الأكثر شيوعاً
                  </span>
                </div>
              )}

              <div className="space-y-6">
                {/* Plan Header */}
                <div className="text-center pt-4">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="text-center">
                  {plan.period ? (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold gradient-text">{plan.price}</span>
                      <span className="text-muted-foreground">ريال/{plan.period}</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold gradient-text">{plan.price}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-green-500" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 opacity-50">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs">-</span>
                      </div>
                      <span className="text-sm line-through">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to="/register-company" className="block">
                  <Button
                    className={cn(
                      "w-full rounded-xl h-12",
                      plan.popular
                        ? "gradient-primary text-white btn-primary-shadow"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {plan.period ? "ابدأ الآن" : "تواصل معنا"}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-muted-foreground mt-8">
          جميع الأسعار لا تشمل ضريبة القيمة المضافة. يمكنك الإلغاء في أي وقت.
        </p>
      </div>
    </section>
  );
};
