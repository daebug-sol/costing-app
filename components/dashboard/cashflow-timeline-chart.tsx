"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
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
import type { DashboardCashflowProjectionPayload } from "@/lib/dashboard-contract";
import {
  buildCashflowAssumptionNote,
  buildCashflowTimelineScale,
} from "@/lib/dashboard-ui-mappers";
import { cn } from "@/lib/utils";
import { formatIDR, formatIDRCompact } from "@/lib/utils/format";

const chartConfig = {
  projectedIn: { label: "Cash-in", color: "var(--chart-2)" },
  projectedOut: { label: "Cash-out", color: "var(--chart-1)" },
  runningBalance: { label: "Saldo berjalan", color: "var(--chart-4)" },
} satisfies ChartConfig;

const CHART_FRAME_CLASS = "aspect-auto h-72 w-full min-w-0";

export function CashflowTimelineChart({
  data,
  compact = false,
}: {
  data: DashboardCashflowProjectionPayload;
  compact?: boolean;
}) {
  const { ref, tier } = useContainerWidth<HTMLDivElement>();
  const scale = buildCashflowTimelineScale(data.series);
  const xAngle = chartXAxisAngle(tier, scale.rows.length);
  const valueFormatter = tier === "wide" ? formatIDR : formatIDRCompact;

  if (scale.rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada quotation booked untuk timeline cashflow.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="cashflow-timeline-chart">
      <div
        ref={ref}
        className="min-w-0 rounded-none border border-border/80 bg-gradient-to-b from-muted/20 to-background p-3"
      >
        <ChartContainer config={chartConfig} className={CHART_FRAME_CLASS} aria-label="Cashflow timeline dengan saldo berjalan">
          <ComposedChart
            data={scale.rows}
            accessibilityLayer
            margin={{ top: 12, right: 8, left: 4, bottom: chartBottomMargin(tier, xAngle !== 0) }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              interval={chartXAxisInterval(tier, scale.rows.length)}
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
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="projectedIn" fill="var(--color-projectedIn)" radius={3} />
            <Bar dataKey="projectedOut" fill="var(--color-projectedOut)" radius={3} />
            <Line
              type="monotone"
              dataKey="runningBalance"
              stroke="var(--color-runningBalance)"
              strokeWidth={2}
              dot={false}
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
                    <span className="tabular-money font-medium text-foreground">
                      {formatIDR(Number(value))}
                    </span>
                  )}
                />
              }
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      <div className="rounded-none border border-warning/30 bg-warning-muted p-3 text-xs text-warning">
        {buildCashflowAssumptionNote(data)} Projected cashflow only; not actual invoice
        collection.
      </div>

      <div className={compact ? "sr-only" : "rounded-none border border-border/70"}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bulan</TableHead>
              <TableHead className="text-right">In</TableHead>
              <TableHead className="text-right">Out</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scale.rows.map((row) => (
              <TableRow key={row.month}>
                <TableCell>{row.month}</TableCell>
                <TableCell className="tabular-money text-right">
                  {formatIDR(row.projectedIn)}
                </TableCell>
                <TableCell className="tabular-money text-right">
                  {formatIDR(row.projectedOut)}
                </TableCell>
                <TableCell
                  className={cn(
                    "tabular-money text-right",
                    row.isNegativeNet ? "text-destructive" : "text-success"
                  )}
                >
                  {formatIDR(row.projectedNet)}
                </TableCell>
                <TableCell className="tabular-money text-right">
                  {formatIDR(row.runningBalance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
