import { useContext } from "react";
import { LocaleContext } from "./context";
import {
  getLocale,
  persistLocale,
  translate,
  type TranslationParams,
} from "./locale";

/** Provider-free rendering keeps isolated components and existing consumers compatible. */
export function useLocale() {
  const context = useContext(LocaleContext);
  return (
    context ?? {
      locale: getLocale(),
      setLocale: persistLocale,
      t: (key: string, params?: TranslationParams) =>
        translate(getLocale(), key, params),
    }
  );
}
export { getLocale } from "./locale";
export type { Locale, TranslationParams, Dictionaries } from "./locale";
