import { MESSAGES } from "./messages";
import { isLocale, parseLocale, DEFAULT_LOCALE } from "./locale";

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe("i18n messages", () => {
  const idKeys = Object.keys(MESSAGES.id).sort();

  it("has the same keys in every locale", () => {
    expect(Object.keys(MESSAGES.en).sort()).toEqual(idKeys);
  });

  it("has no empty translations", () => {
    for (const locale of ["id", "en"] as const) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        expect([locale, key, value.trim().length > 0]).toEqual([locale, key, true]);
      }
    }
  });

  it("keeps {placeholders} identical across locales", () => {
    for (const key of idKeys) {
      const k = key as keyof typeof MESSAGES.id;
      expect([key, placeholders(MESSAGES.en[k])]).toEqual([key, placeholders(MESSAGES.id[k])]);
    }
  });
});

describe("locale helpers", () => {
  it("falls back to the default locale for unknown values", () => {
    expect(parseLocale("fr")).toBe(DEFAULT_LOCALE);
    expect(parseLocale(null)).toBe(DEFAULT_LOCALE);
    expect(parseLocale("en")).toBe("en");
  });

  it("recognises supported locales", () => {
    expect(isLocale("id")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });
});
