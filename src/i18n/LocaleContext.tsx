import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LocaleContext } from "./context";
import {
  getLocale,
  LOCALE_STORAGE_KEY,
  persistLocale,
  translate,
  type Dictionaries,
  type Locale,
  type TranslationParams,
} from "./locale";

export function LocaleProvider({
  children,
  dictionaries,
}: {
  children: ReactNode;
  dictionaries?: Dictionaries;
}) {
  const [locale, updateLocale] = useState<Locale>(getLocale);
  const setLocale = useCallback((next: Locale) => {
    if (next !== "ru" && next !== "en") return;
    persistLocale(next);
    updateLocale(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY || event.key === null)
        updateLocale(getLocale());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const t = useCallback(
    (key: string, params?: TranslationParams) =>
      translate(locale, key, params, dictionaries),
    [locale, dictionaries],
  );
  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
