"use client";

import {
  BadgeCheck,
  ClipboardList,
  DollarSign,
  FolderKanban,
  LineChart,
  Percent,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CostingSankeyChart } from "@/components/dashboard/costing-sankey-chart";
import { EmptyState } from "@/components/empty-state";
import { TableLoadingSkeleton } from "@/components/table-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DashboardApiResponse } from "@/lib/dashboard-contract";
import {
  buildCashflowAssumptionNote,
  buildRevenueScale,
} from "@/lib/dashboard-ui-mappers";
import { formatIDR, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

function LoadingRows() {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <div className="h-3 w-36 animate-pulse rounded bg-muted" />
          <div className="h-5 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function SankeyHero({
  sankey,
  costingData,
  loading,
  onOpenCosting,
  selectedProjectId,
  scopeOptions,
  onScopeChange,
}: {
  sankey: DashboardApiResponse["sankey"] | null;
  costingData: DashboardApiResponse["costingData"] | null;
  loading: boolean;
  onOpenCosting: () => void;
  selectedProjectId: string | null;
  scopeOptions: DashboardApiResponse["projectScope"]["options"];
  onScopeChange: (projectId: string | null) => void;
}) {
  if (loading) {
    return <LoadingRows />;
  }
  if (!costingData || !sankey || sankey.links.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Sankey belum tersedia"
        description="Tambahkan data costing dan quotation untuk melihat aliran biaya end-to-end."
        actionLabel="Buka Costing"
        onAction={onOpenCosting}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">Scope:</span>
          <Select
            value={selectedProjectId ?? "__all__"}
            onValueChange={(value) => onScopeChange(value === "__all__" ? null : value)}
          >
            <SelectTrigger className="h-7 border-none bg-transparent px-2 py-0 text-xs shadow-none focus:ring-0">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Projects</SelectItem>
              {scopeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricBadge
          label="Gross Total (before discount/tax)"
          value={formatIDR(costingData.grossTotal)}
          tone="neutral"
        />
        <MetricBadge
          label="HPP (Harga Pokok Penjualan)"
          value={formatIDR(costingData.hpp)}
          tone="positive"
        />
        <MetricBadge label="Discount" value={formatIDR(costingData.discount)} tone="warning" />
        <MetricBadge label="Net Selling Price" value={formatIDR(costingData.netSelling)} tone="neutral" />
        <MetricBadge label="Grand Total / Selling Price" value={formatIDR(costingData.grandTotal)} tone="neutral" />
      </div>

      <div className="rounded-xl border border-border/80 bg-gradient-to-b from-muted/20 to-background p-3">
        <p className="mb-3 text-xs text-muted-foreground">
          Structured flow ({sankey.range === "last30d" ? "last 30 days" : "all time"}) · level 1 raw nodes {"->"} level 5 final output.
        </p>
        <CostingSankeyChart costingData={costingData} />
      </div>

      <p className="text-xs text-muted-foreground">
        PPN + PPH to final output:{" "}
        <span className="tabular-money font-semibold text-foreground">
          {formatIDR(costingData.ppn + costingData.pph)}
        </span>
      </p>
    </div>
  );
}

function MetricBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5",
        tone === "positive" && "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20",
        tone === "warning" && "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
        tone === "neutral" && "border-border/70"
      )}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="tabular-money mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function RevenueTrendPanel({
  data,
  loading,
  onOpenCosting,
}: {
  data: DashboardApiResponse["revenueTrend"] | null;
  loading: boolean;
  onOpenCosting: () => void;
}) {
  if (loading) return <LoadingRows />;
  if (!data || data.series.length === 0) {
    return (
      <EmptyState
        icon={LineChart}
        title="Revenue trend kosong"
        description="Belum ada quotation untuk membentuk tren pendapatan."
        actionLabel="Buka Costing"
        onAction={onOpenCosting}
      />
    );
  }

  const scale = buildRevenueScale(data.series);
  const rows = scale.rows.slice(-6);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-blue-600" />
          Booked (net, excl. tax)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-slate-400" />
          Potential (draft)
        </span>
      </div>
      {rows.map((point) => (
        <div key={point.month} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">{point.month}</span>
            <span className="tabular-money text-muted-foreground">
              B {formatIDR(point.bookedRevenue)} | P {formatIDR(point.potentialRevenue)}
            </span>
          </div>
          <div className="space-y-1">
            <div className="h-2 rounded bg-muted">
              <div className="h-2 rounded bg-blue-600" style={{ width: `${Math.max(2, point.bookedPct)}%` }} />
            </div>
            <div className="h-2 rounded bg-muted">
              <div
                className="h-2 rounded bg-slate-400"
                style={{ width: `${Math.max(2, point.potentialPct)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CashflowPanel({
  data,
  loading,
  onOpenCosting,
}: {
  data: DashboardApiResponse["cashflowProjection"] | null;
  loading: boolean;
  onOpenCosting: () => void;
}) {
  if (loading) return <LoadingRows />;
  if (!data || data.series.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Proyeksi cashflow kosong"
        description="Belum ada quotation booked untuk memproyeksikan arus kas."
        actionLabel="Buka Costing"
        onAction={onOpenCosting}
      />
    );
  }
  const rows = data.series.slice(0, 6);
  const maxValue = Math.max(
    1,
    ...rows.map((row) => Math.max(Math.abs(row.projectedIn), Math.abs(row.projectedOut), Math.abs(row.projectedNet)))
  );

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.month} className="rounded-lg border border-border/60 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">{row.month}</span>
            <span className={cn("tabular-money font-semibold", row.projectedNet >= 0 ? "text-emerald-600" : "text-rose-600")}>
              Net {formatIDR(row.projectedNet)}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <FlowBar label="Projected In (net collection)" value={row.projectedIn} maxValue={maxValue} color="bg-blue-600" />
            <FlowBar label="Projected Out (cost payout)" value={row.projectedOut} maxValue={maxValue} color="bg-slate-500" />
          </div>
        </div>
      ))}
      <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
        {buildCashflowAssumptionNote(data)} Projected cashflow only; not actual invoice collection.
      </div>
    </div>
  );
}

function FlowBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-money text-foreground">{formatIDR(value)}</span>
      </div>
      <div className="h-2 rounded bg-muted">
        <div className={cn("h-2 rounded", color)} style={{ width: `${Math.max(2, (Math.abs(value) / maxValue) * 100)}%` }} />
      </div>
    </div>
  );
}

function TopDriversPanel({
  data,
  loading,
  onOpenCosting,
}: {
  data: DashboardApiResponse["topDrivers"] | null;
  loading: boolean;
  onOpenCosting: () => void;
}) {
  if (loading) {
    return <TableLoadingSkeleton columns={3} rows={5} />;
  }
  if (
    !data ||
    (data.topGrossProfitProjects.length === 0 && data.topMarginErosionProjects.length === 0)
  ) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Top drivers belum tersedia"
        description="Belum cukup data untuk menampilkan pendorong profit dan erosi margin."
        actionLabel="Buka Costing"
        onAction={onOpenCosting}
      />
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2 rounded-lg border border-border/60 p-3">
        <p className="text-xs font-medium text-muted-foreground">Top Gross Profit Projects</p>
        {data.topGrossProfitProjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Tidak ada data gross profit.</p>
        ) : (
          data.topGrossProfitProjects.map((driver) => (
            <div key={driver.projectId} className="rounded border border-border/50 p-2">
              <p className="truncate text-sm font-medium text-foreground">{driver.projectName}</p>
              <p className="tabular-money mt-1 text-xs text-emerald-600">
                Gross {formatIDR(driver.grossProfit)} ({formatPercent(driver.grossMarginPct)})
              </p>
            </div>
          ))
        )}
      </div>
      <div className="space-y-2 rounded-lg border border-border/60 p-3">
        <p className="text-xs font-medium text-muted-foreground">Top Margin Erosion Projects</p>
        {data.topMarginErosionProjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Tidak ada data margin erosion.</p>
        ) : (
          data.topMarginErosionProjects.map((driver) => (
            <div key={driver.projectId} className="rounded border border-border/50 p-2">
              <p className="truncate text-sm font-medium text-foreground">{driver.projectName}</p>
              <p className="tabular-money mt-1 text-xs text-rose-600">
                Erosion {formatIDR(driver.erosionValue)} ({formatPercent(driver.erosionPct)})
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const goToCosting = useCallback(() => {
    router.push("/costing");
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = selectedProjectId
        ? `?projectId=${encodeURIComponent(selectedProjectId)}`
        : "";
      const r = await fetch(`/api/dashboard${query}`);
      if (!r.ok) throw new Error("Gagal memuat dashboard");
      const payload = (await r.json()) as DashboardApiResponse;
      setData(payload);
      if (payload.projectScope.selectedProjectId !== selectedProjectId) {
        setSelectedProjectId(payload.projectScope.selectedProjectId);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuat";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

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
    approvedQuotation: 0,
    weightedGrossMarginPct: 0,
    discountLeakageValue: 0,
    bookedRevenueMtd: 0,
    bookedRevenueYtd: 0,
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
      label: "Approved Quotation",
      value: kpis.approvedQuotation,
      icon: BadgeCheck,
    },
    {
      label: "Weighted Gross Margin",
      value: formatPercent(kpis.weightedGrossMarginPct),
      icon: Percent,
    },
    {
      label: "Discount Leakage",
      value: formatIDR(kpis.discountLeakageValue),
      icon: TrendingDown,
    },
    {
      label: "Booked Revenue MTD (net)",
      value: formatIDR(kpis.bookedRevenueMtd),
      icon: TrendingUp,
    },
    {
      label: "Booked Revenue YTD (net)",
      value: formatIDR(kpis.bookedRevenueYtd),
      icon: DollarSign,
    },
  ] as const;

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

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          {error}. Menampilkan data terakhir yang tersedia.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border">
            <CardContent className="p-4">
              <Icon className="size-5 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
              <p className="tabular-money mt-1 text-xl font-bold text-foreground 2xl:text-2xl">
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

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hero Sankey Profit Bridge</CardTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Rekonsiliasi gross selling, net commercial, dan komponen tax.
          </p>
        </CardHeader>
        <CardContent>
          <SankeyHero
            sankey={data?.sankey ?? null}
            costingData={data?.costingData ?? null}
            loading={loading}
            onOpenCosting={goToCosting}
            selectedProjectId={selectedProjectId}
            scopeOptions={data?.projectScope.options ?? []}
            onScopeChange={setSelectedProjectId}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <p className="text-xs font-normal text-muted-foreground">
              Tren monthly booked vs potential revenue (nilai net, sebelum tax).
            </p>
          </CardHeader>
          <CardContent>
            <RevenueTrendPanel
              data={data?.revenueTrend ?? null}
              loading={loading}
              onOpenCosting={goToCosting}
            />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cashflow Projection</CardTitle>
            <p className="text-xs font-normal text-muted-foreground">
              Proyeksi cash-in/cash-out berdasarkan payment terms (assumption-based).
            </p>
          </CardHeader>
          <CardContent>
            <CashflowPanel
              data={data?.cashflowProjection ?? null}
              loading={loading}
              onOpenCosting={goToCosting}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Drivers</CardTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Kontributor utama gross profit dan margin erosion.
          </p>
        </CardHeader>
        <CardContent>
          <TopDriversPanel data={data?.topDrivers ?? null} loading={loading} onOpenCosting={goToCosting} />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/costing" className="text-primary underline-offset-4 hover:underline">
          Costing
        </Link>
        {" · "}
        <Link href="/documentation" className="text-primary underline-offset-4 hover:underline">
          Documentation
        </Link>
      </p>
    </div>
  );
}
