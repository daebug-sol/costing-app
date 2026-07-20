import {
  DEFAULT_THEME_PREFERENCES,
  parseThemePreferences,
  readThemePreferencesFromStorage,
  resolveAppearance,
  serializeThemePreferences,
} from "@/lib/theme-preferences";

describe("theme-preferences", () => {
  it("defaults to professional palette and system appearance", () => {
    expect(DEFAULT_THEME_PREFERENCES).toEqual({
      palette: "professional",
      appearance: "system",
    });
  });

  it("parses valid stored preferences", () => {
    expect(
      parseThemePreferences({ palette: "warm", appearance: "dark" })
    ).toEqual({
      palette: "warm",
      appearance: "dark",
    });
  });

  it("falls back when stored values are invalid", () => {
    expect(parseThemePreferences({ palette: "neon", appearance: "auto" })).toEqual(
      DEFAULT_THEME_PREFERENCES
    );
    expect(parseThemePreferences(null)).toEqual(DEFAULT_THEME_PREFERENCES);
  });

  it("reads serialized preferences from storage", () => {
    const raw = serializeThemePreferences({
      palette: "warm",
      appearance: "light",
    });

    expect(readThemePreferencesFromStorage(raw)).toEqual({
      palette: "warm",
      appearance: "light",
    });
    expect(readThemePreferencesFromStorage("{bad json")).toEqual(
      DEFAULT_THEME_PREFERENCES
    );
  });

  it("resolves system appearance from media preference", () => {
    expect(resolveAppearance("system", true)).toBe("dark");
    expect(resolveAppearance("system", false)).toBe("light");
    expect(resolveAppearance("dark", false)).toBe("dark");
    expect(resolveAppearance("light", true)).toBe("light");
  });
});
