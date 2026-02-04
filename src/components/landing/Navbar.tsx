import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, ChevronDown, Users, Calculator, Home, ShoppingCart, UtensilsCrossed, Truck, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const programs = [
  { 
    id: "gold-shop", 
    labelAr: "برنامج إدارة محلات الذهب", 
    labelEn: "Gold Shop Management",
    icon: Gem,
    path: "/client"
  },
  { 
    id: "hr", 
    labelAr: "برنامج إدارة الموارد البشرية", 
    labelEn: "HR Management",
    icon: Users,
    path: "/client"
  },
  { 
    id: "accounting", 
    labelAr: "برنامج المحاسبة المالية", 
    labelEn: "Financial Accounting",
    icon: Calculator,
    path: "/client"
  },
  { 
    id: "real-estate", 
    labelAr: "برنامج إدارة العقارات", 
    labelEn: "Real Estate Management",
    icon: Home,
    path: "/client"
  },
  { 
    id: "online-sales", 
    labelAr: "برنامج إدارة المبيعات الأونلاين", 
    labelEn: "Online Sales Management",
    icon: ShoppingCart,
    path: "/client"
  },
  { 
    id: "restaurant", 
    labelAr: "برنامج إدارة المطاعم", 
    labelEn: "Restaurant Management",
    icon: UtensilsCrossed,
    path: "/client"
  },
  { 
    id: "delivery", 
    labelAr: "برنامج إدارة توصيل الطلبات", 
    labelEn: "Delivery Management",
    icon: Truck,
    path: "/client"
  },
];

export const Navbar = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: t("nav.features") },
    { href: "#modules", label: t("nav.modules") },
    { href: "#pricing", label: t("nav.pricing") },
    { href: "#faq", label: t("nav.faq") },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsOpen(false);
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "glass-panel shadow-lg py-2 sm:py-3"
          : "bg-transparent py-3 sm:py-4"
      )}
    >
      <div className="container-custom px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg group-hover:shadow-xl transition-shadow">
              ك
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground">{t("common.appName")}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {/* Programs Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors font-medium story-link text-sm xl:text-base">
                  {isRTL ? "البرامج" : "Programs"}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                {programs.map((program) => (
                  <DropdownMenuItem key={program.id} asChild>
                    <Link 
                      to={program.path} 
                      className="flex items-center gap-3 cursor-pointer py-3"
                    >
                      <program.icon className="h-5 w-5 text-primary" />
                      <span>{isRTL ? program.labelAr : program.labelEn}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium story-link text-sm xl:text-base"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" className="font-medium text-sm xl:text-base">
                {t("nav.login")}
              </Button>
            </Link>
            <Link to="/register-company">
              <Button className="gradient-primary text-white btn-primary-shadow font-medium text-sm xl:text-base">
                {t("nav.startFree")}
              </Button>
            </Link>
          </div>

          {/* Mobile/Tablet Menu */}
          <div className="flex lg:hidden items-center gap-1 sm:gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  aria-label="Toggle menu"
                >
                  <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
                <SheetHeader className="p-4 sm:p-6 border-b border-border">
                  <SheetTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white font-bold">
                      ك
                    </div>
                    <span className="font-bold">{t("common.appName")}</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="p-4 sm:p-6 space-y-2">
                  {/* Mobile Programs Collapsible */}
                  <Collapsible open={programsOpen} onOpenChange={setProgramsOpen}>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center justify-between w-full py-3 px-4 text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium text-base">
                        <span>{isRTL ? "البرامج" : "Programs"}</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", programsOpen && "rotate-180")} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 ps-4">
                      {programs.map((program) => (
                        <Link
                          key={program.id}
                          to={program.path}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 py-2.5 px-4 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors text-sm"
                        >
                          <program.icon className="h-4 w-4 text-primary" />
                          <span>{isRTL ? program.labelAr : program.labelEn}</span>
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {navLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => scrollToSection(link.href)}
                      className="block w-full text-right py-3 px-4 text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium text-base"
                    >
                      {link.label}
                    </button>
                  ))}
                  <div className="pt-4 mt-4 border-t border-border space-y-3">
                    <Link to="/auth" className="block" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full justify-center font-medium h-12 text-base">
                        {t("nav.login")}
                      </Button>
                    </Link>
                    <Link to="/register-company" className="block" onClick={() => setIsOpen(false)}>
                      <Button className="w-full gradient-primary text-white font-medium h-12 text-base">
                        {t("nav.startFree")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
};
