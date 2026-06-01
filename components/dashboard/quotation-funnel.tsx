"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useContainerWidth } from "@/hooks/use-container-width";
import type { DashboardQuotationFunnel } from "@/lib/dashboard-contract";

const chartConfig = {
  count: { label: "Jumlah quotation", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function QuotationFunnel({ data }: { data: DashboardQuotationFunnel }) {
  const { ref, isCompact } = useContainerWidth<HTMLDivElement>();
  const stages = [
    { stage: "Draft", count: data.draftCount },
    { stage: "Finalized", count: data.finalCount },
    { stage: "Approved", count: data.approvedCount },
  ];

  return (
    <div className="space-y-3" data-testid="quotation-funnel">
      <div className="grid grid-cols-2 gap-3 rounded-none border border-border/70 p-3 text-xs">
        <div className="min-w-0">
          <p className="text-muted-foreground">Total quotation</p>
          <p className="tabular-money mt-1 text-base font-semibold text-foreground">{data.totalCount}</p>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground">Win rate</p>
          <p className="tabular-money mt-1 text-base font-semibold text-foreground">
            {data.winRatePct.toFixed(1)}%
          </p>
        </div>
      </div>
      <div
        ref={ref}
        className="min-w-0 rounded-none border border-border/80 bg-gradient-to-b from-muted/20 to-background p-3"
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
