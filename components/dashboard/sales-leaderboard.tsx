"use client";

import { useI18n } from "@/components/i18n-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardSalesLeaderboard } from "@/lib/dashboard-contract";
import { formatIDR, formatPercent } from "@/lib/utils/format";

export function SalesLeaderboard({
  data,
  maxRows,
}: {
  data: DashboardSalesLeaderboard;
  /** Limit visible rows for inline summary; full list in detail sheet. */
  maxRows?: number;
}) {
  const { t } = useI18n();

  if (data.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("dashboard.leaderboard.empty")}</p>;
  }

  const principalLabel = data.mode === "salesman" ? t("common.salesman") : t("common.client");
  const visibleRows = maxRows ? data.rows.slice(0, maxRows) : data.rows;
  const hiddenCount = maxRows ? Math.max(0, data.rows.length - maxRows) : 0;

  return (
    <div className="space-y-3" data-testid="sales-leaderboard">
      <p className="text-xs text-muted-foreground">
        {data.mode === "salesman"
          ? t("dashboard.leaderboard.bySalesman")
          : t("dashboard.leaderboard.byClient")}
      </p>
      <div className="rounded-none border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{principalLabel}</TableHead>
              <TableHead className="text-right">{t("dashboard.leaderboard.booked")}</TableHead>
              <TableHead className="text-right">{t("dashboard.leaderboard.winRate")}</TableHead>
              <TableHead className="text-right">{t("dashboard.leaderboard.avgMargin")}</TableHead>
              <TableHead className="text-right">{t("dashboard.leaderboard.pipeline")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.principal}>
                <TableCell className="max-w-[14rem] truncate">{row.principal}</TableCell>
                <TableCell className="tabular-money text-right">{formatIDR(row.bookedRevenue)}</TableCell>
                <TableCell className="tabular-money text-right">{formatPercent(row.winRatePct)}</TableCell>
                <TableCell className="tabular-money text-right">{formatPercent(row.avgMarginPct)}</TableCell>
                <TableCell className="tabular-money text-right">{formatIDR(row.pipelineValue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {hiddenCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          +{hiddenCount} lainnya — buka &quot;Lihat detail&quot; untuk daftar lengkap.
        </p>
      ) : null}
    </div>
  );
}
