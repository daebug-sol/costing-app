"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
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
  chartYAxisWidth,
} from "@/lib/chart-layout";
import type { DashboardSankeyPayload } from "@/lib/dashboard-contract";
import {
  buildProfitBridgeStages,
  buildSankeyBridgeSummary,
} from "@/lib/dashboard-ui-mappers";
import { formatIDR, formatIDRCompact } from "@/lib/utils/format";

const chartConfig = {
  subtotal: { label: "Subtotal", color: "var(--chart-1)" },
  positive: { label: "Penambah (+)", color: "var(--chart-2)" },
  negative: { label: "Pengurang (-)", color: "var(--chart-5)" },
  final: { label: "Final", color: "var(--chart-4)" },
} satisfies ChartConfig;

const CHART_FRAME_CLASS = "aspect-auto h-72 w-full min-w-0";

export function ProfitBridgeChart({
  sankey,
  compact = false,
}: {
  sankey: DashboardSankeyPayload;
  compact?: boolean;
}) {
  const { ref, tier, isCompact } = useContainerWidth<HTMLDivElement>();
  const summary = buildSankeyBridgeSummary(sankey);
  const stages = buildProfitBridgeStages(sankey, summary);
  const rows = stages.map((stage, index) => {
    const previous = index === 0 ? 0 : stages[index - 1]?.cumulative ?? 0;
    const start = stage.delta === null ? 0 : Math.min(previous, previous + stage.delta);
    const deltaValue = stage.delta === null ? Math.abs(stage.value) : Math.abs(stage.delta);
    const stageType = stage.kind === "subtotal" ? "subtotal" : stage.kind;
    return {
      id: stage.id,
      label: stage.label,
      shortLabel: stage.shortLabel,
      stageType,
      start,
      deltaValue,
      value: stage.value,
      pctOfGross: stage.pctOfGross,
    };
  });

  const useHorizontalLayout = isCompact;
  const xAngle = useHorizontalLayout ? 0 : chartXAxisAngle(tier, rows.length);
  const yAxisWidth = chartYAxisWidth(tier);
  const bottomMargin = useHorizontalLayout ? 8 : chartBottomMargin(tier, xAngle !== 0);
  const valueAxisFormatter = tier === "wide" ? formatIDR : formatIDRCompact;

  return (
    <div className="space-y-4" data-testid="profit-bridge-chart">
      <div
        ref={ref}
        className="min-w-0 rounded-xl border border-border/80 bg-gradient-to-b from-muted/20 to-background p-3"
      >
        <ChartContainer
          config={chartConfig}
          className={CHART_FRAME_CLASS}
          aria-label="Profit bridge waterfall"
        >
          <ComposedChart
            data={rows}
            layout={useHorizontalLayout ? "vertical" : "horizontal"}
            accessibilityLayer
            margin={{ top: 16, right: 12, left: useHorizontalLayout ? 4 : 8, bottom: bottomMargin }}
          >
            <CartesianGrid vertical={!useHorizontalLayout} horizontal={useHorizontalLayout} />
            {useHorizontalLayout ? (
              <>
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => valueAxisFormatter(value)}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="shortLabel"
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tick={{ fontSize: 10 }}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="shortLabel"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={xAngle}
                  textAnchor={xAngle === 0 ? "middle" : "end"}
                  height={xAngle === 0 ? 30 : 56}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => valueAxisFormatter(value)}
                  width={yAxisWidth}
                  tick={{ fontSize: 10 }}
                />
              </>
            )}
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { label?: string } | undefined;
                    return row?.label ?? "";
                  }}
                  formatter={(value) => (
                    <span className="tabular-money font-medium text-foreground">
                      {formatIDR(Number(value))}
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="start" stackId="waterfall" fill="transparent" isAnimationActive={false} />
            <Bar
              dataKey="deltaValue"
              stackId="waterfall"
              radius={3}
              isAnimationActive={false}
              fill="var(--color-subtotal)"
            >
              {rows.map((row) => (
                <Cell key={row.id} fill={`var(--color-${row.stageType})`} />
              ))}
              {!useHorizontalLayout ? (
                <LabelList
                  dataKey="pctOfGross"
                  position="top"
                  formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`}
                  className="fill-muted-foreground text-[10px]"
                />
              ) : null}
            </Bar>
          </ComposedChart>
        </ChartContainer>
        {useHorizontalLayout ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Layout horizontal untuk layar sempit — hover bar untuk label lengkap.
          </p>
        ) : null}
      </div>

      <div className={compact ? "sr-only" : "rounded-lg border border-border/70"}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tahap</TableHead>
              <TableHead className="text-right">Nilai (IDR)</TableHead>
              <TableHead className="text-right">% dari gross</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.map((stage) => (
              <TableRow key={stage.id}>
                <TableCell>{stage.label}</TableCell>
                <TableCell className="tabular-money text-right">
                  {formatIDR(stage.value)}
                </TableCell>
                <TableCell className="tabular-money text-right">
                  {stage.pctOfGross.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
