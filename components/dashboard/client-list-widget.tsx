"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChartInsightBlock } from "@/components/dashboard/chart-insight-block";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canSeeNavHref } from "@/lib/permissions";
import { useCostingStore } from "@/store/costingStore";

type ClientRow = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string | null;
};

const PREVIEW_ROWS = 5;

function ClientTable({
  rows,
  showEmail = false,
}: {
  rows: ClientRow[];
  showEmail?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-none border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("common.company")}</TableHead>
            <TableHead>{t("common.phone")}</TableHead>
            {showEmail ? <TableHead>{t("common.email")}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="max-w-[12rem] truncate font-medium">
                {c.name}
              </TableCell>
              <TableCell className="max-w-[12rem] truncate">
                {c.company || "—"}
              </TableCell>
              <TableCell>{c.phone || "—"}</TableCell>
              {showEmail ? (
                <TableCell className="max-w-[14rem] truncate">
                  {c.email || "—"}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ClientListWidget() {
  const { t } = useI18n();
  const router = useRouter();
  const role = useCostingStore((s) => s.role);
  const permissions = useCostingStore((s) => s.permissions);
  const allowed = canSeeNavHref("/customers", role, permissions);

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setFailed(false);
      try {
        const r = await fetch("/api/customers", { signal });
        if (!r.ok) throw new Error("load failed");
        setRows((await r.json()) as ClientRow[]);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setFailed(true);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [allowed, load]);

  if (!allowed) return null;

  const visibleRows = rows.slice(0, PREVIEW_ROWS);
  const hiddenCount = Math.max(0, rows.length - PREVIEW_ROWS);

  return (
    <section aria-label={t("clients.listLabel")} data-testid="dashboard-clients">
      <ChartInsightBlock
        title={t("clients.title")}
        loading={loading}
        detailTitle={t("clients.listLabel")}
        detailDescription={t("clients.detailDescription")}
        detailContent={<ClientTable rows={rows} showEmail />}
      >
        {failed ? (
          <EmptyState
            icon={Users}
            title={t("clients.loadFailed")}
            actionLabel={t("common.retry")}
            onAction={() => void load(new AbortController().signal)}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("clients.emptyTitle")}
            description={t("clients.emptyDescription")}
            actionLabel={t("clients.manage")}
            onAction={() => router.push("/customers")}
          />
        ) : (
          <div className="space-y-3">
            <ClientTable rows={visibleRows} />
            {hiddenCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("clients.moreHidden", { count: hiddenCount })}
              </p>
            ) : null}
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/customers">{t("clients.manage")}</Link>
            </Button>
          </div>
        )}
      </ChartInsightBlock>
    </section>
  );
}
