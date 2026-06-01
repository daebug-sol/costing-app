"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContainerWidth } from "@/hooks/use-container-width";
import type { DashboardStatusDistribution } from "@/lib/dashboard-contract";
import { formatIDR } from "@/lib/utils/format";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const chartConfig = {
  value: { label: "Nilai" },
} satisfies ChartConfig;

type Mode = "quotation" | "project";

export function StatusDistribution({ data }: { data: DashboardStatusDistribution }) {
  const { ref, isCompact } = useContainerWidth<HTMLDivElement>();
  const [mode, setMode] = useState<Mode>("quotation");
  const rows = useMemo(
    () => (mode === "quotation" ? data.quotationStatus : data.projectStatus),
    [data.projectStatus, data.quotationStatus, mode]
  );

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada data status untuk periode ini.</p>;
  }

  return (
    <div className="space-y-3" data-testid="status-distribution">
      <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
        <TabsList className="grid h-8 w-full max-w-[260px] grid-cols-2">
          <TabsTrigger value="quotation" className="text-xs">
            Quotation
          </TabsTrigger>
          <TabsTrigger value="project" className="text-xs">
            Proyek
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div
        ref={ref}
        className="min-w-0 rounded-none border border-border/80 bg-gradient-to-b from-muted/20 to-background p-3"
      >
        <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full min-w-0">
          <PieChart accessibilityLayer>
            <Pie
              data={rows}
              dataKey="count"
              nameKey="status"
              innerRadius={isCompact ? 44 : 58}
              outerRadius={isCompact ? 68 : 95}
              paddingAngle={2}
            >
              {rows.map((row, index) => (
                <Cell key={row.status} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => (
                    <div className="flex w-full flex-col gap-0.5">
                      <span>{String(name)}</span>
                      <span className="tabular-money">{Number(value)} item</span>
                      <span className="tabular-money text-muted-foreground">
                        {formatIDR(Number(item.payload?.value ?? 0))}
                      </span>
                    </div>
                  )}
                />
              }
            />
          </PieChart>
        </ChartContainer>
        <ul className="mt-3 flex flex-col gap-1 text-[11px] text-muted-foreground">
          {rows.map((row, index) => (
            <li key={row.status} className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate capitalize">{row.status}</span>
              <span className="tabular-money shrink-0">{row.count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-none border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Nilai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.status}>
                <TableCell className="capitalize">{row.status}</TableCell>
                <TableCell className="tabular-money text-right">{row.count}</TableCell>
                <TableCell className="tabular-money text-right">{formatIDR(row.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
