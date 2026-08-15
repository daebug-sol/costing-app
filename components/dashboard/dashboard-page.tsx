"use client";

import { RefreshCw, Wallet } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartInsightBlock } from "@/components/dashboard/chart-insight-block";
import { ClientListWidget } from "@/components/dashboard/client-list-widget";
import { DashboardStickyToolbar } from "@/components/dashboard/dashboard-sticky-toolbar";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { dashboardSegmentClass } from "@/components/dashboard/dashboard-surface-styles";
import { useDashboardToolbarStuck } from "@/hooks/use-dashboard-toolbar-stuck";
import { KpiStatCard } from "@/components/dashboard/kpi-stat-card";
import { QuotationAgingTable } from "@/components/dashboard/quotation-aging-table";
import { QuotationFunnel } from "@/components/dashboard/quotation-funnel";
import { SalesLeaderboard } from "@/components/dashboard/sales-leaderboard";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { TableLoadingSkeleton } from "@/components/table-loading-skeleton";
import { Button } from "@/components/ui/button";
import { PillTabsList, PillTabsTrigger } from "@/components/ui/pill-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { DashboardApiResponse, DashboardRange } from "@/lib/dashboard-contract";
import { buildMtdBookedDelta, buildTrendDelta, buildYtdBookedDelta } from "@/lib/dashboard-ui-mappers";
import { cn } from "@/lib/utils";
import { formatIDR, formatPercent } from "@/lib/utils/format";

const chartPaneFallback = (
  <div className="flex min-h-[180px] items-center justify-center">
    <TableLoadingSkeleton columns={3} rows={3} />
  </div>
);

const CashflowTimelineChart = dynamic(
  () =>
    import("@/components/dashboard/cashflow-timeline-chart").then((m) => ({
      default: m.CashflowTimelineChart,
    })),
  { ssr: false, loading: () => chartPaneFallback }
);
const CostBreakdownChart = dynamic(
  () =>
    import("@/components/dashboard/cost-breakdown-chart").then((m) => ({
      default: m.CostBreakdownChart,
    })),
  { ssr: false, loading: () => chartPaneFallback }
);
const ProfitBridgeChart = dynamic(
  () =>
    import("@/components/dashboard/profit-bridge-chart").then((m) => ({
      default: m.ProfitBridgeChart,
    })),
  { ssr: false, loading: () => chartPaneFallback }
);
const RevenueTrendChart = dynamic(
  () =>
    import("@/components/dashboard/revenue-trend-chart").then((m) => ({
      default: m.RevenueTrendChart,
    })),
  { ssr: false, loading: () => chartPaneFallback }
);

const SECONDARY_KPI_LABELS = [
  { label: "Total proyek", key: "totalProjects" as const },
  { label: "Quotation pending", key: "pendingQuotation" as const },
  { label: "Win rate", key: "winRatePct" as const },
  { label: "Eksposur pajak (PPN + PPh)", key: "taxExposure" as const },
] as const;

