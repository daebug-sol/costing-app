"use client";

import { useMemo, useRef, useState } from "react";
import type { AhuRecalcParams } from "@/lib/ahu-recalc-params";
import { normalizeSectionLayout } from "@/lib/ahu-recalc-params";
import { DEFAULT_COSTING_SCOPE, normalizeCostingScope } from "@/lib/costing-scope";
import { sectionHasPriceOverride } from "@/lib/section-subtotal";
import { parseIDR } from "@/lib/utils/format";
import { type CostingSectionWithLines } from "@/store/costingStore";
import { AhuModuleToggleKey, initialAhuFromSegment, sortSections, AhuEditorProps } from "./costing-workspace-shared";

export function useAhuSegmentEditor({
  segment: seg,
  patchSegment,
  saveAhuParams,
  saveAhuParamsAndRecalculate,
  segmentActionsDisabled,
  ahuModuleEnabled,
  isCalculating,
  openAddItem,
  toggleCat,
  openCats,
  unlockDraft,
  setUnlockDraft,
  qtyDraft,
  setQtyDraft,
  overrideItem,
  resetItem,
  setSectionOverride,
  resetSegmentMarkup,
  showToast,
}: AhuEditorProps) {
  const sortedSections = useMemo(
    () => sortSections(seg.sections ?? []),
    [seg.sections]
  );

  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [resettingMarkup, setResettingMarkup] = useState(false);
  const skipPriceBlurRef = useRef(false);

  const hasAnyOverride = useMemo(
    () => sortedSections.some((s) => sectionHasPriceOverride(s)),
    [sortedSections]
  );

  const commitSectionPrice = (sec: CostingSectionWithLines, raw: string) => {
    const v = parseIDR(raw);
    if (v === null) {
      setSectionOverride(sec.id, null).catch((e) => showToast(String(e)));
      setPriceEditId(null);
      return;
    }
    if (!Number.isFinite(v)) {
      showToast("Harga kategori harus berupa angka");
      return;
    }
    setSectionOverride(sec.id, v).catch((e) => showToast(String(e)));
    setPriceEditId(null);
  };

  const [ahu, setAhu] = useState<AhuRecalcParams>(() =>
    initialAhuFromSegment(seg.ahuRecalcParams)
  );

  const nSec =
    ahu.nSections != null
      ? Math.min(8, Math.max(1, Math.floor(ahu.nSections)))
      : 1;
  const sectionLayout = normalizeSectionLayout(ahu.sectionLayout);
  const dimLabel = (v: number | null | undefined) =>
    v != null ? String(v) : "—";

  const setCoil = (patch: Partial<NonNullable<AhuRecalcParams["coil"]>>) => {
    setAhu((p) => ({ ...p, coil: { ...p.coil, ...patch } }));
  };
  const setAccessDoor = (
    patch: Partial<NonNullable<AhuRecalcParams["accessDoor"]>>
  ) => {
    setAhu((p) => ({ ...p, accessDoor: { ...p.accessDoor, ...patch } }));
  };
  const setMixingBox = (
    patch: Partial<NonNullable<AhuRecalcParams["mixingBox"]>>
  ) => {
    setAhu((p) => ({ ...p, mixingBox: { ...p.mixingBox, ...patch } }));
  };
  const setFilters = (
    patch: Partial<NonNullable<AhuRecalcParams["filters"]>>
  ) => {
    setAhu((p) => ({ ...p, filters: { ...p.filters, ...patch } }));
  };
  const setElectricHeater = (
    patch: Partial<NonNullable<AhuRecalcParams["electricHeater"]>>
  ) => {
    setAhu((p) => ({
      ...p,
      electricHeater: { ...p.electricHeater, ...patch },
    }));
  };
  const setDamper = (patch: Partial<NonNullable<AhuRecalcParams["damper"]>>) => {
    setAhu((p) => ({ ...p, damper: { ...p.damper, ...patch } }));
  };
  const setOpening = (
    patch: Partial<NonNullable<AhuRecalcParams["opening"]>>
  ) => {
    setAhu((p) => ({ ...p, opening: { ...p.opening, ...patch } }));
  };
  const setFan = (patch: Partial<NonNullable<AhuRecalcParams["fanMotor"]>>) => {
    setAhu((p) => ({ ...p, fanMotor: { ...p.fanMotor, ...patch } }));
  };

  const scope = normalizeCostingScope(ahu.costingScope);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const setFullAhuSwitch = (full: boolean) => {
    setAhu((p) => ({
      ...p,
      costingScope: full
        ? { ...DEFAULT_COSTING_SCOPE }
        : {
            isFullAhu: false,
            includeFramePanel: true,
            includeSkid: true,
            includeStructure: true,
            includeDrainPan: true,
            includeAccessDoor: true,
            includeMixingBox: true,
            includeFilters: true,
            includeCoil: true,
            includeElectricHeater: true,
            includeDamper: true,
            includeOpening: true,
            includeFanMotor: true,
          },
    }));
  };

  const setScopeModule = (key: AhuModuleToggleKey, checked: boolean) => {
    setAhu((p) => {
      const s = normalizeCostingScope(p.costingScope);
      if (s.isFullAhu) return p;
      return {
        ...p,
        costingScope: {
          isFullAhu: false,
          includeFramePanel:
            key === "includeFramePanel" ? checked : s.includeFramePanel,
          includeSkid: key === "includeSkid" ? checked : s.includeSkid,
          includeStructure:
            key === "includeStructure" ? checked : s.includeStructure,
          includeDrainPan:
            key === "includeDrainPan" ? checked : s.includeDrainPan,
          includeAccessDoor:
            key === "includeAccessDoor" ? checked : s.includeAccessDoor,
          includeMixingBox:
            key === "includeMixingBox" ? checked : s.includeMixingBox,
          includeFilters: key === "includeFilters" ? checked : s.includeFilters,
          includeCoil: key === "includeCoil" ? checked : s.includeCoil,
          includeElectricHeater:
            key === "includeElectricHeater" ? checked : s.includeElectricHeater,
          includeDamper: key === "includeDamper" ? checked : s.includeDamper,
          includeOpening: key === "includeOpening" ? checked : s.includeOpening,
          includeFanMotor:
            key === "includeFanMotor" ? checked : s.includeFanMotor,
        },
      };
    });
  };


  return {
    seg,
    patchSegment,
    saveAhuParams,
    saveAhuParamsAndRecalculate,
    segmentActionsDisabled,
    ahuModuleEnabled,
    isCalculating,
    openAddItem,
    toggleCat,
    openCats,
    unlockDraft,
    setUnlockDraft,
    qtyDraft,
    setQtyDraft,
    overrideItem,
    resetItem,
    setSectionOverride,
    resetSegmentMarkup,
    showToast,
    sortedSections,
    priceEditId,
    setPriceEditId,
    priceDraft,
    setPriceDraft,
    resettingMarkup,
    setResettingMarkup,
    skipPriceBlurRef,
    hasAnyOverride,
    commitSectionPrice,
    ahu,
    setAhu,
    nSec,
    sectionLayout,
    dimLabel,
    setCoil,
    setAccessDoor,
    setMixingBox,
    setFilters,
    setElectricHeater,
    setDamper,
    setOpening,
    setFan,
    scope,
    breakdownOpen,
    setBreakdownOpen,
    setFullAhuSwitch,
    setScopeModule,
  };
}

export type AhuEditor = ReturnType<typeof useAhuSegmentEditor>;
