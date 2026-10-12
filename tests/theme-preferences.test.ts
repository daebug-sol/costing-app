import {
  DEFAULT_THEME_PREFERENCES,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  parseThemePreferences,
  readThemePreferencesFromStorage,
  resolveAppearance,
  serializeThemePreferences,
} from "@/lib/theme-preferences";

describe("theme-preferences", () => {
  it("defaults to dotmatrix palette and system appearance", () => {
    expect(DEFAULT_THEME_PREFERENCES).toEqual({
      palette: "dotmatrix",
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

  it("keeps a stored professional palette", () => {
    expect(
      parseThemePreferences({ palette: "professional", appearance: "dark" })
    ).toEqual({ palette: "professional", appearance: "dark" });
  });

  it("falls back to dotmatrix for an unknown palette", () => {
    expect(parseThemePreferences({ palette: "neon" }).palette).toBe("dotmatrix");
  });

  describe("THEME_INIT_SCRIPT", () => {
    function run(stored: string | null) {
      const attrs: Record<string, string> = {};
      const el = {
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
        classList: { add: () => {}, remove: () => {} },
      };
      const localStorage = {
        getItem: (k: string) => (k === THEME_STORAGE_KEY ? stored : null),
      };
      const window = { matchMedia: () => ({ matches: false }) };
      new Function("localStorage", "window", "document", THEME_INIT_SCRIPT)(
        localStorage,
        window,
        { documentElement: el }
      );
      return attrs["data-palette"];
    }

    it("applies stored warm and professional palettes", () => {
      expect(run('{"palette":"warm"}')).toBe("warm");
      expect(run('{"palette":"professional"}')).toBe("professional");
    });

    it("uses dotmatrix when nothing valid is stored", () => {
      expect(run(null)).toBe("dotmatrix");
      expect(run("{bad json")).toBe("dotmatrix");
      expect(run('{"palette":"neon"}')).toBe("dotmatrix");
    });
  });
});
