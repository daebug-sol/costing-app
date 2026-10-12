"use client";

import type { Dispatch, SetStateAction } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SaveState } from "@/lib/save-state";
import { formatIDR } from "@/lib/utils/format";
import type { CostingWorkspaceState } from "./use-costing-workspace";

type MarginPct = CostingWorkspaceState["marginPct"];
type Toggles = { esk: boolean; asu: boolean; mob: boolean };

type Props = {
  marginPct: MarginPct;
  setMarginPct: Dispatch<SetStateAction<MarginPct>>;
  useEsk: boolean;
  useAsu: boolean;
  useMob: boolean;
  totals: CostingWorkspaceState["totals"];
  /** Called when a percent field loses focus. */
  onSaveMargins: () => void;
  /** Called with the next switch states; the caller sets state and persists. */
  onToggles: (next: Toggles) => void;
  saveState: SaveState;
};

type Row = {
  key: keyof MarginPct;
  label: string;
  amount: number;
  toggle?: keyof Toggles;
};

export function MarginsCard({
  marginPct,
  setMarginPct,
  useEsk,
  useAsu,
  useMob,
  totals,
  onSaveMargins,
  onToggles,
  saveState,
}: Props) {
  const { t } = useI18n();
  const toggles: Toggles = { esk: useEsk, asu: useAsu, mob: useMob };

  const rows: Row[] = [
    { key: "overhead", label: t("costing.page.overhead"), amount: totals.oh },
    { key: "contingency", label: t("costing.page.contingency"), amount: totals.cont },
    { key: "eskalasi", label: t("costing.page.escalation"), amount: useEsk ? totals.esk : 0, toggle: "esk" },
    { key: "asuransi", label: t("costing.page.insurance"), amount: useAsu ? totals.asu : 0, toggle: "asu" },
    { key: "mobilisasi", label: t("costing.page.mobilization"), amount: useMob ? totals.mob : 0, toggle: "mob" },
    { key: "margin", label: t("costing.page.margin"), amount: totals.marginAmt },
  ];

  const status =
    saveState === "saving"
      ? t("costing.page.saving")
      : saveState === "saved"
        ? t("costing.page.saved")
        : saveState === "error"
          ? t("costing.page.saveFailed")
          : "";

  return (
    <Card size="sm" className="gap-4">
      <CardHeader className="grid-cols-[1fr_auto]">
        <CardTitle>{t("costing.page.marginsTitle")}</CardTitle>
        <span className="text-muted-foreground text-xs" role="status">
          {status}
        </span>
      </CardHeader>
      <CardContent>
        <ul className="divide-border divide-y">
          {rows.map(({ key, label, amount, toggle }) => (
            <li key={key} className="flex flex-wrap items-center gap-3 py-2.5">
              {toggle ? (
                <Switch
                  id={`sw-${key}`}
                  aria-label={label}
                  checked={toggles[toggle]}
                  onCheckedChange={(v) => onToggles({ ...toggles, [toggle]: v })}
                />
              ) : null}
              <Label htmlFor={`pct-${key}`} className="min-w-24 flex-1 normal-case">
                {label}
              </Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id={`pct-${key}`}
                  className="h-8 w-20 text-right"
                  type="number"
                  inputMode="decimal"
                  value={marginPct[key]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setMarginPct((p) => ({ ...p, [key]: v }));
                  }}
                  onBlur={onSaveMargins}
                />
                <span className="text-muted-foreground text-xs">%</span>
              </div>
              <span className="tabular-money w-32 text-right text-sm">{formatIDR(amount)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
