import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Currency } from '../types';

interface LanguageContextType {
  language: string;
  currency: Currency;
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  currency: Currency.USD,
  setLanguage: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

interface LanguageProviderProps {
  children: ReactNode;
}

const languageToCurrency: Record<string, Currency> = {
  en: Currency.USD,
  es: Currency.ARS,
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState(i18n.language);
  const [currency, setCurrency] = useState<Currency>(
    languageToCurrency[i18n.language] || Currency.USD
  );

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    setLanguageState(lang);
    setCurrency(languageToCurrency[lang] || Currency.USD);
  };

  useEffect(() => {
    setCurrency(languageToCurrency[language] || Currency.USD);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, currency, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
