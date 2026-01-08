import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, Package, Calculator, Users, BarChart3, 
  Shield, Building2, UserCheck 
} from "lucide-react";

export const FeaturesSection = () => {
  const { t } = useTranslation();

  const features = [
    { icon: FileText, key: "invoices", color: "from-blue-500 to-blue-600" },
    { icon: Package, key: "inventory", color: "from-amber-500 to-amber-600" },
    { icon: Calculator, key: "accounting", color: "from-green-500 to-green-600" },
    { icon: Users, key: "hr", color: "from-purple-500 to-purple-600" },
    { icon: BarChart3, key: "reports", color: "from-pink-500 to-pink-600" },
    { icon: UserCheck, key: "multiUser", color: "from-cyan-500 to-cyan-600" },
    { icon: Building2, key: "branches", color: "from-orange-500 to-orange-600" },
    { icon: Shield, key: "security", color: "from-red-500 to-red-600" },
  ];

  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">{t("landing.features.title")}</h3>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("landing.features.subtitle")}</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={feature.key} 
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 bg-card/50 backdrop-blur"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className={`w-14 h-14 mb-5 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h4 className="font-bold text-lg mb-2">{t(`landing.features.${feature.key}.title`)}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t(`landing.features.${feature.key}.description`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
