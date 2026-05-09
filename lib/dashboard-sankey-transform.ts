import type { DashboardCostingData } from "@/lib/dashboard-contract";

export type SankeyNodeLevel = 1 | 2 | 3 | 4;

export type CostingSankeyNode = {
  id: string;
  label: string;
  level: SankeyNodeLevel;
  color: string;
};

export type CostingSankeyLink = {
  source: string;
  target: string;
  value: number;
};

export type CostingSankeyData = {
  nodes: CostingSankeyNode[];
  links: CostingSankeyLink[];
};

const COLOR = {
  level1: "#9f6a00",
  level2: "#5b6472",
  level3: "#8f98a8",
  discount: "#d14d5a",
  final: "#2f3949",
};

function toNodeId(prefix: string, value: string) {
  return `${prefix}:${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

function safeMoney(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function transformCostingToSankey(costingData: DashboardCostingData): CostingSankeyData {
  const nodes = new Map<string, CostingSankeyNode>();
  const links = new Map<string, number>();
  const addNode = (id: string, label: string, level: SankeyNodeLevel, color: string) => {
    if (!nodes.has(id)) nodes.set(id, { id, label, level, color });
  };
  const addLink = (source: string, target: string, rawValue: number) => {
    const value = safeMoney(rawValue);
    if (value <= 0) return;
    const key = `${source}|||${target}`;
    links.set(key, (links.get(key) ?? 0) + value);
  };

  const hppId = "node:hpp";
  const grossId = "node:gross-total";
  const discountId = "node:discount";
  const grandId = "node:grand-total";

  addNode(hppId, "HPP (Harga Pokok Penjualan)", 2, COLOR.level2);
  addNode(grossId, "Gross Total", 3, COLOR.level3);
  addNode(discountId, "Discount", 3, COLOR.discount);
  addNode(grandId, "Grand Total / Selling Price", 4, COLOR.final);

  const partTotals = new Map<string, number>();
  for (const row of costingData.rawContributions) {
    const partName = row.subAssembly.trim() || "Assembly";
    const value = safeMoney(row.value);
    if (value <= 0) continue;

    const partId = toNodeId("part", partName);
    addNode(partId, partName, 1, COLOR.level1);
    partTotals.set(partId, (partTotals.get(partId) ?? 0) + value);
  }
  for (const [partId, subtotal] of partTotals) {
    addLink(partId, hppId, subtotal);
  }

  addLink(hppId, grossId, costingData.hpp);
  const addOnNodes = [
    ["node:overhead", "Overhead", costingData.overhead],
    ["node:contingency", "Contingency", costingData.contingency],
    ["node:eskalasi", "Eskalasi", costingData.eskalasi],
    ["node:asuransi", "Asuransi", costingData.asuransi],
    ["node:mobilisasi", "Mobilisasi", costingData.mobilisasi],
    ["node:margin", "Margin", costingData.margin],
  ] as const;
  for (const [id, label, value] of addOnNodes) {
    addNode(id, label, 3, COLOR.level3);
    addLink(id, grossId, value);
  }

  const discount = safeMoney(costingData.discount);
  const netSelling = safeMoney(costingData.netSelling);
  if (discount > 0) {
    addLink(grossId, discountId, discount);
  }
  addLink(grossId, grandId, netSelling);

  addNode("node:ppn", "PPN", 4, COLOR.level4);
  addNode("node:pph", "PPH", 4, COLOR.level4);
  addLink("node:ppn", grandId, costingData.ppn);
  addLink("node:pph", grandId, costingData.pph);

  return {
    nodes: Array.from(nodes.values()),
    links: Array.from(links.entries()).map(([key, value]) => {
      const [source, target] = key.split("|||");
      return { source: source ?? "", target: target ?? "", value };
    }),
  };
}

