"use client";

import { useI18n } from "@/components/i18n-provider";
import { DotNumber } from "@/components/dot/dot-number";
import { Sparkline } from "@/components/dot/sparkline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PersonalKpi = {
  key: string;
  title: string;
  value: string;
  note: string;
  trend?: { data: number[]; direction: "up" | "down" | "flat" } | null;
};

function KpiBody({ item, size = "lg" }: { item: PersonalKpi; size?: "lg" | "md" }) {
  const { t } = useI18n();
  const trend = item.trend && item.trend.direction !== "flat" ? { ...item.trend, direction: item.trend.direction } : null;
  const moving = trend !== null;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <DotNumber className={size === "lg" ? "text-3xl sm:text-4xl" : "text-xl whitespace-nowrap sm:text-3xl"}>
          {item.value}
        </DotNumber>
        {trend ? (
          <Sparkline
            data={trend.data}
            tone={trend.direction === "up" ? "positive" : "signal"}
            direction={trend.direction}
            className="w-16 shrink-0"
          />
        ) : null}
      </div>
      {moving || item.note ? (
        <p className={cn("text-sm text-muted-foreground", item.trend?.direction === "down" && "text-signal")}>
          {trend
            ? `${t(trend.direction === "up" ? "dashboard.personal.kpi.up" : "dashboard.personal.kpi.down")}${item.note ? " · " : ""}`
            : ""}
          {item.note}
        </p>
      ) : null}
    </>
  );
}

/**
 * card: four KPI cards in a grid. strip: the same figures as one divided row,
 * for use inside the dashboard overview card.
 */
export function PersonalKpis({ items, variant = "card" }: { items: PersonalKpi[]; variant?: "card" | "strip" }) {
  if (variant === "strip") {
    return (
      <section
        className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border 2xl:grid-cols-4"
        data-testid="dashboard-hero-kpis"
        data-tour="dashboard.kpi"
      >
        {items.map((item) => (
          <div key={item.key} className="flex min-w-0 flex-col gap-2 bg-card p-4">
            <CardTitle className="text-xs">{item.title}</CardTitle>
            <KpiBody item={item} size="md" />
          </div>
        ))}
      </section>
    );
  }
  return (
    <section
      className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      data-testid="dashboard-hero-kpis"
    >
      {items.map((item) => (
        <Card key={item.key} size="sm">
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <KpiBody item={item} />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
