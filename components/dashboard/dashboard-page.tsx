"use client";

import { ChevronDown, RefreshCw, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CashflowTimelineChart } from "@/components/dashboard/cashflow-timeline-chart";
import { ChartInsightBlock } from "@/components/dashboard/chart-insight-block";
import { CostBreakdownChart } from "@/components/dashboard/cost-breakdown-chart";
import { DashboardStickyToolbar } from "@/components/dashboard/dashboard-sticky-toolbar";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { useDashboardToolbarStuck } from "@/hooks/use-dashboard-toolbar-stuck";
import { KpiStatCard } from "@/components/dashboard/kpi-stat-card";
import { ProfitBridgeChart } from "@/components/dashboard/profit-bridge-chart";
import { QuotationAgingTable } from "@/components/dashboard/quotation-aging-table";
import { QuotationFunnel } from "@/components/dashboard/quotation-funnel";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardApiResponse, DashboardRange } from "@/lib/dashboard-contract";
import { buildTrendDelta } from "@/lib/dashboard-ui-mappers";
import { cn } from "@/lib/utils";
import { formatIDR, formatPercent } from "@/lib/utils/format";

function SecondaryKpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card size="sm" className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
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
      {SECONDARY_KPI_LABELS.map((item) => {
        let value: string | number = 0;
        if (item.key === "winRatePct") {
          value = formatPercent(kpis?.winRatePct ?? 0);
        } else if (item.key === "taxExposure") {
          value = formatIDR((kpis?.taxExposurePpn ?? 0) + (kpis?.taxExposurePph ?? 0));
        } else {
          value = kpis?.[item.key] ?? 0;
        }
        return <SecondaryKpiTile key={item.label} label={item.label} value={value} />;
      })}
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [range, setRange] = useState<DashboardRange>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) params.set("projectId", selectedProjectId);
      params.set("range", range);
      const query = params.toString();
      const response = await fetch(`/api/dashboard${query ? `?${query}` : ""}`);
      if (!response.ok) throw new Error("Gagal memuat dashboard");
      const payload = (await response.json()) as DashboardApiResponse;
      setData(payload);
      if (payload.projectScope.selectedProjectId !== selectedProjectId) {
        setSelectedProjectId(payload.projectScope.selectedProjectId);
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Gagal memuat dashboard";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [range, selectedProjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = data?.kpis;
  const bookedDelta = useMemo(
    () => buildTrendDelta(data?.discountMarginTrend.series ?? [], "bookedRevenue"),
    [data?.discountMarginTrend.series]
  );
  const marginDelta = useMemo(
    () => buildTrendDelta(data?.discountMarginTrend.series ?? [], "weightedMarginPct"),
    [data?.discountMarginTrend.series]
  );
  const leakageDelta = useMemo(
    () => buildTrendDelta(data?.discountMarginTrend.series ?? [], "discountLeakage"),
    [data?.discountMarginTrend.series]
  );

  const { sentinelRef, isStuck } = useDashboardToolbarStuck();

  const toolbarProps = {
    scopeOptions: data?.projectScope.options ?? [],
    selectedProjectId,
    range,
    loading,
    onProjectChange: setSelectedProjectId,
    onRangeChange: setRange,
    onRefresh: () => void load(),
  };

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

  return (
    <PageShell
      eyebrow="Ringkasan"
      title="Dashboard"
      description="Ringkasan finansial proyek dan quotation untuk estimasi, sales, dan manajemen."
      contentClassName="gap-6 py-6 sm:py-8"
      actions={<DashboardToolbar {...toolbarProps} align="center" />}
    >
      <div ref={sentinelRef} className="pointer-events-none -mt-6 h-px w-full" aria-hidden />

      <DashboardStickyToolbar visible={isStuck}>
        <DashboardToolbar {...toolbarProps} align="end" />
      </DashboardStickyToolbar>

      {error ? (
        <div className="rounded-lg border border-border bg-muted px-4 py-3 text-xs text-muted-foreground">
          {error}. Menampilkan data terakhir yang tersedia.
        </div>
      ) : null}

      <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-5" data-testid="dashboard-hero-kpis">
        <KpiStatCard
          title="Booked revenue YTD"
          value={kpis?.bookedRevenueYtd ?? 0}
          formatter={formatIDR}
          deltaPct={bookedDelta}
          deltaLabel="dibanding bulan sebelumnya"
          hint="Nilai bersih setelah diskon"
        />
        <KpiStatCard
          title="Booked revenue MTD"
          value={kpis?.bookedRevenueMtd ?? 0}
          formatter={formatIDR}
          deltaPct={bookedDelta}
          deltaLabel="dibanding bulan sebelumnya"
        />
        <KpiStatCard
          title="Weighted gross margin"
          value={kpis?.weightedGrossMarginPct ?? 0}
          formatter={formatPercent}
          deltaPct={marginDelta}
          deltaLabel="perubahan margin"
        />
        <KpiStatCard
          title="Pipeline value"
          value={kpis?.pipelineValue ?? 0}
          formatter={formatIDR}
          hint="Draft quotation pada periode aktif"
        />
        <KpiStatCard
          title="Discount leakage"
          value={kpis?.discountLeakageValue ?? 0}
          formatter={formatIDR}
          deltaPct={leakageDelta}
          deltaLabel="perubahan leakage"
        />
      </section>

      <section aria-label="KPI pendukung">
        <div className="hidden sm:block" data-testid="dashboard-secondary-kpis">
          <SecondaryKpiGrid kpis={kpis} />
        </div>
        <Collapsible className="group/kpi-secondary sm:hidden">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground">
            KPI pendukung
            <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]/kpi-secondary:rotate-180 motion-reduce:transition-none" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 motion-reduce:animate-none">
            <SecondaryKpiGrid kpis={kpis} />
          </CollapsibleContent>
        </Collapsible>
      </section>

      <section
        className="min-w-0 rounded-xl border border-border bg-muted/30 p-4 sm:p-6"
        data-testid="dashboard-insight-panel"
        aria-labelledby="dashboard-insight-heading"
      >
        <h2 id="dashboard-insight-heading" className="text-lg font-semibold text-foreground">
          Insight utama
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tiga area fokus — finansial, penjualan, dan costing — tanpa scroll panjang.
        </p>

        <Tabs defaultValue="finansial" className="mt-4">
          <TabsList className="grid h-10 w-full grid-cols-3 sm:w-auto sm:inline-flex">
            <TabsTrigger value="finansial" data-testid="dashboard-tab-finansial">
              Finansial
            </TabsTrigger>
            <TabsTrigger value="penjualan" data-testid="dashboard-tab-penjualan">
              Penjualan
            </TabsTrigger>
            <TabsTrigger value="costing" data-testid="dashboard-tab-costing">
              Costing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="finansial" className="mt-4 space-y-4">
            <ChartInsightBlock
              title="Profit bridge"
              description="Waterfall cost-to-revenue dengan sinyal positif/negatif yang eksplisit."
              loading={loading}
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
                  onAction={() => router.push("/costing")}
                />
              )}
            </ChartInsightBlock>

            <ChartInsightBlock
              title="Cashflow timeline"
              description="Cash-in dan cash-out bulanan dengan saldo berjalan."
              loading={loading}
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
                  onAction={() => router.push("/costing")}
                />
              )}
            </ChartInsightBlock>
          </TabsContent>

          <TabsContent value="penjualan" className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartInsightBlock
                title="Quotation funnel"
                description="Konversi dari draft ke approved dalam periode aktif."
                loading={loading}
              >
                {data ? <QuotationFunnel data={data.quotationFunnel} /> : null}
              </ChartInsightBlock>

              <ChartInsightBlock
                title="Status distribution"
                description="Distribusi status quotation/proyek dengan fallback tabel."
                loading={loading}
              >
                {data ? <StatusDistribution data={data.statusDistribution} /> : null}
              </ChartInsightBlock>
            </div>

            <ChartInsightBlock
              title="Sales leaderboard"
              description="Performa berdasarkan salesman jika tersedia, fallback ke konsentrasi klien."
              loading={loading}
              detailDescription="Daftar lengkap performa per principal."
              detailContent={data ? <SalesLeaderboard data={data.salesLeaderboard} /> : null}
            >
              {data ? <SalesLeaderboard data={data.salesLeaderboard} maxRows={5} /> : null}
            </ChartInsightBlock>
          </TabsContent>

          <TabsContent value="costing" className="mt-4 space-y-4">
            <ChartInsightBlock
              title="Cost breakdown"
              description="Komposisi biaya material per sub-assembly atau kategori raw."
              loading={loading}
              detailDescription="Tabel breakdown material lengkap."
              detailContent={data ? <CostBreakdownChart costingData={data.costingData} /> : null}
            >
              {data ? <CostBreakdownChart costingData={data.costingData} compact /> : null}
            </ChartInsightBlock>

            <ChartInsightBlock
              title="Revenue trend"
              description="Tren booked vs potential revenue dalam periode bulanan."
              loading={loading}
              detailDescription="Tabel tren revenue per bulan."
              detailContent={data ? <RevenueTrendChart data={data.revenueTrend} /> : null}
            >
              {data ? <RevenueTrendChart data={data.revenueTrend} compact /> : null}
            </ChartInsightBlock>
          </TabsContent>
        </Tabs>
      </section>

      <Accordion
        type="single"
        collapsible
        className="rounded-xl border border-border bg-card/40 px-4 sm:px-6"
        data-testid="dashboard-detail-accordion"
      >
        <AccordionItem value="detail" className="border-none">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            Detail & tindak lanjut
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pb-6">
            <ChartInsightBlock
              title="Quotation aging"
              description="Pantau umur quotation dan masa berlaku yang mendekati habis."
              loading={loading}
            >
              {data ? <QuotationAgingTable data={data.quotationAging} /> : null}
            </ChartInsightBlock>
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
