import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Phone, MapPin } from "lucide-react";

const socialLinks = [
  { label: "Twitter", href: "#", icon: "𝕏" },
  { label: "LinkedIn", href: "#", icon: "in" },
  { label: "YouTube", href: "#", icon: "▶" },
];

export const NizamFooter = () => {
  const { t } = useTranslation();

  const footerLinks = [
    {
      title: t("landing.footer.links.product.title"),
      links: [
        { label: t("landing.footer.links.product.features"), href: "#features" },
        { label: t("landing.footer.links.product.modules"), href: "#modules" },
        { label: t("landing.footer.links.product.pricing"), href: "#pricing" },
        { label: t("landing.footer.links.product.faq"), href: "#faq" },
      ],
    },
    {
      title: t("landing.footer.links.company.title"),
      links: [
        { label: t("landing.footer.links.company.about"), href: "#" },
        { label: t("landing.footer.links.company.blog"), href: "#" },
        { label: t("landing.footer.links.company.careers"), href: "#" },
        { label: t("landing.footer.links.company.partners"), href: "#" },
      ],
    },
    {
      title: t("landing.footer.links.support.title"),
      links: [
        { label: t("landing.footer.links.support.help"), href: "#" },
        { label: t("landing.footer.links.support.docs"), href: "#" },
        { label: t("landing.footer.links.support.contact"), href: "#contact" },
        { label: t("landing.footer.links.support.status"), href: "#" },
      ],
    },
    {
      title: t("landing.footer.links.legal.title"),
      links: [
        { label: t("landing.footer.links.legal.privacy"), href: "#" },
        { label: t("landing.footer.links.legal.terms"), href: "#" },
        { label: t("landing.footer.links.legal.usage"), href: "#" },
      ],
    },
  ];

  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer id="contact" className="bg-sidebar-background text-sidebar-foreground">
      <div className="container-custom section-padding">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                ن
              </div>
              <span className="text-2xl font-bold">{t("common.appName")}</span>
            </Link>

            <p className="text-muted-foreground max-w-sm">
              {t("landing.footer.description")}
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-5 h-5 text-primary" />
                <span>{t("landing.footer.contact.email")}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-5 h-5 text-primary" />
                <span dir="ltr">{t("landing.footer.contact.phone")}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary" />
                <span>{t("landing.footer.contact.address")}</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label={social.label}
                >
                  <span className="text-sm font-bold">{social.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {footerLinks.map((section, index) => (
            <div key={index} className="space-y-4">
              <h4 className="font-bold text-lg">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, i) => (
                  <li key={i}>
                    <button
                      onClick={() => scrollToSection(link.href)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {t("landing.footer.copyright")}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                {t("landing.footer.madeIn")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
