"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Dispatch, type SetStateAction } from "react";
import type { AhuRecalcParams } from "@/lib/ahu-recalc-params";
import { parseAhuRecalcParams, resolveDamperModes } from "@/lib/ahu-recalc-params";
import type { CostingScope } from "@/lib/costing-scope";
import { type CostingSectionWithLines, type CostingSegmentDetail } from "@/store/costingStore";

export const CATEGORY_ORDER = [
  "Frame & Panel",
  "Skid",
  "Structure",
  "Drain Pan",
  "Access Door",
  "Mixing Box",
  "Filters",
  "Coil",
  "Electric Heater",
  "Damper",
  "Inlet/Outlet Opening",
  "Fan & Motor",
] as const;

export type AhuModuleToggleKey = keyof Pick<
  CostingScope,
  | "includeFramePanel"
  | "includeSkid"
  | "includeStructure"
  | "includeDrainPan"
  | "includeAccessDoor"
  | "includeMixingBox"
  | "includeFilters"
  | "includeCoil"
  | "includeElectricHeater"
  | "includeDamper"
  | "includeOpening"
  | "includeFanMotor"
>;

export const AHU_COSTING_MODULE_TOGGLES: { key: AhuModuleToggleKey; label: string }[] =
  [
    { key: "includeFramePanel", label: "Frame & Panel" },
    { key: "includeSkid", label: "Skid" },
    { key: "includeStructure", label: "Structure" },
    { key: "includeDrainPan", label: "Drain Pan" },
    { key: "includeAccessDoor", label: "Access Door" },
    { key: "includeMixingBox", label: "Mixing Box" },
    { key: "includeFilters", label: "Filters" },
    { key: "includeCoil", label: "Coil" },
    { key: "includeElectricHeater", label: "Electric Heater" },
    { key: "includeDamper", label: "Damper" },
    { key: "includeOpening", label: "Inlet/Outlet Opening" },
    { key: "includeFanMotor", label: "Fan & Motor" },
  ];

export function initialAhuFromSegment(raw: unknown): AhuRecalcParams {
  const p = parseAhuRecalcParams(raw);
  const m = resolveDamperModes(p.damper);
  return {
    ...p,
    damper: {
      ...p.damper,
      includeFA: m.fa,
      includeRA: m.ra,
    },
  };
}

export function categoryTitle(cat: string): string {
  if (cat === "Structure") return "AHU Structure";
  if (cat === "Skid") return "AHU Skid";
  if (cat === "Drain Pan") return "Drain pan";
  if (cat === "Inlet/Outlet Opening") return "Inlet / Outlet Opening";
  return cat;
}

export function sortSections(sections: CostingSectionWithLines[]): CostingSectionWithLines[] {
  const idx = (cat: string) => {
    const i = CATEGORY_ORDER.indexOf(cat as (typeof CATEGORY_ORDER)[number]);
    return i === -1 ? 999 : i;
  };
  return [...sections].sort(
    (a, b) => idx(a.category) - idx(b.category) || a.sortOrder - b.sortOrder
  );
}

export function catKey(segmentId: string, category: string) {
  return `${segmentId}:${category}`;
}

export function SortableCostingSegment({
  id,
  children,
}: {
  id: string;
  children: (args: {
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    dragProps: React.HTMLAttributes<HTMLDivElement>;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : undefined,
    opacity: isDragging ? 0.3 : 1,
  };
  const dragProps: React.HTMLAttributes<HTMLDivElement> = {
    ...attributes,
    ...listeners,
    className:
      "cursor-grab touch-none select-none active:cursor-grabbing rounded-md px-1 py-0.5 -mx-1 -my-0.5",
    title: "Tahan lalu seret untuk mengurutkan item",
  };
  return <>{children({ setNodeRef, style, dragProps })}</>;
}

export const PROFILE_OPTIONS = [
  { label: "DS15", value: "1540T-NA06" },
  { label: "DS25", value: "2540Y-NA06" },
  { label: "DS50", value: "5060Y-NA06" },
] as const;

export type AhuEditorProps = {
  segment: CostingSegmentDetail;
  patchSegment: (
    segmentId: string,
    patch: Record<string, unknown>
  ) => void;
  saveAhuParams: (segmentId: string, params: AhuRecalcParams) => Promise<void>;
  saveAhuParamsAndRecalculate: (
    segmentId: string,
    params: AhuRecalcParams
  ) => Promise<void>;
  /** True saat proyek belum termuat — cegah PUT/recalc tanpa currentProject */
  segmentActionsDisabled: boolean;
  /** When false, existing AHU is viewable but recalculate CTA is hidden. */
  ahuModuleEnabled: boolean;
  isCalculating: boolean;
  openAddItem: (sectionId: string) => void;
  toggleCat: (segmentId: string, cat: string) => void;
  openCats: Record<string, boolean>;
  unlockDraft: Record<string, boolean>;
  setUnlockDraft: Dispatch<SetStateAction<Record<string, boolean>>>;
  qtyDraft: Record<string, string>;
  setQtyDraft: Dispatch<SetStateAction<Record<string, string>>>;
  overrideItem: (itemId: string, qty: number) => Promise<void>;
  resetItem: (itemId: string) => Promise<void>;
  setSectionOverride: (
    sectionId: string,
    overrideSubtotal: number | null
  ) => Promise<void>;
  resetSegmentMarkup: (segmentId: string) => Promise<void>;
  showToast: (m: string) => void;
};
