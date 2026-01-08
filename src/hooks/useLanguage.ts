import { useTranslation } from 'react-i18next';
import { useCallback, useEffect } from 'react';

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language;
  const isRTL = currentLanguage === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage, isRTL]);

  const changeLanguage = useCallback((lang: 'ar' | 'en') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [i18n]);

  const toggleLanguage = useCallback(() => {
    const newLang = currentLanguage === 'ar' ? 'en' : 'ar';
    changeLanguage(newLang);
  }, [currentLanguage, changeLanguage]);

  return {
    currentLanguage,
    isRTL,
    changeLanguage,
    toggleLanguage
  };
};
