"use client";

import {
  BadgeCheck,
  ClipboardList,
  FolderKanban,
  RefreshCw,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { TableLoadingSkeleton } from "@/components/table-loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIDR, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  ahuModel: string | null;
  flowCMH: number | null;
  totalHPP: number;
  totalSelling: number;
};

type DashboardPayload = {
  kpis: {
    totalProjects: number;
    activeCosting: number;
    pendingQuotation: number;
    approved: number;
  };
  recentProjects: ProjectRow[];
  chartProjects: ProjectRow[];
};

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "finalized" || s === "final")
    return <Badge className="bg-emerald-600">Finalized</Badge>;
  if (s === "draft") return <Badge variant="secondary">Draft</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function CostOverviewChart({ projects }: { projects: ProjectRow[] }) {
  const maxVal = useMemo(() => {
    let m = 1;
    for (const p of projects) {
      m = Math.max(m, p.totalHPP, p.totalSelling);
    }
    return m;
  }, [projects]);

  const barW = (v: number) => `${Math.max(4, (v / maxVal) * 100)}%`;

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Belum ada data proyek"
        description="Buat proyek costing untuk melihat perbandingan HPP vs selling."
        actionLabel="Buka Costing"
        onAction={() => {
          window.location.href = "/costing";
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((p) => (
        <div key={p.id} className="space-y-1.5">
          <p className="truncate text-xs font-medium text-foreground" title={p.name}>
            {p.name}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[10px] text-muted-foreground">HPP</span>
              <div className="h-5 min-w-0 flex-1 rounded bg-muted">
                <div
                  className="h-full rounded bg-muted-foreground/50 transition-all"
                  style={{ width: barW(p.totalHPP) }}
                  title={`HPP: ${formatIDR(p.totalHPP)}`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[10px] text-muted-foreground">
                Sell
              </span>
              <div className="h-5 min-w-0 flex-1 rounded bg-muted">
                <div
                  className="h-full rounded bg-blue-600 transition-all"
                  style={{ width: barW(p.totalSelling) }}
                  title={`Selling: ${formatIDR(p.totalSelling)}`}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/dashboard");
      if (!r.ok) throw new Error("Gagal memuat dashboard");
      setData(await r.json());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuat";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-foreground">{error}</p>
        <Button type="button" className="mt-4 gap-2" onClick={() => void load()}>
          <RefreshCw className="size-4" />
          Coba lagi
        </Button>
      </div>
    );
  }

  const kpis = data?.kpis ?? {
    totalProjects: 0,
    activeCosting: 0,
    pendingQuotation: 0,
    approved: 0,
  };

  const cards = [
    {
      label: "Total Projects",
      value: kpis.totalProjects,
      icon: FolderKanban,
    },
    {
      label: "Active Costing",
      value: kpis.activeCosting,
      icon: ClipboardList,
    },
    {
      label: "Pending Quotation",
      value: kpis.pendingQuotation,
      icon: Wallet,
    },
    {
      label: "Approved",
      value: kpis.approved,
      icon: BadgeCheck,
    },
  ] as const;

  const recent = data?.recentProjects ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ringkasan proyek dan penawaran
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border">
            <CardContent className="p-4">
              <Icon className="size-5 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
              <p className="tabular-money mt-1 text-3xl font-bold text-foreground">
                {loading ? (
                  <span className="inline-block h-9 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  value
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <Card className="border-border lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Projects</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-4">
                  <TableLoadingSkeleton columns={6} rows={5} />
                </div>
              ) : recent.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="Belum ada proyek"
                  description="Mulai dengan membuat proyek costing baru."
                  actionLabel="Buka Costing"
                  onAction={() => router.push("/costing")}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Project Name</TableHead>
                      <TableHead>AHU Model</TableHead>
                      <TableHead className="text-right">Flow CMH</TableHead>
                      <TableHead className="text-right">HPP (IDR)</TableHead>
                      <TableHead className="text-right">
                        Selling Price (IDR)
                      </TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((p) => (
                      <TableRow
                        key={p.id}
                        className={cn("cursor-pointer", "hover:bg-muted/50")}
                        onClick={() =>
                          router.push(`/costing?project=${encodeURIComponent(p.id)}`)
                        }
                      >
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.ahuModel ?? "—"}
                        </TableCell>
                        <TableCell className="tabular-money text-right">
                          {p.flowCMH != null ? formatNumber(p.flowCMH, 0) : "—"}
                        </TableCell>
                        <TableCell className="tabular-money text-right">
                          {formatIDR(p.totalHPP)}
                        </TableCell>
                        <TableCell className="tabular-money text-right font-medium text-foreground">
                          {formatIDR(p.totalSelling)}
                        </TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cost Overview</CardTitle>
            <p className="text-xs font-normal text-muted-foreground">
              HPP vs selling — 5 proyek terbaru
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 py-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-5 animate-pulse rounded bg-muted" />
                    <div className="h-5 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <CostOverviewChart projects={data?.chartProjects ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/costing" className="text-blue-600 hover:underline">
          Costing
        </Link>
        {" · "}
        <Link href="/documentation" className="text-blue-600 hover:underline">
          Documentation
        </Link>
      </p>
    </div>
  );
}
