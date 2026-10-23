"use client";

import { useI18n } from "@/components/i18n-provider";
import { DotNumber } from "@/components/dot/dot-number";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SaveState } from "@/lib/save-state";
import { formatIDR } from "@/lib/utils/format";
import type { CostingWorkspaceState } from "./use-costing-workspace";

type Props = {
  totals: CostingWorkspaceState["totals"];
  saveState: SaveState;
  onRetry: () => void;
  /** Units quoted; per-unit price divides by it. */
  qty: number;
  /** Called with the cleaned value when the qty field loses focus. */
  onQtyCommit: (qty: number) => void;
};

/** Always-visible price summary, sticky under the top bar. */
export function ProjectPriceBar({ totals, saveState, onRetry, qty, onQtyCommit }: Props) {
  const { t } = useI18n();

  const status =
    saveState === "saving"
      ? t("costing.page.saving")
      : saveState === "saved"
        ? t("costing.page.saved")
        : saveState === "error"
          ? t("costing.page.saveFailed")
          : "";

  return (
    <section
      aria-label={t("costing.page.sellingPrice")}
      className="bg-card grid grid-cols-2 items-end gap-x-6 gap-y-2 rounded-xl px-4 py-3 ring-1 ring-border sm:flex sm:flex-wrap sm:gap-x-8 sm:px-5 xl:grid"
    >
      <div className="col-span-2 min-w-0">
        <div className="text-muted-foreground text-xs">{t("costing.page.sellingPrice")}</div>
        <DotNumber className="text-2xl break-words sm:text-3xl" data-testid="price-selling">
          {formatIDR(totals.selling)}
        </DotNumber>
      </div>
      <div className="min-w-0">
        <div className="text-muted-foreground text-xs">{t("costing.page.totalCost")}</div>
        <div className="tabular-money text-sm font-medium break-words">
          {formatIDR(totals.totalCost)}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-muted-foreground text-xs">{t("costing.page.perUnit")}</div>
        <div className="tabular-money text-sm font-medium break-words">
          {formatIDR(totals.perUnit)}
        </div>
      </div>
      <div className="min-w-0">
        <Label htmlFor="project-qty" className="text-muted-foreground text-xs font-normal tracking-normal normal-case">
          {t("costing.page.qty")}
        </Label>
        <Input
          id="project-qty"
          className="h-7 w-20 px-2 text-sm"
          type="number"
          min={1}
          inputMode="numeric"
          defaultValue={qty}
          key={`pq-${qty}`}
          onBlur={(e) => {
            const next = Math.max(1, Math.floor(Number(e.target.value) || 1));
            if (next !== qty) onQtyCommit(next);
          }}
        />
      </div>
      <div
        role="status"
        aria-live="polite"
        className="text-muted-foreground flex items-center justify-end gap-2 text-xs sm:ml-auto xl:ml-0"
      >
        {status ? <span className={saveState === "error" ? "text-destructive" : undefined}>{status}</span> : null}
        {saveState === "error" ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {t("costing.page.retry")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
