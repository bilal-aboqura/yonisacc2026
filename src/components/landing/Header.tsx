import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, LogOut, LayoutDashboard, Building2 } from "lucide-react";

export const Header = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "#features", label: t("nav.features") },
    { href: "#pricing", label: t("nav.pricing") },
    { href: "#testimonials", label: t("nav.testimonials") },
    { href: "#contact", label: t("nav.contact") },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gradient cursor-pointer" onClick={() => navigate("/")}>
          {t("common.appName")}
        </h1>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          
          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Button variant="outline" onClick={() => navigate("/register-company")} className="gap-2">
                  <Building2 className="h-4 w-4" />
                  {t("nav.registerCompany")}
                </Button>
                <Button variant="ghost" onClick={() => navigate("/client")} className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  {t("nav.dashboard")}
                </Button>
                <Button variant="ghost" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  {t("nav.logout")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>
                  {t("nav.login")}
                </Button>
                <Button className="gradient-primary text-white" onClick={() => navigate("/register-company")}>
                  {t("nav.registerCompany")}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <div className="flex flex-col gap-6 mt-8">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="text-lg font-medium hover:text-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
                <div className="flex flex-col gap-3 mt-4">
                  {user ? (
                    <>
                      <Button 
                        variant="default" 
                        className="w-full gap-2 gradient-primary text-white" 
                        onClick={() => { navigate("/register-company"); setIsOpen(false); }}
                      >
                        <Building2 className="h-4 w-4" />
                        {t("nav.registerCompany")}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full gap-2" 
                        onClick={() => { navigate("/client"); setIsOpen(false); }}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        {t("nav.dashboard")}
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full gap-2" 
                        onClick={() => { handleSignOut(); setIsOpen(false); }}
                      >
                        <LogOut className="h-4 w-4" />
                        {t("nav.logout")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => { navigate("/auth"); setIsOpen(false); }}
                      >
                        {t("nav.login")}
                      </Button>
                      <Button 
                        className="gradient-primary text-white w-full gap-2" 
                        onClick={() => { navigate("/register-company"); setIsOpen(false); }}
                      >
                        <Building2 className="h-4 w-4" />
                        {t("nav.registerCompany")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
