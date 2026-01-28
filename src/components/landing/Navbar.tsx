import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "المميزات" },
  { href: "#modules", label: "الوحدات" },
  { href: "#pricing", label: "الأسعار" },
  { href: "#faq", label: "الأسئلة الشائعة" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
          ? "glass-panel shadow-lg py-3"
          : "bg-transparent py-4"
      )}
    >
      <div className="container-custom px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:shadow-xl transition-shadow">
              ن
            </div>
            <span className="text-xl font-bold text-foreground">نظام</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium story-link"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" className="font-medium">
                تسجيل الدخول
              </Button>
            </Link>
            <Link to="/register-company">
              <Button className="gradient-primary text-white btn-primary-shadow font-medium">
                ابدأ مجاناً
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-out",
            isOpen ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
          )}
        >
          <div className="glass-card rounded-2xl p-4 space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="block w-full text-right py-3 px-4 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-4 border-t border-border space-y-2">
              <Link to="/auth" className="block">
                <Button variant="ghost" className="w-full justify-center font-medium">
                  تسجيل الدخول
                </Button>
              </Link>
              <Link to="/register-company" className="block">
                <Button className="w-full gradient-primary text-white font-medium">
                  ابدأ مجاناً
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
