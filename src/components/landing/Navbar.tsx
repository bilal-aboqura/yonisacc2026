import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Navbar = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { isRTL } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();

  const navLinks = [
    { href: "#features", label: t("nav.features") },
    { href: "#modules", label: t("nav.modules") },
    { href: "/activities", label: isRTL ? "الأنشطة" : "Activities", isRoute: true },
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
            {navLinks.map((link) => (
              link.isRoute ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium story-link text-sm xl:text-base"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium story-link text-sm xl:text-base"
                >
                  {link.label}
                </button>
              )
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            <LanguageToggle />
            <ThemeToggle />
            {!authLoading && user ? (
              <Link to="/client">
                <Button className="gradient-primary text-white btn-primary-shadow font-medium text-sm xl:text-base gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  {isRTL ? "لوحة التحكم" : "Dashboard"}
                </Button>
              </Link>
            ) : (
              <>
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
              </>
            )}
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
                  {navLinks.map((link) => (
                    link.isRoute ? (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setIsOpen(false)}
                        className="block w-full text-right py-3 px-4 text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium text-base"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <button
                        key={link.href}
                        onClick={() => scrollToSection(link.href)}
                        className="block w-full text-right py-3 px-4 text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium text-base"
                      >
                        {link.label}
                      </button>
                    )
                  ))}
                  <div className="pt-4 mt-4 border-t border-border space-y-3">
                    {!authLoading && user ? (
                      <Link to="/client" className="block" onClick={() => setIsOpen(false)}>
                        <Button className="w-full gradient-primary text-white font-medium h-12 text-base gap-2">
                          <LayoutDashboard className="h-4 w-4" />
                          {isRTL ? "لوحة التحكم" : "Dashboard"}
                        </Button>
                      </Link>
                    ) : (
                      <>
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
                      </>
                    )}
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