import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const footerLinks = [
  {
    title: "المنتج",
    links: [
      { label: "المميزات", href: "#features" },
      { label: "الوحدات", href: "#modules" },
      { label: "الأسعار", href: "#pricing" },
      { label: "الأسئلة الشائعة", href: "#faq" },
    ],
  },
  {
    title: "الشركة",
    links: [
      { label: "من نحن", href: "#" },
      { label: "المدونة", href: "#" },
      { label: "وظائف", href: "#" },
      { label: "الشراكات", href: "#" },
    ],
  },
  {
    title: "الدعم",
    links: [
      { label: "مركز المساعدة", href: "#" },
      { label: "التوثيق", href: "#" },
      { label: "تواصل معنا", href: "#contact" },
      { label: "حالة النظام", href: "#" },
    ],
  },
  {
    title: "قانوني",
    links: [
      { label: "سياسة الخصوصية", href: "#" },
      { label: "الشروط والأحكام", href: "#" },
      { label: "اتفاقية الاستخدام", href: "#" },
    ],
  },
];

const socialLinks = [
  { label: "Twitter", href: "#", icon: "𝕏" },
  { label: "LinkedIn", href: "#", icon: "in" },
  { label: "YouTube", href: "#", icon: "▶" },
];

export const NizamFooter = () => {
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
        <div className="grid lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                ن
              </div>
              <span className="text-2xl font-bold">نظام</span>
            </Link>

            <p className="text-muted-foreground max-w-sm">
              نظام ERP سحابي عربي متكامل للمحاسبة، الموارد البشرية، المخزون، ونقاط البيع.
              مصمم خصيصاً للشركات في العالم العربي.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-5 h-5 text-primary" />
                <span>info@nizam.app</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-5 h-5 text-primary" />
                <span dir="ltr">+966 50 123 4567</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary" />
                <span>الرياض، المملكة العربية السعودية</span>
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
              © {new Date().getFullYear()} نظام. جميع الحقوق محفوظة.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                صُنع بـ ❤️ في السعودية
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
