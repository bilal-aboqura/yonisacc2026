import { useTranslation } from "react-i18next";
import { Calculator, Users, ShoppingCart, Package, Receipt, FileText, Globe, Shield, Zap } from "lucide-react";

export const Features = () => {
  const { t } = useTranslation();

  const highlights = [
    {
      icon: Globe,
      title: t("landing.features.highlights.arabic.title"),
      description: t("landing.features.highlights.arabic.description"),
    },
    {
      icon: Shield,
      title: t("landing.features.highlights.secure.title"),
      description: t("landing.features.highlights.secure.description"),
    },
    {
      icon: Zap,
      title: t("landing.features.highlights.fast.title"),
      description: t("landing.features.highlights.fast.description"),
    },
  ];

  const features = [
    {
      icon: Calculator,
      title: t("landing.features.items.accounting.title"),
      description: t("landing.features.items.accounting.description"),
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Users,
      title: t("landing.features.items.hr.title"),
      description: t("landing.features.items.hr.description"),
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: ShoppingCart,
      title: t("landing.features.items.pos.title"),
      description: t("landing.features.items.pos.description"),
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: Package,
      title: t("landing.features.items.inventory.title"),
      description: t("landing.features.items.inventory.description"),
      color: "from-green-500 to-green-600",
    },
    {
      icon: Receipt,
      title: t("landing.features.items.invoices.title"),
      description: t("landing.features.items.invoices.description"),
      color: "from-teal-500 to-teal-600",
    },
    {
      icon: FileText,
      title: t("landing.features.items.reports.title"),
      description: t("landing.features.items.reports.description"),
      color: "from-pink-500 to-pink-600",
    },
  ];

  return (
    <section id="features" className="section-padding bg-background relative">
      {/* Background Decoration */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] blob-primary rounded-full blur-3xl opacity-30 pointer-events-none -translate-y-1/2" />

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            {t("landing.features.title")} <span className="gradient-text">{t("landing.features.titleHighlight")}</span>?
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("landing.features.subtitle")}
          </p>
        </div>

        {/* Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {highlights.map((item, index) => (
            <div
              key={index}
              className="glass-card rounded-2xl p-6 card-hover text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg">
                <item.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group glass-card rounded-2xl p-6 card-hover"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
