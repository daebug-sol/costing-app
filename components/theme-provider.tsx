"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  applyThemeToDocument,
  DEFAULT_THEME_PREFERENCES,
  readThemePreferencesFromStorage,
  resolveAppearance,
  serializeThemePreferences,
  THEME_STORAGE_KEY,
  type ResolvedAppearance,
  type ThemeAppearance,
  type ThemePalette,
  type ThemePreferences,
} from "@/lib/theme-preferences";

type ThemeContextValue = {
  palette: ThemePalette;
  appearance: ThemeAppearance;
  resolvedAppearance: ResolvedAppearance;
  setPalette: (palette: ThemePalette) => void;
  setAppearance: (appearance: ThemeAppearance) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreferences(): ThemePreferences {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_PREFERENCES;
  }

  return readThemePreferencesFromStorage(
    window.localStorage.getItem(THEME_STORAGE_KEY)
  );
}

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribeSystemColorScheme(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy client read avoids setState-in-effect hydration (react-hooks/set-state-in-effect).
  const [preferences, setPreferences] = useState<ThemePreferences>(
    readStoredPreferences
  );
  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemColorScheme,
    getSystemPrefersDark,
    () => false
  );

  const resolvedAppearance = useMemo(
    () => resolveAppearance(preferences.appearance, systemPrefersDark),
    [preferences.appearance, systemPrefersDark]
  );

  useEffect(() => {
    applyThemeToDocument(preferences, systemPrefersDark);
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      serializeThemePreferences(preferences)
    );
  }, [preferences, systemPrefersDark]);

  const setPalette = useCallback((palette: ThemePalette) => {
    setPreferences((current) => ({ ...current, palette }));
  }, []);

  const setAppearance = useCallback((appearance: ThemeAppearance) => {
    setPreferences((current) => ({ ...current, appearance }));
  }, []);

  const value = useMemo(
    () => ({
      palette: preferences.palette,
      appearance: preferences.appearance,
      resolvedAppearance,
      setPalette,
      setAppearance,
    }),
    [
      preferences.palette,
      preferences.appearance,
      resolvedAppearance,
      setPalette,
      setAppearance,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

export function useThemeOptional() {
  return useContext(ThemeContext);
}
