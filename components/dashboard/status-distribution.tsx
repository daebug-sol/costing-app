"use client";

import { DotMeter } from "@/components/dot/dot-meter";
import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/components/i18n-provider";
import type { DashboardStatusDistribution } from "@/lib/dashboard-contract";
import { formatIDR } from "@/lib/utils/format";

type Mode = "quotation" | "project";

export function StatusDistribution({ data }: { data: DashboardStatusDistribution }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("quotation");
  const rows = useMemo(
    () => (mode === "quotation" ? data.quotationStatus : data.projectStatus),
    [data.projectStatus, data.quotationStatus, mode]
  );

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("dashboard.statusDistribution.empty")}</p>;
  }

  return (
    <div className="space-y-3" data-testid="status-distribution">
      <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
        <TabsList className="grid h-8 w-full max-w-[260px] grid-cols-2">
          <TabsTrigger value="quotation" className="text-xs">
            {t("common.quotation")}
          </TabsTrigger>
          <TabsTrigger value="project" className="text-xs">
            {t("common.project")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ul className="flex flex-col gap-3" aria-label={t("dashboard.statusDistribution.title")}>
        {rows.map((row) => {
          const share = total > 0 ? (row.count / total) * 100 : 0;
          return (
            <li key={row.status} className="flex flex-col gap-1">
              <div className="flex min-w-0 items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate capitalize">{row.status}</span>
                <span className="tabular-money shrink-0 text-muted-foreground">
                  {row.count} · {Math.round(share)}%
                </span>
              </div>
              <DotMeter
                value={share}
                cols={32}
                label={`${row.status}: ${Math.round(share)}%`}
              />
            </li>
          );
        })}
      </ul>

      <div className="rounded-none border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.count")}</TableHead>
              <TableHead className="text-right">{t("common.value")}</TableHead>
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
