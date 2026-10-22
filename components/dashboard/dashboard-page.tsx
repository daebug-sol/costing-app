"use client";

import { ChevronDown, RefreshCw, Wallet } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartInsightBlock } from "@/components/dashboard/chart-insight-block";
import { useI18n } from "@/components/i18n-provider";
import { ClientListWidget } from "@/components/dashboard/client-list-widget";
import { DashboardStickyToolbar } from "@/components/dashboard/dashboard-sticky-toolbar";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { dashboardSegmentClass } from "@/components/dashboard/dashboard-surface-styles";
import { useDashboardToolbarStuck } from "@/hooks/use-dashboard-toolbar-stuck";
import { HomeOverview } from "@/components/dashboard/personal/home-overview";
import { type PersonalKpi } from "@/components/dashboard/personal/personal-kpis";
import { ScopeSwitcher } from "@/components/dashboard/personal/scope-switcher";
import { QuotationAgingTable } from "@/components/dashboard/quotation-aging-table";
import { QuotationFunnel } from "@/components/dashboard/quotation-funnel";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { TableLoadingSkeleton } from "@/components/table-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PillTabsList, PillTabsTrigger } from "@/components/ui/pill-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { DashboardApiResponse, DashboardRange } from "@/lib/dashboard-contract";
import { buildMtdBookedDelta, buildTrendDelta } from "@/lib/dashboard-ui-mappers";
import { cn } from "@/lib/utils";
import { formatPercent, formatRpShort } from "@/lib/utils/format";

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

const NOT_FOUND = "notFound";
const LOAD_FAILED = "loadFailed";

