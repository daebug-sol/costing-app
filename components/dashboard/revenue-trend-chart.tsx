"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useContainerWidth } from "@/hooks/use-container-width";
import {
  chartBottomMargin,
  chartXAxisAngle,
  chartXAxisInterval,
  chartYAxisWidth,
  formatMonthAxisLabel,
} from "@/lib/chart-layout";
import type { DashboardRevenueTrendPayload } from "@/lib/dashboard-contract";
import { formatIDR, formatIDRCompact } from "@/lib/utils/format";

const chartConfig = {
  bookedRevenue: { label: "Booked", color: "var(--chart-2)" },
  potentialRevenue: { label: "Potential", color: "var(--chart-1)" },
} satisfies ChartConfig;

const CHART_FRAME_CLASS = "aspect-auto h-72 w-full min-w-0";

export function RevenueTrendChart({
  data,
  compact = false,
}: {
  data: DashboardRevenueTrendPayload;
  compact?: boolean;
}) {
  const { ref, tier } = useContainerWidth<HTMLDivElement>();
  const xAngle = chartXAxisAngle(tier, data.series.length);
  const valueFormatter = tier === "wide" ? formatIDR : formatIDRCompact;

  if (data.series.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada quotation untuk membentuk tren pendapatan.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="revenue-trend-chart">
      <div
        ref={ref}
        className="min-w-0 rounded-none border border-border/80 bg-gradient-to-b from-muted/20 to-background p-3"
      >
        <ChartContainer config={chartConfig} className={CHART_FRAME_CLASS} aria-label="Tren revenue booked dan potential">
          <AreaChart
            data={data.series}
            accessibilityLayer
            margin={{ top: 12, right: 8, left: 4, bottom: chartBottomMargin(tier, xAngle !== 0) }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              interval={chartXAxisInterval(tier, data.series.length)}
              angle={xAngle}
              textAnchor={xAngle === 0 ? "middle" : "end"}
              height={xAngle === 0 ? 30 : 48}
              tick={{ fontSize: 10 }}
              tickFormatter={(value: string) => formatMonthAxisLabel(value, tier)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => valueFormatter(value)}
              width={chartYAxisWidth(tier)}
              tick={{ fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="bookedRevenue"
              stroke="var(--color-bookedRevenue)"
              fill="var(--color-bookedRevenue)"
              fillOpacity={0.28}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="potentialRevenue"
              stroke="var(--color-potentialRevenue)"
              fill="var(--color-potentialRevenue)"
              fillOpacity={0.18}
              strokeWidth={2}
            />
            <ChartLegend
              content={
                <ChartLegendContent className="flex-wrap justify-start gap-x-3 gap-y-1 text-[11px]" />
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="tabular-money font-medium text-foreground">{formatIDR(Number(value))}</span>
                  )}
                />
              }
            />
          </AreaChart>
        </ChartContainer>
      </div>

      <div className={compact ? "sr-only" : "rounded-none border border-border/70"}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bulan</TableHead>
              <TableHead className="text-right">Booked</TableHead>
              <TableHead className="text-right">Potential</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.series.map((point) => (
              <TableRow key={point.month}>
                <TableCell>{point.month}</TableCell>
                <TableCell className="tabular-money text-right">{formatIDR(point.bookedRevenue)}</TableCell>
                <TableCell className="tabular-money text-right">{formatIDR(point.potentialRevenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
