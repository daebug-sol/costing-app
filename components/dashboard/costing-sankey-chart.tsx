"use client";

import { ResponsiveSankey } from "@nivo/sankey";
import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardCostingData } from "@/lib/dashboard-contract";
import { transformCostingToSankey } from "@/lib/dashboard-sankey-transform";
import { formatIDR } from "@/lib/utils/format";

function toPercent(value: number, total: number): string {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function resolveNodeColor(nodeId: string): string {
  if (nodeId.startsWith("part:")) return "#9f6a00";
  if (nodeId === "node:hpp") return "#5b6472";
  if (nodeId === "node:discount") return "#d14d5a";
  if (nodeId === "node:grand-total") return "#2f3949";
  return "#8f98a8";
}

function compactLabel(label: string): string {
  if (label.length <= 22) return label;
  return `${label.slice(0, 19)}...`;
}

export function CostingSankeyChart({ costingData }: { costingData: DashboardCostingData }) {
  const baseSankey = transformCostingToSankey(costingData);
  const [flowMode, setFlowMode] = useState<"engineering" | "commercial">("commercial");
  const isCommercialFlow = flowMode === "commercial";
  const sankey = useMemo(
    () =>
      isCommercialFlow
        ? {
            nodes: baseSankey.nodes,
            links: baseSankey.links.map((link) => ({
              source: link.target,
              target: link.source,
              value: link.value,
            })),
          }
        : baseSankey,
    [baseSankey, isCommercialFlow]
  );
  const total = sankey.links.reduce((sum, link) => sum + link.value, 0);
  const minVisualPct = 0.5;
  const minVisualValue = total > 0 ? (total * minVisualPct) / 100 : 0;
  const visualLinks = sankey.links.map((link) => ({
    ...link,
    actualValue: link.value,
    value: Math.max(link.value, minVisualValue),
  }));
  const actualByEdge = new Map(
    sankey.links.map((link) => [`${link.source}|||${link.target}`, link.value] as const)
  );
  const topFlows = [...sankey.links]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((link) => ({
      ...link,
      sourceLabel: sankey.nodes.find((node) => node.id === link.source)?.label ?? link.source,
      targetLabel: sankey.nodes.find((node) => node.id === link.target)?.label ?? link.target,
      pct: total > 0 ? (link.value / total) * 100 : 0,
    }));
  return (
    <div className="w-full rounded-xl border border-border/70 bg-background p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-foreground">Sankey View Mode</p>
        <Tabs value={flowMode} onValueChange={(v) => setFlowMode(v as "engineering" | "commercial")}>
          <TabsList className="grid h-8 w-[300px] grid-cols-2">
            <TabsTrigger value="engineering" className="text-xs">
              Engineering Flow
            </TabsTrigger>
            <TabsTrigger value="commercial" className="text-xs">
              Commercial Flow
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="relative min-h-[620px] w-full rounded-lg border border-border/60 bg-muted/10 p-2">
        <details className="absolute right-3 top-3 z-20 w-[280px] rounded-md border border-border/70 bg-background/95 p-2 shadow-sm backdrop-blur">
          <summary className="cursor-pointer list-none text-xs font-semibold text-foreground">
            Legend (click to expand)
          </summary>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              {isCommercialFlow ? "L4 -> L3 -> L2 -> L1" : "L1 -> L2 -> L3 -> L4"}
            </p>
            <p>{isCommercialFlow ? "L4: Grand Total / Selling" : "L1: Part / Sub-Assy"}</p>
            <p>{isCommercialFlow ? "L3: Commercial & Tax" : "L2: HPP / Base Cost"}</p>
            <p>{isCommercialFlow ? "L2: HPP / Base Cost" : "L3: Commercial & Tax"}</p>
            <p>{isCommercialFlow ? "L1: Part / Sub-Assy" : "L4: Grand Total / Selling"}</p>
          </div>
        </details>
        <div className="overflow-x-auto">
          <div className="h-[680px] min-w-[1700px] w-full" dir="ltr">
            <ResponsiveSankey
              data={{
                nodes: sankey.nodes.map((node) => ({ id: node.id, label: node.label })),
                links: visualLinks,
              }}
              layout="horizontal"
              margin={{ top: 34, right: 190, bottom: 40, left: 190 }}
              align="start"
              sort="descending"
              nodeOpacity={1}
              nodeThickness={14}
              nodeSpacing={36}
              nodeInnerPadding={3}
              nodeBorderWidth={0}
              nodeBorderRadius={2}
              colors={(node) => resolveNodeColor(String(node.id))}
              linkOpacity={0.46}
              linkHoverOthersOpacity={0.1}
              linkHoverOpacity={0.8}
              linkContract={1}
              enableLinkGradient={false}
              label={(node) => compactLabel(String(node.label))}
              labelPosition="inside"
              labelOrientation="horizontal"
              labelPadding={4}
              labelTextColor={{ from: "color", modifiers: [["brighter", 2.6]] }}
              animate={true}
              motionConfig="gentle"
              valueFormat={(value) => formatIDR(Number(value) || 0)}
              theme={{
                labels: {
                  text: {
                    fontSize: 11,
                    fontWeight: 600,
                  },
                },
                tooltip: {
                  container: {
                    fontSize: 12,
                    borderRadius: 8,
                  },
                },
              }}
              nodeTooltip={({ node }) => (
                <div className="rounded-md border border-border bg-card px-2 py-1.5 text-xs shadow">
                  <p className="font-semibold text-foreground">{String(node.label)}</p>
                  <p className="tabular-money text-muted-foreground">{formatIDR(Number(node.value) || 0)}</p>
                  <p className="text-muted-foreground">{toPercent(Number(node.value) || 0, total)} of total flow</p>
                </div>
              )}
              linkTooltip={({ link }) => {
                const key = `${String(link.source.id)}|||${String(link.target.id)}`;
                const actualValue = (actualByEdge.get(key) ?? Number(link.value)) || 0;
                const visualAdjusted = actualValue < minVisualValue && actualValue > 0;
                return (
                  <div className="rounded-md border border-border bg-card px-2 py-1.5 text-xs shadow">
                    <p className="text-foreground">
                      {String(link.source.label)} {"->"} {String(link.target.label)}
                    </p>
                    <p className="tabular-money font-medium text-foreground">{formatIDR(actualValue)}</p>
                    <p className="text-muted-foreground">{toPercent(actualValue, total)} of total flow</p>
                    {visualAdjusted ? (
                      <p className="text-[11px] text-amber-600">Visual thickness boosted to min {minVisualPct}%</p>
                    ) : null}
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
          <p className="mb-1 text-xs font-medium text-foreground">How to read</p>
          <p className="text-xs text-muted-foreground">
            Flow dibaca dari kiri ke kanan dengan urutan{" "}
            {isCommercialFlow ? "Level 4 ke Level 1" : "Level 1 ke Level 4"}.
            Ketebalan link menunjukkan proporsi nilai IDR.
            Node kecil (&lt;4.5% total flow) disembunyikan labelnya agar chart tetap clean.
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
          <p className="mb-2 text-xs font-medium text-foreground">Top Flow Breakdown</p>
          <div className="space-y-1.5">
            {topFlows.map((flow) => (
              <div key={`${flow.source}-${flow.target}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-muted-foreground">
                  {flow.sourceLabel} {"->"} {flow.targetLabel}
                </span>
                <span className="tabular-money shrink-0 font-medium text-foreground">
                  {formatIDR(flow.value)} ({flow.pct.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Visual scaling note: link dengan porsi sangat kecil dinaikkan ke minimum visual {minVisualPct}% agar tetap terlihat.
      </p>
    </div>
  );
}

