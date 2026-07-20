export const THEME_STORAGE_KEY = "costing-appearance";

export type ThemePalette = "professional" | "warm";
export type ThemeAppearance = "light" | "dark" | "system";
export type ResolvedAppearance = "light" | "dark";

export type ThemePreferences = {
  palette: ThemePalette;
  appearance: ThemeAppearance;
};

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  palette: "professional",
  appearance: "system",
};

export function isThemePalette(value: unknown): value is ThemePalette {
  return value === "professional" || value === "warm";
}

export function isThemeAppearance(value: unknown): value is ThemeAppearance {
  return value === "light" || value === "dark" || value === "system";
}

export function parseThemePreferences(raw: unknown): ThemePreferences {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_THEME_PREFERENCES;
  }

  const record = raw as Record<string, unknown>;

  return {
    palette: isThemePalette(record.palette)
      ? record.palette
      : DEFAULT_THEME_PREFERENCES.palette,
    appearance: isThemeAppearance(record.appearance)
      ? record.appearance
      : DEFAULT_THEME_PREFERENCES.appearance,
  };
}

export function resolveAppearance(
  appearance: ThemeAppearance,
  prefersDark: boolean
): ResolvedAppearance {
  if (appearance === "system") {
    return prefersDark ? "dark" : "light";
  }

  return appearance;
}

export function readThemePreferencesFromStorage(
  raw: string | null
): ThemePreferences {
  if (!raw) {
    return DEFAULT_THEME_PREFERENCES;
  }

  try {
    return parseThemePreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_THEME_PREFERENCES;
  }
}

export function serializeThemePreferences(
  preferences: ThemePreferences
): string {
  return JSON.stringify(preferences);
}

export function applyThemeToDocument(
  preferences: ThemePreferences,
  prefersDark: boolean,
  doc: Document = document
): ResolvedAppearance {
  const root = doc.documentElement;
  root.setAttribute("data-palette", preferences.palette);

  const resolved = resolveAppearance(preferences.appearance, prefersDark);
  root.classList.toggle("dark", resolved === "dark");

  return resolved;
}

/** Inline boot script — keep logic aligned with helpers above. */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var d=JSON.parse(localStorage.getItem(k)||"null");var p=d&&d.palette==="warm"?"warm":"professional";var a=d&&["light","dark","system"].indexOf(d.appearance)>=0?d.appearance:"system";var r=a==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):a;var el=document.documentElement;el.setAttribute("data-palette",p);if(r==="dark")el.classList.add("dark");else el.classList.remove("dark");}catch(e){document.documentElement.setAttribute("data-palette","professional");}})();`;
