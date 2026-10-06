"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const SHORT_LABEL: Record<Locale, string> = { id: "ID", en: "EN" };

/** Compact ID | EN toggle for the navbar. Preference is device-local. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("language.switchTo")}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-card p-0.5 text-xs",
        className
      )}
      data-testid="language-switcher"
    >
      <Languages className="text-muted-foreground ml-1 size-3.5" aria-hidden />
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            title={t(code === "id" ? "language.id" : "language.en")}
            onClick={() => setLocale(code)}
            className={cn(
              "rounded px-1.5 py-1 font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {SHORT_LABEL[code]}
          </button>
        );
      })}
    </div>
  );
}
