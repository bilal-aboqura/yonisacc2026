import { useTranslation } from "react-i18next";
import { Calculator, Users, ShoppingCart, Package, Building2, Briefcase, Store, Coffee, Globe, UserCheck } from "lucide-react";

export const Modules = () => {
  const { t } = useTranslation();

  const modules = [
    {
      icon: Calculator,
      title: t("landing.modules.items.accounting.title"),
      description: t("landing.modules.items.accounting.description"),
      gradient: "from-blue-500 to-cyan-500",
      features: t("landing.modules.items.accounting.features", { returnObjects: true }) as string[],
    },
    {
      icon: Users,
      title: t("landing.modules.items.hr.title"),
      description: t("landing.modules.items.hr.description"),
      gradient: "from-purple-500 to-pink-500",
      features: t("landing.modules.items.hr.features", { returnObjects: true }) as string[],
    },
    {
      icon: ShoppingCart,
      title: t("landing.modules.items.pos.title"),
      description: t("landing.modules.items.pos.description"),
      gradient: "from-orange-500 to-red-500",
      features: t("landing.modules.items.pos.features", { returnObjects: true }) as string[],
    },
    {
      icon: Package,
      title: t("landing.modules.items.inventory.title"),
      description: t("landing.modules.items.inventory.description"),
      gradient: "from-green-500 to-emerald-500",
      features: t("landing.modules.items.inventory.features", { returnObjects: true }) as string[],
    },
  ];

  const businessTypes = [
    { icon: Building2, label: t("landing.modules.businessTypes.commercial") },
    { icon: Briefcase, label: t("landing.modules.businessTypes.services") },
    { icon: Store, label: t("landing.modules.businessTypes.retail") },
    { icon: Coffee, label: t("landing.modules.businessTypes.restaurants") },
    { icon: Globe, label: t("landing.modules.businessTypes.ecommerce") },
    { icon: UserCheck, label: t("landing.modules.businessTypes.freelancers") },
  ];

  return (
    <section id="modules" className="section-padding bg-muted/30 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] blob-accent rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] blob-primary rounded-full blur-3xl opacity-20 pointer-events-none" />

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            {t("landing.modules.title")} <span className="gradient-text">{t("landing.modules.titleHighlight")}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("landing.modules.subtitle")}
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16">
          {modules.map((module, index) => (
            <div
              key={index}
              className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 card-hover group"
            >
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform flex-shrink-0`}
                >
                  <module.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="flex-1 space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">{module.title}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">{module.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {module.features.map((feature, i) => (
                      <span
                        key={i}
                        className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-muted text-xs sm:text-sm text-muted-foreground"
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
        <div className="text-center space-y-4 sm:space-y-6 lg:space-y-8">
          <h3 className="text-xl sm:text-2xl font-bold">{t("landing.modules.businessTypes.title")}</h3>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4">
            {businessTypes.map((type, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 rounded-xl sm:rounded-2xl bg-card border border-border shadow-sm card-hover"
              >
                <type.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-sm sm:text-base font-medium">{type.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