function SecondaryKpiBar({
  kpis,
  className,
}: {
  kpis: DashboardApiResponse["kpis"] | undefined;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 divide-x divide-y divide-border rounded-none border border-border bg-card sm:grid-cols-4 sm:divide-y-0",
        className
      )}
      data-testid="dashboard-secondary-kpis"
    >
      {SECONDARY_KPI_LABELS.map((item) => {
        let value: string | number = 0;
        if (item.key === "winRatePct") {
          value = formatPercent(kpis?.winRatePct ?? 0);
        } else if (item.key === "taxExposure") {
          value = formatIDR((kpis?.taxExposurePpn ?? 0) + (kpis?.taxExposurePph ?? 0));
        } else {
          value = kpis?.[item.key] ?? 0;
        }
        return (
          <div key={item.label} className="min-w-0 px-3 py-3 sm:px-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="tabular-money mt-0.5 text-sm font-semibold text-foreground">{value}</p>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [range, setRange] = useState<DashboardRange>("all");
  const [activeTab, setActiveTab] = useState("finansial");
  const hasLoadedOnceRef = useRef(false);

  const goToCosting = useCallback(() => {
    const href = selectedProjectId ? `/costing?project=${encodeURIComponent(selectedProjectId)}` : "/costing";
    router.push(href);
  }, [router, selectedProjectId]);

  useEffect(() => {
    const controller = new AbortController();
    const isInitialLoad = !hasLoadedOnceRef.current;

    async function loadDashboard() {
      if (isInitialLoad) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        if (selectedProjectId) params.set("projectId", selectedProjectId);
        params.set("range", range);
        const query = params.toString();
        const response = await fetch(`/api/dashboard${query ? `?${query}` : ""}`, {
          signal: controller.signal,
        });

        if (response.status === 404) {
          setSelectedProjectId(null);
          throw new Error("Proyek tidak ditemukan");
        }
        if (!response.ok) throw new Error("Gagal memuat dashboard");

        const payload = (await response.json()) as DashboardApiResponse;
        setData(payload);
        hasLoadedOnceRef.current = true;
        if (payload.projectScope.selectedProjectId !== selectedProjectId) {
          setSelectedProjectId(payload.projectScope.selectedProjectId);
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        const message = loadError instanceof Error ? loadError.message : "Gagal memuat dashboard";
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [range, selectedProjectId]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setError(null);
    const params = new URLSearchParams();
    if (selectedProjectId) params.set("projectId", selectedProjectId);
    params.set("range", range);
    const query = params.toString();
    void fetch(`/api/dashboard${query ? `?${query}` : ""}`)
      .then(async (response) => {
        if (response.status === 404) {
          setSelectedProjectId(null);
          throw new Error("Proyek tidak ditemukan");
        }
        if (!response.ok) throw new Error("Gagal memuat dashboard");
        return response.json() as Promise<DashboardApiResponse>;
      })
      .then((payload) => {
        setData(payload);
        if (payload.projectScope.selectedProjectId !== selectedProjectId) {
          setSelectedProjectId(payload.projectScope.selectedProjectId);
        }
      })
      .catch((loadError) => {
        const message = loadError instanceof Error ? loadError.message : "Gagal memuat dashboard";
        setError(message);
      })
      .finally(() => setRefreshing(false));
  }, [range, selectedProjectId]);

  const loading = initialLoading;
  const chartLoading = initialLoading && !data;

  const kpis = data?.kpis;
  const trendSeries = data?.discountMarginTrend.series ?? [];
  const ytdBookedDelta = useMemo(
    () => buildYtdBookedDelta(trendSeries, kpis?.bookedRevenueYtd ?? 0),
    [trendSeries, kpis?.bookedRevenueYtd]
  );
  const mtdBookedDelta = useMemo(() => buildMtdBookedDelta(trendSeries), [trendSeries]);
  const marginDelta = useMemo(
    () => buildTrendDelta(trendSeries, "weightedMarginPct"),
    [trendSeries]
  );
  const leakageDelta = useMemo(
    () => buildTrendDelta(trendSeries, "discountLeakage"),
    [trendSeries]
  );

  const { sentinelRef, isStuck } = useDashboardToolbarStuck();

  const toolbarProps = {
    scopeOptions: data?.projectScope.options ?? [],
    selectedProjectId,
    range,
    loading: refreshing,
    onProjectChange: setSelectedProjectId,
    onRangeChange: setRange,
    onRefresh: refresh,
  };

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-foreground">{error}</p>
        <Button type="button" className="mt-4 gap-2" onClick={refresh}>
          <RefreshCw className="size-4" />
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <PageShell
      eyebrow="Ringkasan"
      title="Dashboard"
      description="Ringkasan finansial proyek dan quotation untuk estimasi, sales, dan manajemen."
      contentClassName="gap-6 pt-8 pb-6 sm:pt-10 sm:pb-8"
      actions={<DashboardToolbar {...toolbarProps} align="center" surface="panel" />}
    >
      <div ref={sentinelRef} className="pointer-events-none h-px w-full" aria-hidden />

      <DashboardStickyToolbar visible={isStuck}>
        <DashboardToolbar {...toolbarProps} align="start" surface="panel" />
      </DashboardStickyToolbar>

      {error ? (
        <div className="rounded-none border border-warning/35 bg-warning-muted px-4 py-3 text-xs text-warning">
          {error}. Menampilkan data terakhir yang tersedia.
        </div>
      ) : null}

      <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-5" data-testid="dashboard-hero-kpis">
        {loading && !kpis ? (
          <div className="col-span-full">
            <TableLoadingSkeleton columns={5} rows={2} />
          </div>
        ) : (
          <>
        <KpiStatCard
          title="Pendapatan booked YTD"
          value={kpis?.bookedRevenueYtd ?? 0}
          formatter={formatIDR}
          deltaPct={ytdBookedDelta}
          deltaLabel="vs bulan lalu"
          hint="Nilai bersih setelah diskon"
        />
        <KpiStatCard
          title="Pendapatan booked MTD"
          value={kpis?.bookedRevenueMtd ?? 0}
          formatter={formatIDR}
          deltaPct={mtdBookedDelta}
          deltaLabel="vs bulan sebelumnya"
        />
        <KpiStatCard
          title="Margin kotor tertimbang"
          value={kpis?.weightedGrossMarginPct ?? 0}
          formatter={formatPercent}
          deltaPct={marginDelta}
          deltaLabel="vs periode sebelumnya"
        />
        <KpiStatCard
          title="Nilai pipeline"
          value={kpis?.pipelineValue ?? 0}
          formatter={formatIDR}
          hint="Draft quotation pada periode aktif"
        />
        <KpiStatCard
          title="Kebocoran diskon"
          value={kpis?.discountLeakageValue ?? 0}
          formatter={formatIDR}
          deltaPct={leakageDelta}
          deltaLabel="vs periode sebelumnya"
        />
          </>
        )}
      </section>

      <section aria-label="KPI pendukung">
        <SecondaryKpiBar kpis={kpis} />
      </section>

      <section
        className={cn("min-w-0 p-4 sm:p-6", dashboardSegmentClass)}
        data-testid="dashboard-insight-panel"
        aria-labelledby="dashboard-insight-heading"
      >
        <h2
          id="dashboard-insight-heading"
          className="mb-4 text-base font-semibold text-foreground"
        >
          Insight utama
        </h2>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <PillTabsList>
            <PillTabsTrigger
              value="finansial"
              layoutId="dashboard-insight-pill"
              data-testid="dashboard-tab-finansial"
            >
              Finansial
            </PillTabsTrigger>
            <PillTabsTrigger
              value="penjualan"
              layoutId="dashboard-insight-pill"
              data-testid="dashboard-tab-penjualan"
            >
              Penjualan
            </PillTabsTrigger>
            <PillTabsTrigger
              value="costing"
              layoutId="dashboard-insight-pill"
              data-testid="dashboard-tab-costing"
            >
              Costing
            </PillTabsTrigger>
          </PillTabsList>

          {activeTab === "finansial" ? (
          <TabsContent value="finansial" className="mt-4 space-y-4">
            <ChartInsightBlock
              title="Profit bridge"
              loading={chartLoading}
              detailDescription="Tabel tahap profit bridge untuk review aksesibilitas."
              detailContent={
                data?.sankey.links.length ? (
                  <ProfitBridgeChart sankey={data.sankey} />
                ) : null
              }
            >
              {data?.sankey.links.length ? (
                <ProfitBridgeChart sankey={data.sankey} compact />
              ) : (
                <EmptyState
                  icon={Wallet}
                  title="Belum ada data profit bridge"
                  description="Tambahkan data costing dan quotation untuk melihat alur profit."
                  actionLabel="Buka Costing"
                  onAction={goToCosting}
                />
              )}
            </ChartInsightBlock>

            <ChartInsightBlock
              title="Cashflow timeline"
              loading={chartLoading}
              detailDescription="Tabel bulanan cashflow dan saldo berjalan."
              detailContent={
                data?.cashflowProjection.series.length ? (
                  <CashflowTimelineChart data={data.cashflowProjection} />
                ) : null
              }
            >
              {data?.cashflowProjection.series.length ? (
                <CashflowTimelineChart data={data.cashflowProjection} compact />
              ) : (
                <EmptyState
                  icon={Wallet}
                  title="Belum ada proyeksi cashflow"
                  description="Setidaknya satu quotation booked dibutuhkan untuk menampilkan timeline."
                  actionLabel="Buka Costing"
                  onAction={goToCosting}
                />
              )}
            </ChartInsightBlock>
          </TabsContent>
          ) : null}

          {activeTab === "penjualan" ? (
          <TabsContent value="penjualan" className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartInsightBlock title="Quotation funnel" loading={chartLoading}>
                {data ? <QuotationFunnel data={data.quotationFunnel} /> : null}
              </ChartInsightBlock>

              <ChartInsightBlock title="Status distribution" loading={chartLoading}>
                {data ? <StatusDistribution data={data.statusDistribution} /> : null}
              </ChartInsightBlock>
            </div>

            <ChartInsightBlock
              title="Sales leaderboard"
              loading={chartLoading}
              detailDescription="Daftar lengkap performa per principal."
              detailContent={data ? <SalesLeaderboard data={data.salesLeaderboard} /> : null}
            >
              {data ? <SalesLeaderboard data={data.salesLeaderboard} maxRows={5} /> : null}
            </ChartInsightBlock>

            <ClientListWidget />

            <ChartInsightBlock title="Quotation aging" loading={chartLoading}>
              {data ? <QuotationAgingTable data={data.quotationAging} /> : null}
            </ChartInsightBlock>
          </TabsContent>
          ) : null}

          {activeTab === "costing" ? (
          <TabsContent value="costing" className="mt-4 space-y-4">
            <ChartInsightBlock
              title="Cost breakdown"
              loading={chartLoading}
              detailDescription="Tabel breakdown material lengkap."
              detailContent={data ? <CostBreakdownChart costingData={data.costingData} /> : null}
            >
              {data ? <CostBreakdownChart costingData={data.costingData} compact /> : null}
            </ChartInsightBlock>

            <ChartInsightBlock
              title="Revenue trend"
              loading={chartLoading}
              detailDescription="Tabel tren revenue per bulan."
              detailContent={data ? <RevenueTrendChart data={data.revenueTrend} /> : null}
            >
              {data ? <RevenueTrendChart data={data.revenueTrend} compact /> : null}
            </ChartInsightBlock>
          </TabsContent>
          ) : null}
        </Tabs>
      </section>
    </PageShell>
  );
}
