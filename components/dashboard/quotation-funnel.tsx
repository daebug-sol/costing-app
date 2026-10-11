"use client";

import { DotMeter } from "@/components/dot/dot-meter";
import { useI18n } from "@/components/i18n-provider";
import type { DashboardQuotationFunnel } from "@/lib/dashboard-contract";

export function QuotationFunnel({ data }: { data: DashboardQuotationFunnel }) {
  const { t } = useI18n();
  const stages = [
    { stage: t("dashboard.funnel.draft"), count: data.draftCount },
    { stage: t("dashboard.funnel.finalized"), count: data.finalCount },
    { stage: t("dashboard.funnel.approved"), count: data.approvedCount },
  ];

  return (
    <div className="space-y-3" data-testid="quotation-funnel">
      <div className="grid grid-cols-2 gap-3 rounded-none border border-border/70 p-3 text-xs">
        <div className="min-w-0">
          <p className="text-muted-foreground">{t("dashboard.funnel.total")}</p>
          <p className="tabular-money mt-1 text-base font-semibold text-foreground">{data.totalCount}</p>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground">{t("dashboard.funnel.winRate")}</p>
          <p className="tabular-money mt-1 text-base font-semibold text-foreground">
            {data.winRatePct.toFixed(1)}%
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-3" aria-label={t("dashboard.funnel.title")}>
        {stages.map((stage) => {
          const share = data.totalCount > 0 ? (stage.count / data.totalCount) * 100 : 0;
          return (
            <li key={stage.stage} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span>{stage.stage}</span>
                <span className="tabular-money text-muted-foreground">{stage.count}</span>
              </div>
              <DotMeter value={share} cols={32} label={`${stage.stage}: ${stage.count}`} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
