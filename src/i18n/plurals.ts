import type { Locale } from "./locale";

const rules = { ru: new Intl.PluralRules("ru"), en: new Intl.PluralRules("en") };

export function pluralForm(locale: Locale, value: number, one: string, few: string, many: string) {
  const form = rules[locale].select(value);
  return form === "one" ? one : form === "few" ? few : many;
}
