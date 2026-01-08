import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export const LanguageToggle = () => {
  const { currentLanguage, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="relative"
      title={currentLanguage === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
    >
      <Languages className="h-5 w-5" />
      <span className="absolute -bottom-1 -right-1 text-[10px] font-bold">
        {currentLanguage === 'ar' ? 'EN' : 'ع'}
      </span>
    </Button>
  );
};
