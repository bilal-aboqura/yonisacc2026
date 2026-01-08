import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";

export const Footer = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <footer className="py-12 border-t bg-card/50">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <h4 className="text-2xl font-bold text-gradient mb-4">{t("common.appName")}</h4>
            <p className="text-muted-foreground max-w-sm">
              {isRTL 
                ? "برنامج محاسبي متكامل لإدارة أعمالك بكفاءة واحترافية"
                : "Complete accounting software to manage your business efficiently and professionally"
              }
            </p>
          </div>
          
          <div>
            <h5 className="font-semibold mb-4">{isRTL ? "روابط سريعة" : "Quick Links"}</h5>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">{t("nav.features")}</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</a></li>
              <li><a href="#testimonials" className="hover:text-foreground transition-colors">{t("nav.testimonials")}</a></li>
              <li><a href="#contact" className="hover:text-foreground transition-colors">{t("nav.contact")}</a></li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-semibold mb-4">{isRTL ? "قانوني" : "Legal"}</h5>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{t("footer.privacy")}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t("footer.terms")}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} {t("common.appName")}. {t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
};
