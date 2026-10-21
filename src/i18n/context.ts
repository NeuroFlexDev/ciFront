import { createContext } from "react";
import type { Locale, TranslationParams } from "./locale";
export type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
};
export const LocaleContext = createContext<LocaleContextValue | null>(null);
