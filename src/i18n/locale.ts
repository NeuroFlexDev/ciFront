import { learningEnglish } from "./learning";

export type Locale = "ru" | "en";
export type TranslationParams = Record<string, string | number>;
export type Dictionaries = Partial<Record<Locale, Record<string, string>>>;
export const LOCALE_STORAGE_KEY = "lernium_locale";
let memoryLocale: Locale = "ru";

export function getLocale(): Locale {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY) === "en" ? "en" : "ru";
  } catch {
    return memoryLocale;
  }
}

export function persistLocale(locale: Locale) {
  memoryLocale = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* Keep the preference for this tab if storage is unavailable. */
  }
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

export function translate(
  locale: Locale,
  key: string,
  params?: TranslationParams,
  dictionaries?: Dictionaries,
) {
  const source = dictionaries?.[locale];
  const template =
    source && Object.prototype.hasOwnProperty.call(source, key)
      ? source[key]
      : locale === "en" &&
          Object.prototype.hasOwnProperty.call(learningEnglish, key)
        ? learningEnglish[key]
        : key;
  return template.replace(/\{([\w]+)\}/g, (token, name: string) =>
    params && Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : token,
  );
}
