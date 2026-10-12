"use client";

import { useI18n } from "@/components/i18n-provider";
import { DotNumber } from "@/components/dot/dot-number";
import { Button } from "@/components/ui/button";
import type { SaveState } from "@/lib/save-state";
import { formatIDR } from "@/lib/utils/format";
import type { CostingWorkspaceState } from "./use-costing-workspace";

type Props = {
  totals: CostingWorkspaceState["totals"];
  saveState: SaveState;
  onRetry: () => void;
};

/** Always-visible price summary, sticky under the top bar. */
export function ProjectPriceBar({ totals, saveState, onRetry }: Props) {
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
      className="bg-card sticky top-14 z-30 flex flex-wrap items-end gap-x-8 gap-y-2 rounded-xl px-4 py-3 ring-1 ring-border sm:px-5"
    >
      <div className="min-w-0">
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
      <div
        role="status"
        aria-live="polite"
        className="text-muted-foreground ml-auto flex items-center gap-2 text-xs"
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
