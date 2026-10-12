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

export function PersonalKpis({ items }: { items: PersonalKpi[] }) {
  const { t } = useI18n();
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
            <div className="flex items-end justify-between gap-3">
              <DotNumber className="text-3xl sm:text-4xl">{item.value}</DotNumber>
              {item.trend && item.trend.direction !== "flat" ? (
                <Sparkline
                  data={item.trend.data}
                  tone={item.trend.direction === "up" ? "positive" : "signal"}
                  direction={item.trend.direction}
                  className="w-16 shrink-0"
                />
              ) : null}
            </div>
            <p
              className={cn(
                "text-sm text-muted-foreground",
                item.trend?.direction === "down" && "text-signal"
              )}
            >
              {item.trend && item.trend.direction !== "flat"
                ? `${t(item.trend.direction === "up" ? "dashboard.personal.kpi.up" : "dashboard.personal.kpi.down")} · `
                : ""}
              {item.note}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
