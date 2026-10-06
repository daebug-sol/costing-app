"use client";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardQuotationAging } from "@/lib/dashboard-contract";
import { formatIDR } from "@/lib/utils/format";

function statusVariant(status: string): "secondary" | "outline" {
  return status === "approved" ? "secondary" : "outline";
}

export function QuotationAgingTable({ data }: { data: DashboardQuotationAging }) {
  const { t } = useI18n();

  if (data.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("dashboard.aging.empty")}</p>;
  }

  return (
    <div className="space-y-3" data-testid="quotation-aging-table">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{t("dashboard.aging.totalAnalyzed", { count: data.rows.length })}</span>
        <span>{t("dashboard.aging.expiredCount", { count: data.expiredCount })}</span>
      </div>
      <div className="rounded-none border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.client")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("dashboard.aging.expired")}</TableHead>
              <TableHead className="text-right">{t("dashboard.aging.validity")}</TableHead>
              <TableHead className="text-right">{t("dashboard.aging.net")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.quotationId}>
                <TableCell className="max-w-[14rem] truncate">{row.clientLabel}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  {row.isExpired ? (
                    <span className="ml-2 text-xs font-medium text-rose-600">{t("dashboard.aging.validityExpired")}</span>
                  ) : null}
                </TableCell>
                <TableCell className="tabular-money text-right">{row.ageDays} hari</TableCell>
                <TableCell className="tabular-money text-right">{row.validityDays} hari</TableCell>
                <TableCell className="tabular-money text-right">{formatIDR(row.totalAfterDisc)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
