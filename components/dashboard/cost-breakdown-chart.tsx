"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartLegend,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContainerWidth } from "@/hooks/use-container-width";
import type { DashboardCostingData } from "@/lib/dashboard-contract";
import {
  buildCostBreakdownRows,
  type CostBreakdownGroup,
} from "@/lib/dashboard-ui-mappers";
import { formatIDR } from "@/lib/utils/format";

const SEGMENT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const chartConfig = {
  value: { label: "Nilai biaya" },
} satisfies ChartConfig;

export function CostBreakdownChart({
  costingData,
  compact = false,
}: {
  costingData: DashboardCostingData;
  compact?: boolean;
}) {
  const { ref, isCompact } = useContainerWidth<HTMLDivElement>();
  const [groupBy, setGroupBy] = useState<CostBreakdownGroup>("subAssembly");
  const breakdown = useMemo(
    () => buildCostBreakdownRows(costingData.rawContributions, groupBy),
    [costingData.rawContributions, groupBy]
  );

  if (breakdown.rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada kontribusi biaya material untuk breakdown.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="cost-breakdown-chart">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Top contributors dengan tail di bawah 3% digabung ke &quot;Other&quot;.
        </p>
        <Tabs
          value={groupBy}
          onValueChange={(value) => setGroupBy(value as CostBreakdownGroup)}
        >
          <TabsList className="grid h-8 w-full max-w-[280px] grid-cols-2">
            <TabsTrigger value="subAssembly" className="text-xs">
              Sub-assembly
            </TabsTrigger>
            <TabsTrigger value="rawCategory" className="text-xs">
              Raw category
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div
        ref={ref}
        className="min-w-0 rounded-xl border border-border/80 bg-gradient-to-b from-muted/20 to-background p-3"
        aria-label="Cost breakdown donut"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-foreground">Total HPP material</span>
          <span className="tabular-money text-muted-foreground">{formatIDR(breakdown.total)}</span>
        </div>
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full min-w-0">
          <PieChart accessibilityLayer>
            <Pie
              data={breakdown.rows}
              dataKey="value"
              nameKey="label"
              innerRadius={isCompact ? 48 : 70}
              outerRadius={isCompact ? 72 : 100}
              paddingAngle={2}
            >
              {breakdown.rows.map((row, index) => (
                <Cell
                  key={row.key}
                  fill={row.isOther ? "hsl(var(--muted-foreground))" : SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="max-w-[10rem] truncate">{String(name)}</span>
                      <span className="tabular-money font-medium">{formatIDR(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
          </PieChart>
        </ChartContainer>
        <ul className="mt-3 flex flex-col gap-1.5 text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-3">
          {breakdown.rows.map((row, index) => (
            <li key={row.key} className="flex min-w-0 items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: row.isOther
                    ? "hsl(var(--muted-foreground))"
                    : SEGMENT_COLORS[index % SEGMENT_COLORS.length],
                }}
                aria-hidden
              />
              <span className="truncate">{row.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={compact ? "sr-only" : "rounded-lg border border-border/70"}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {groupBy === "subAssembly" ? "Sub-assembly" : "Raw category"}
              </TableHead>
              <TableHead className="text-right">Nilai (IDR)</TableHead>
              <TableHead className="text-right">% dari total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>{row.label}</TableCell>
                <TableCell className="tabular-money text-right">
                  {formatIDR(row.value)}
                </TableCell>
                <TableCell className="tabular-money text-right">
                  {row.pct.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
