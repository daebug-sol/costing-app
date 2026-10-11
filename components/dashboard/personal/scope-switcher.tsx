"use client";

import { useI18n } from "@/components/i18n-provider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_SALESMEN } from "@/lib/dashboard-scope";

/** Owner/admin/ceo only: render nothing for anyone without options. */
export function ScopeSwitcher({
  options,
  value,
  onChange,
}: {
  options: string[];
  /** A salesperson's name, or null for everyone. */
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const { t } = useI18n();
  if (options.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="scope-switcher" className="text-xs">
        {t("dashboard.personal.scope.label")}
      </Label>
      <Select
        value={value ?? ALL_SALESMEN}
        onValueChange={(next) => onChange(next === ALL_SALESMEN ? null : next)}
      >
        <SelectTrigger id="scope-switcher" className="min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SALESMEN}>{t("dashboard.personal.scope.all")}</SelectItem>
          {options.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
