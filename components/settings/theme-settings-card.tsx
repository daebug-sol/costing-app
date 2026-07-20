"use client";

import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ThemeSettingsCard() {
  const { palette, appearance, setPalette, setAppearance } = useTheme();

  return (
    <Card size="sm" className="border-border shadow-sm" data-testid="theme-settings-card">
      <CardHeader>
        <CardTitle className="text-lg">Tampilan</CardTitle>
        <p className="text-xs font-normal text-muted-foreground">
          Preferensi perangkat — disimpan di browser Anda, bukan di server.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label id="theme-palette-label">Palet warna</Label>
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
            <ToggleGroupItem value="professional" aria-label="Profesional">
              Profesional
            </ToggleGroupItem>
            <ToggleGroupItem value="warm" aria-label="Hangat">
              Hangat
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <Label id="theme-appearance-label">Mode tampilan</Label>
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
            <ToggleGroupItem value="light" aria-label="Terang">
              Terang
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Gelap">
              Gelap
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label="Sistem">
              Sistem
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
}
