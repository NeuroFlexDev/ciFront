import { useContext, useMemo } from "react";
import { AuthContext } from '@/auth/auth-context';
import { isBusiness } from '@/shared/business';
import { businessTranslation } from './businessTerminology';
import { LocaleContext } from "./context";
import {
  getLocale,
  persistLocale,
  translate,
  type TranslationParams,
} from "./locale";

const fallbackTranslate=(key:string,params?:TranslationParams)=>translate(getLocale(),key,params);
/** Provider-free rendering keeps isolated components and existing consumers compatible. */
export function useLocale() {
  const context = useContext(LocaleContext);
  const auth = useContext(AuthContext);
  const business = isBusiness(auth?.user);
  const locale = context?.locale ?? getLocale();
  const base = context?.t ?? fallbackTranslate;
  const t = useMemo(() => business
    ? (key: string, params?: TranslationParams) => businessTranslation(locale, key, params, base)
    : base, [business, locale, base]);
  return {
    ...(context ?? {
      locale: getLocale(),
      setLocale: persistLocale,
      t: fallbackTranslate,
    }), t,
  };
}
export { getLocale } from "./locale";
export type { Locale, TranslationParams, Dictionaries } from "./locale";
