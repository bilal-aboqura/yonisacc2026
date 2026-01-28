import { Calculator, Users, ShoppingCart, Package, Building2, Briefcase, Store, Coffee, Globe, UserCheck } from "lucide-react";

const modules = [
  {
    icon: Calculator,
    title: "المحاسبة",
    description: "دفتر أستاذ عام، قيود يومية، موازين مراجعة، قوائم مالية، وضريبة القيمة المضافة",
    gradient: "from-blue-500 to-cyan-500",
    features: ["القيود اليومية", "ميزان المراجعة", "القوائم المالية", "ضريبة القيمة المضافة"],
  },
  {
    icon: Users,
    title: "الموارد البشرية",
    description: "إدارة الموظفين، الرواتب، الحضور والانصراف، الإجازات، والسلف",
    gradient: "from-purple-500 to-pink-500",
    features: ["إدارة الموظفين", "مسير الرواتب", "الحضور والانصراف", "الإجازات والسلف"],
  },
  {
    icon: ShoppingCart,
    title: "نقاط البيع",
    description: "نظام POS متكامل للتجزئة مع الباركود، الفواتير الإلكترونية، وإدارة الكاشير",
    gradient: "from-orange-500 to-red-500",
    features: ["نظام الكاشير", "قارئ الباركود", "الفواتير الإلكترونية", "تقارير المبيعات"],
  },
  {
    icon: Package,
    title: "المخزون",
    description: "إدارة المنتجات، المستودعات المتعددة، التحويلات، والتنبيهات التلقائية",
    gradient: "from-green-500 to-emerald-500",
    features: ["إدارة المنتجات", "مستودعات متعددة", "تتبع الكميات", "تنبيهات النقص"],
  },
];

const businessTypes = [
  { icon: Building2, label: "شركات تجارية" },
  { icon: Briefcase, label: "شركات خدمية" },
  { icon: Store, label: "متاجر التجزئة" },
  { icon: Coffee, label: "المطاعم والكافيهات" },
  { icon: Globe, label: "الأعمال الإلكترونية" },
  { icon: UserCheck, label: "المستقلين والوكالات" },
];

export const Modules = () => {
  return (
    <section id="modules" className="section-padding bg-muted/30 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] blob-accent rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] blob-primary rounded-full blur-3xl opacity-20 pointer-events-none" />

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            وحدات <span className="gradient-text">متكاملة</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            كل وحدة مصممة بعناية لتلبية احتياجاتك الخاصة
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {modules.map((module, index) => (
            <div
              key={index}
              className="glass-card rounded-3xl p-8 card-hover group"
            >
              <div className="flex items-start gap-6">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform flex-shrink-0`}
                >
                  <module.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{module.title}</h3>
                    <p className="text-muted-foreground">{module.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {module.features.map((feature, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Business Types */}
        <div className="text-center space-y-8">
          <h3 className="text-2xl font-bold">مناسب لجميع أنواع الأعمال</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {businessTypes.map((type, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border shadow-sm card-hover"
              >
                <type.icon className="w-5 h-5 text-primary" />
                <span className="font-medium">{type.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
