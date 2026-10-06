export const LOCALE_STORAGE_KEY = "costing-locale";

export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "id";

export function isLocale(value: unknown): value is Locale {
  return value === "id" || value === "en";
}

export function parseLocale(raw: string | null | undefined): Locale {
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/** BCP 47 tag used for `Intl` formatting and `<html lang>`. */
export function intlLocaleTag(locale: Locale): string {
  return locale === "en" ? "en-US" : "id-ID";
}