export function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<typeof NOT_FOUND | typeof LOAD_FAILED | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [range, setRange] = useState<DashboardRange>("all");
  const [salesman, setSalesman] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
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
        if (salesman) params.set("salesman", salesman);
        const query = params.toString();
        const response = await fetch(`/api/dashboard${query ? `?${query}` : ""}`, {
          signal: controller.signal,
        });

        if (response.status === 404) {
          setSelectedProjectId(null);
          throw new Error(NOT_FOUND);
        }
        if (!response.ok) throw new Error(LOAD_FAILED);

        const payload = (await response.json()) as DashboardApiResponse;
        setData(payload);
        hasLoadedOnceRef.current = true;
        if (payload.projectScope.selectedProjectId !== selectedProjectId) {
          setSelectedProjectId(payload.projectScope.selectedProjectId);
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error && loadError.message === NOT_FOUND ? NOT_FOUND : LOAD_FAILED);
      } finally {
        if (!controller.signal.aborted) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [range, selectedProjectId, salesman, reloadKey]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setError(null);
    const params = new URLSearchParams();
    if (selectedProjectId) params.set("projectId", selectedProjectId);
    params.set("range", range);
    if (salesman) params.set("salesman", salesman);
    const query = params.toString();
    void fetch(`/api/dashboard${query ? `?${query}` : ""}`)
      .then(async (response) => {
        if (response.status === 404) {
          setSelectedProjectId(null);
          throw new Error(NOT_FOUND);
        }
        if (!response.ok) throw new Error(LOAD_FAILED);
        return response.json() as Promise<DashboardApiResponse>;
      })
      .then((payload) => {
        setData(payload);
        if (payload.projectScope.selectedProjectId !== selectedProjectId) {
          setSelectedProjectId(payload.projectScope.selectedProjectId);
        }
      })
      .catch((loadError) => {
        setError(loadError instanceof Error && loadError.message === NOT_FOUND ? NOT_FOUND : LOAD_FAILED);
      })
      .finally(() => setRefreshing(false));
  }, [range, selectedProjectId, salesman]);

  const loading = initialLoading;
  const chartLoading = initialLoading && !data;

  const kpis = data?.kpis;
  const trendSeries = useMemo(() => data?.discountMarginTrend.series ?? [], [data]);
  const mtdBookedDelta = useMemo(() => buildMtdBookedDelta(trendSeries), [trendSeries]);
  const marginDelta = useMemo(
    () => buildTrendDelta(trendSeries, "weightedMarginPct"),
    [trendSeries]
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh the clock whenever new data arrives
  const now = useMemo(() => new Date(), [data]);
  const isSelfView =
    !!data &&
    (data.scope.mode === "own" ||
      (data.scope.mode === "person" &&
        data.scope.salesman?.trim().toLowerCase() === data.scope.viewerName.trim().toLowerCase()));

  const personalKpis = useMemo<PersonalKpi[]>(() => {
    if (!kpis) return [];
    const direction = (delta: number): "up" | "down" | "flat" =>
      delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const booked = trendSeries.map((p) => p.bookedRevenue);
    return [
      {
        key: "sales",
        title: t("dashboard.personal.kpi.sales"),
        value: formatRpShort(kpis.bookedRevenueMtd),
        note:
          mtdBookedDelta !== 0
            ? t("dashboard.personal.kpi.salesNote", { delta: `${mtdBookedDelta > 0 ? "+" : ""}${formatPercent(mtdBookedDelta)}` })
            : "",
        trend: { data: booked, direction: direction(mtdBookedDelta) },
      },
      {
        key: "winRate",
        title: t("dashboard.personal.kpi.winRate"),
        value: formatPercent(kpis.winRatePct),
        note: data?.quotationFunnel.totalCount
          ? t("dashboard.personal.kpi.winRateNote", {
              approved: data.quotationFunnel.approvedCount,
              total: data.quotationFunnel.totalCount,
            })
          : "",
      },
      {
        key: "margin",
        title: t("dashboard.personal.kpi.margin"),
        value: formatPercent(kpis.weightedGrossMarginPct),
        note: "",
        trend: {
          data: trendSeries.map((p) => p.weightedMarginPct),
          direction: direction(marginDelta),
        },
      },
      {
        key: "pipeline",
        title: t("dashboard.personal.kpi.pipeline"),
        value: formatRpShort(kpis.pipelineValue),
        note: kpis.pendingQuotation
          ? t("dashboard.personal.kpi.pipelineNote", { count: kpis.pendingQuotation })
          : "",
      },
    ];
  }, [kpis, trendSeries, mtdBookedDelta, marginDelta, data, t]);

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

  const errorMessage =
    error === NOT_FOUND ? t("dashboard.error.notFound") : t("dashboard.error.load");

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-foreground">{errorMessage}</p>
        <Button type="button" className="mt-4 gap-2" onClick={refresh}>
          <RefreshCw className="size-4" />
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <PageShell
      eyebrow={t("dashboard.eyebrow")}
      title={t("dashboard.title")}
      contentClassName="gap-6"
      actions={
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {data?.scope.options.length ? (
            <ScopeSwitcher options={data.scope.options} value={salesman} onChange={setSalesman} />
          ) : null}
          <DashboardToolbar {...toolbarProps} align="center" surface="panel" />
        </div>
      }
    >
      {/* -mb-6 cancels the flex gap so the sentinel adds no space above the overview. */}
      <div ref={sentinelRef} className="pointer-events-none -mb-6 h-px w-full" aria-hidden />

      <DashboardStickyToolbar visible={isStuck}>
        <DashboardToolbar {...toolbarProps} align="start" surface="panel" />
      </DashboardStickyToolbar>

      {error ? (
        <div className="rounded-none border border-warning/35 bg-warning-muted px-4 py-3 text-xs text-warning">
          {t("dashboard.error.staleData", { error: errorMessage })}
        </div>
      ) : null}

      {loading && !data ? (
        <TableLoadingSkeleton columns={4} rows={2} />
      ) : data ? (
        <>
          <HomeOverview
            name={data.scope.viewerName}
            personal={data.personal}
            now={now}
            kpis={personalKpis}
            trend={<RevenueTrendChart data={data.revenueTrend} compact />}
            showTarget={isSelfView}
            onTargetSaved={() => setReloadKey((k) => k + 1)}
          />
        </>
      ) : null}

      <section
        className={cn("min-w-0 p-4 sm:p-6", dashboardSegmentClass)}
        data-testid="dashboard-insight-panel"
        aria-labelledby="dashboard-insight-heading"
      >
        <h2
          id="dashboard-insight-heading"
          className="mb-4 text-base font-semibold text-foreground"
        >
          {t("dashboard.insight.heading")}
        </h2>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <PillTabsList className="grid-cols-2 self-start sm:w-auto">
            <PillTabsTrigger
              value="finansial"
              layoutId="dashboard-insight-pill"
              data-testid="dashboard-tab-finansial"
            >
              {t("dashboard.tab.financial")}
            </PillTabsTrigger>
            <PillTabsTrigger
              value="penjualan"
              layoutId="dashboard-insight-pill"
              data-testid="dashboard-tab-penjualan"
            >
              {t("dashboard.tab.sales")}
            </PillTabsTrigger>
          </PillTabsList>

          {activeTab === "finansial" ? (
          <TabsContent value="finansial" className="mt-4 space-y-4">
            <ChartInsightBlock
              title={t("dashboard.cashflow.title")}
              loading={chartLoading}
              detailDescription={t("dashboard.cashflow.detail")}
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
                  title={t("dashboard.cashflow.emptyTitle")}
                  description={t("dashboard.cashflow.emptyDescription")}
                  actionLabel={t("common.openCosting")}
                  onAction={goToCosting}
                />
              )}
            </ChartInsightBlock>

          </TabsContent>
          ) : null}

          {activeTab === "penjualan" ? (
          <TabsContent value="penjualan" className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartInsightBlock title={t("dashboard.funnel.title")} loading={chartLoading}>
                {data ? <QuotationFunnel data={data.quotationFunnel} /> : null}
              </ChartInsightBlock>

              <ChartInsightBlock title={t("dashboard.statusDistribution.title")} loading={chartLoading}>
                {data ? <StatusDistribution data={data.statusDistribution} /> : null}
              </ChartInsightBlock>
            </div>

            <ClientListWidget />

            <ChartInsightBlock title={t("dashboard.aging.title")} loading={chartLoading}>
              {data ? <QuotationAgingTable data={data.quotationAging} /> : null}
            </ChartInsightBlock>
          </TabsContent>
          ) : null}

        </Tabs>

        <Collapsible className="mt-6 border-t border-border pt-4" data-testid="dashboard-cost-analysis">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="group gap-2">
              <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
              {t("dashboard.costAnalysis.title")}
              <span className="text-xs font-normal text-muted-foreground">{t("dashboard.costAnalysis.hint")}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <ChartInsightBlock
              title={t("dashboard.profitBridge.title")}
              loading={chartLoading}
              detailDescription={t("dashboard.profitBridge.detail")}
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
                  title={t("dashboard.profitBridge.emptyTitle")}
                  description={t("dashboard.profitBridge.emptyDescription")}
                  actionLabel={t("common.openCosting")}
                  onAction={goToCosting}
                />
              )}
            </ChartInsightBlock>

            <ChartInsightBlock
              title={t("dashboard.costBreakdown.title")}
              loading={chartLoading}
              detailDescription={t("dashboard.costBreakdown.detail")}
              detailContent={data ? <CostBreakdownChart costingData={data.costingData} /> : null}
            >
              {data ? <CostBreakdownChart costingData={data.costingData} compact /> : null}
            </ChartInsightBlock>

          </CollapsibleContent>
        </Collapsible>
      </section>
    </PageShell>
  );
}
