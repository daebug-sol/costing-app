"use client";

import { ChevronDown, RefreshCw, Wallet } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartInsightBlock } from "@/components/dashboard/chart-insight-block";
import { ClientListWidget } from "@/components/dashboard/client-list-widget";
import { DashboardStickyToolbar } from "@/components/dashboard/dashboard-sticky-toolbar";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import {
  dashboardDetailInnerClass,
  dashboardSegmentClass,
  dashboardSubsegmentClass,
  dashboardTabPaneClass,
  secondaryKpiTintClass,
} from "@/components/dashboard/dashboard-surface-styles";
import { useDashboardToolbarStuck } from "@/hooks/use-dashboard-toolbar-stuck";
import { KpiStatCard } from "@/components/dashboard/kpi-stat-card";
import { QuotationAgingTable } from "@/components/dashboard/quotation-aging-table";
import { QuotationFunnel } from "@/components/dashboard/quotation-funnel";
import { SalesLeaderboard } from "@/components/dashboard/sales-leaderboard";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { TableLoadingSkeleton } from "@/components/table-loading-skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

function SecondaryKpiTile({
  label,
  value,
  tintIndex,
}: {
  label: string;
  value: string | number;
  tintIndex: number;
}) {
  return (
    <Card size="sm" className={cn("border", secondaryKpiTintClass(tintIndex))}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="tabular-money mt-1 text-lg font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

const SECONDARY_KPI_LABELS = [
  { label: "Total proyek", key: "totalProjects" as const },
  { label: "Quotation pending", key: "pendingQuotation" as const },
  { label: "Win rate", key: "winRatePct" as const, format: "percent" as const },
  {
    label: "Eksposur pajak (PPN + PPh)",
    key: "taxExposure" as const,
    format: "idr" as const,
  },
] as const;

function SecondaryKpiGrid({
  kpis,
  className,
}: {
  kpis: DashboardApiResponse["kpis"] | undefined;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {SECONDARY_KPI_LABELS.map((item, index) => {
        let value: string | number = 0;
        if (item.key === "winRatePct") {
          value = formatPercent(kpis?.winRatePct ?? 0);
        } else if (item.key === "taxExposure") {
          value = formatIDR((kpis?.taxExposurePpn ?? 0) + (kpis?.taxExposurePph ?? 0));
        } else {
          value = kpis?.[item.key] ?? 0;
        }
        return (
          <SecondaryKpiTile key={item.label} label={item.label} value={value} tintIndex={index} />
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
          title="Booked revenue YTD"
          value={kpis?.bookedRevenueYtd ?? 0}
          formatter={formatIDR}
          deltaPct={ytdBookedDelta}
          deltaLabel="kontribusi bulan ini vs YTD sebelumnya"
          hint="Nilai bersih setelah diskon"
          accent="revenue"
        />
        <KpiStatCard
          title="Booked revenue MTD"
          value={kpis?.bookedRevenueMtd ?? 0}
          formatter={formatIDR}
          deltaPct={mtdBookedDelta}
          deltaLabel="dibanding bulan sebelumnya"
          accent="revenue"
        />
        <KpiStatCard
          title="Weighted gross margin"
          value={kpis?.weightedGrossMarginPct ?? 0}
          formatter={formatPercent}
          deltaPct={marginDelta}
          deltaLabel="perubahan margin"
          accent="margin"
        />
        <KpiStatCard
          title="Pipeline value"
          value={kpis?.pipelineValue ?? 0}
          formatter={formatIDR}
          hint="Draft quotation pada periode aktif"
          accent="pipeline"
        />
        <KpiStatCard
          title="Discount leakage"
          value={kpis?.discountLeakageValue ?? 0}
          formatter={formatIDR}
          deltaPct={leakageDelta}
          deltaLabel="perubahan leakage"
          accent="leakage"
        />
          </>
        )}
      </section>

      <section aria-label="KPI pendukung">
        <div className="hidden sm:block" data-testid="dashboard-secondary-kpis">
          <SecondaryKpiGrid kpis={kpis} />
        </div>
        <Collapsible className="group/kpi-secondary sm:hidden">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-none border-2 border-primary/20 bg-primary/[0.06] px-4 py-3 text-sm font-medium text-foreground">
            KPI pendukung
            <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]/kpi-secondary:rotate-180 motion-reduce:transition-none" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 motion-reduce:animate-none">
            <SecondaryKpiGrid kpis={kpis} />
          </CollapsibleContent>
        </Collapsible>
      </section>

      <ClientListWidget />

      <section
        className={cn("min-w-0 p-4 sm:p-6", dashboardSegmentClass)}
        data-testid="dashboard-insight-panel"
        aria-labelledby="dashboard-insight-heading"
      >
        <div className="mb-4 border-b border-border pb-4">
          <span
            className="bg-primary mb-2 block h-0.5 w-10 rounded-full sm:mb-2.5 sm:w-12"
            aria-hidden
          />
          <h2
            id="dashboard-insight-heading"
            className="font-display text-foreground text-2xl leading-tight font-semibold tracking-tight sm:text-3xl"
          >
            Insight utama
          </h2>
        </div>

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
          <TabsContent
            value="finansial"
            className={cn("mt-4 space-y-4 rounded-none border p-3 sm:p-4", dashboardTabPaneClass.finansial)}
          >
            <ChartInsightBlock
              title="Profit bridge"
              description="Waterfall cost-to-revenue dengan sinyal positif/negatif yang eksplisit."
              loading={chartLoading}
              accent="bridge"
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
              description="Cash-in dan cash-out bulanan dengan saldo berjalan."
              loading={chartLoading}
              accent="cashflow"
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
          <TabsContent
            value="penjualan"
            className={cn("mt-4 space-y-4 rounded-none border p-3 sm:p-4", dashboardTabPaneClass.penjualan)}
          >
            <div className={cn("grid gap-4 lg:grid-cols-2", dashboardSubsegmentClass)}>
              <ChartInsightBlock
                title="Quotation funnel"
                description="Konversi dari draft ke booked dalam periode aktif."
                loading={chartLoading}
                accent="funnel"
              >
                {data ? <QuotationFunnel data={data.quotationFunnel} /> : null}
              </ChartInsightBlock>

              <ChartInsightBlock
                title="Status distribution"
                description="Distribusi status quotation/proyek dengan fallback tabel."
                loading={chartLoading}
                accent="status"
              >
                {data ? <StatusDistribution data={data.statusDistribution} /> : null}
              </ChartInsightBlock>
            </div>

            <ChartInsightBlock
              title="Sales leaderboard"
              description="Performa berdasarkan salesman jika tersedia, fallback ke konsentrasi klien."
              loading={chartLoading}
              accent="leaderboard"
              detailDescription="Daftar lengkap performa per principal."
              detailContent={data ? <SalesLeaderboard data={data.salesLeaderboard} /> : null}
            >
              {data ? <SalesLeaderboard data={data.salesLeaderboard} maxRows={5} /> : null}
            </ChartInsightBlock>
          </TabsContent>
          ) : null}

          {activeTab === "costing" ? (
          <TabsContent
            value="costing"
            className={cn("mt-4 space-y-4 rounded-none border p-3 sm:p-4", dashboardTabPaneClass.costing)}
          >
            <ChartInsightBlock
              title="Cost breakdown"
              description="Komposisi biaya material per sub-assembly atau kategori raw."
              loading={chartLoading}
              accent="cost"
              detailDescription="Tabel breakdown material lengkap."
              detailContent={data ? <CostBreakdownChart costingData={data.costingData} /> : null}
            >
              {data ? <CostBreakdownChart costingData={data.costingData} compact /> : null}
            </ChartInsightBlock>

            <ChartInsightBlock
              title="Revenue trend"
              description="Tren booked vs potential revenue dalam periode bulanan."
              loading={chartLoading}
              accent="revenue"
              detailDescription="Tabel tren revenue per bulan."
              detailContent={data ? <RevenueTrendChart data={data.revenueTrend} /> : null}
            >
              {data ? <RevenueTrendChart data={data.revenueTrend} compact /> : null}
            </ChartInsightBlock>
          </TabsContent>
          ) : null}
        </Tabs>
      </section>

      <Accordion
        type="single"
        collapsible
        className={cn("px-4 sm:px-6", dashboardSegmentClass)}
        data-testid="dashboard-detail-accordion"
      >
        <AccordionItem value="detail" className="border-none">
          <AccordionTrigger className="border-primary/20 -mx-4 rounded-none border-b bg-primary/[0.08] px-4 py-4 text-base font-semibold hover:no-underline sm:-mx-6 sm:px-6">
            Detail & tindak lanjut
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6 pt-4">
            <div className={dashboardDetailInnerClass()}>
              <ChartInsightBlock
                title="Quotation aging"
                description="Pantau umur quotation dan masa berlaku yang mendekati habis."
                loading={chartLoading}
                accent="aging"
            >
              {data ? <QuotationAgingTable data={data.quotationAging} /> : null}
            </ChartInsightBlock>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/costing" className="text-primary underline-offset-4 hover:underline">
          Costing
        </Link>
        {" · "}
        <Link href="/documentation" className="text-primary underline-offset-4 hover:underline">
          Documentation
        </Link>
      </p>
    </PageShell>
  );
}
