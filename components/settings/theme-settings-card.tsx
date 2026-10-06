"use client";

import { useI18n } from "@/components/i18n-provider";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ThemeSettingsCard() {
  const { palette, appearance, setPalette, setAppearance } = useTheme();
  const { locale, setLocale, t } = useI18n();

  return (
    <Card size="sm" className="border-border shadow-sm" data-testid="theme-settings-card">
      <CardHeader>
        <CardTitle className="text-lg">{t("settings.appearance.title")}</CardTitle>
        <p className="text-xs font-normal text-muted-foreground">
          {t("settings.appearance.description")}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label id="theme-palette-label">{t("settings.appearance.palette")}</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={palette}
            onValueChange={(value) => {
              if (value === "professional" || value === "warm") {
                setPalette(value);
              }
            }}
            aria-labelledby="theme-palette-label"
            data-testid="theme-palette-toggle"
            className="flex-wrap"
          >
            <ToggleGroupItem value="professional" aria-label={t("settings.appearance.paletteProfessional")}>
              {t("settings.appearance.paletteProfessional")}
            </ToggleGroupItem>
            <ToggleGroupItem value="warm" aria-label={t("settings.appearance.paletteWarm")}>
              {t("settings.appearance.paletteWarm")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <Label id="theme-appearance-label">{t("settings.appearance.mode")}</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={appearance}
            onValueChange={(value) => {
              if (value === "light" || value === "dark" || value === "system") {
                setAppearance(value);
              }
            }}
            aria-labelledby="theme-appearance-label"
            data-testid="theme-appearance-toggle"
            className="flex-wrap"
          >
            <ToggleGroupItem value="light" aria-label={t("settings.appearance.light")}>
              {t("settings.appearance.light")}
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label={t("settings.appearance.dark")}>
              {t("settings.appearance.dark")}
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label={t("settings.appearance.system")}>
              {t("settings.appearance.system")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <Label id="locale-label">{t("language.settingsTitle")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("language.settingsDescription")}
          </p>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={locale}
            onValueChange={(value) => {
              if ((LOCALES as readonly string[]).includes(value)) {
                setLocale(value as Locale);
              }
            }}
            aria-labelledby="locale-label"
            data-testid="locale-toggle"
            className="flex-wrap"
          >
            {LOCALES.map((code) => (
              <ToggleGroupItem key={code} value={code} lang={code}>
                {t(code === "id" ? "language.id" : "language.en")}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
}
