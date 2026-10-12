"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export function AhuStaleBanner({
  show,
  busy,
  canRecalculate,
  onRecalculate,
}: {
  show: boolean;
  busy: boolean;
  canRecalculate: boolean;
  onRecalculate: () => void;
}) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5"
    >
      <TriangleAlert className="size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{t("costing.ahu.staleTitle")}</p>
        <p className="text-muted-foreground text-xs">{t("costing.ahu.staleDescription")}</p>
      </div>
      {canRecalculate ? (
        <Button type="button" size="sm" disabled={busy} onClick={onRecalculate}>
          {busy ? <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden /> : null}
          {t("costing.ahu.recalc")}
        </Button>
      ) : null}
    </div>
  );
}
