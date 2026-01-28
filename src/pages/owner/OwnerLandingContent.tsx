import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe } from "lucide-react";
import { HeroManager } from "@/components/owner/landing/HeroManager";
import { FeaturesManager } from "@/components/owner/landing/FeaturesManager";
import { FAQManager } from "@/components/owner/landing/FAQManager";
import { TestimonialsManager } from "@/components/owner/landing/TestimonialsManager";
import { PricingManager } from "@/components/owner/landing/PricingManager";

const OwnerLandingContent = () => {
  const { isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState("hero");

  const tabs = [
    { value: "hero", label: isRTL ? "العنوان الرئيسي" : "Hero Section" },
    { value: "features", label: isRTL ? "المميزات" : "Features" },
    { value: "pricing", label: isRTL ? "الأسعار" : "Pricing" },
    { value: "faq", label: isRTL ? "الأسئلة الشائعة" : "FAQ" },
    { value: "testimonials", label: isRTL ? "الشهادات" : "Testimonials" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <Globe className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">
            {isRTL ? "إدارة محتوى الهبوط" : "Landing Page Content"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL 
              ? "تعديل محتوى صفحة الهبوط بالعربية والإنجليزية" 
              : "Edit landing page content in Arabic and English"
            }
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="hero">
          <HeroManager />
        </TabsContent>

        <TabsContent value="features">
          <FeaturesManager />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingManager />
        </TabsContent>

        <TabsContent value="faq">
          <FAQManager />
        </TabsContent>

        <TabsContent value="testimonials">
          <TestimonialsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerLandingContent;
