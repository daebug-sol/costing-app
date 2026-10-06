"use client";

import { dashboardChartPlotClass } from "@/components/dashboard/dashboard-surface-styles";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useI18n } from "@/components/i18n-provider";
import { useContainerWidth } from "@/hooks/use-container-width";
import type { DashboardQuotationFunnel } from "@/lib/dashboard-contract";

export function QuotationFunnel({ data }: { data: DashboardQuotationFunnel }) {
  const { t } = useI18n();
  const chartConfig = {
    count: { label: t("dashboard.funnel.countLabel"), color: "var(--chart-3)" },
  } satisfies ChartConfig;
  const { ref, isCompact } = useContainerWidth<HTMLDivElement>();
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
      <div
        ref={ref}
        className={dashboardChartPlotClass}
      >
        <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full min-w-0">
          <BarChart
            data={stages}
            layout={isCompact ? "vertical" : "horizontal"}
            accessibilityLayer
            margin={{ top: 8, right: 8, left: isCompact ? 4 : 8, bottom: 8 }}
          >
            <CartesianGrid vertical={isCompact} horizontal={!isCompact} />
            {isCompact ? (
              <>
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tick={{ fontSize: 10 }}
                />
              </>
            ) : (
              <>
                <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              </>
            )}
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => <span className="tabular-money">{Number(value)}</span>}
                />
              }
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
