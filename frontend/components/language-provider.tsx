"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { translate, type TranslationKey } from "@/lib/i18n";
import { getStoredLanguage, setStoredLanguage, subscribeToLanguage } from "@/lib/services/storage";
import type { LanguageCode } from "@/lib/types";

type LanguageContextValue = {
  language: LanguageCode;
  selectedLanguage: LanguageCode | null;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const selectedLanguage = useSyncExternalStore(
    subscribeToLanguage,
    getStoredLanguage,
    () => null,
  );
  const language = selectedLanguage ?? "en";

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setStoredLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      selectedLanguage,
      setLanguage,
      t: (key: TranslationKey) => translate(key, language),
    }),
    [language, selectedLanguage, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider.");
  return context;
}
