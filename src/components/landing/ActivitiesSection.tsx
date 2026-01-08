import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Store, Wrench, Factory, HardHat } from "lucide-react";

export const ActivitiesSection = () => {
  const { t } = useTranslation();

  const activities = [
    { icon: Store, key: "commercial", gradient: "from-blue-500/10 to-blue-500/5" },
    { icon: Wrench, key: "services", gradient: "from-green-500/10 to-green-500/5" },
    { icon: Factory, key: "industrial", gradient: "from-amber-500/10 to-amber-500/5" },
    { icon: HardHat, key: "contracting", gradient: "from-purple-500/10 to-purple-500/5" },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h3 className="text-3xl md:text-4xl font-bold text-center mb-12">
          {t("landing.activities.title")}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {activities.map((activity) => (
            <Card 
              key={activity.key} 
              className={`group hover:shadow-xl transition-all duration-300 cursor-pointer hover:border-primary bg-gradient-to-br ${activity.gradient} border-2`}
            >
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-background flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                  <activity.icon className="h-10 w-10 text-primary" />
                </div>
                <h4 className="font-bold text-lg">{t(`landing.activities.${activity.key}`)}</h4>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
