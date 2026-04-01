import type { ComponentCatalog, MaterialPrice, ProfileData } from "@prisma/client";
import type { AhuRecalcParams } from "@/lib/ahu-recalc-params";
import { resolveDamperModes } from "@/lib/ahu-recalc-params";
import { resolveActiveModules, type CostingScope } from "@/lib/costing-scope";
import {
  calculateCoil,
  calculateDamper,
  calculateDrainPan,
  calculateFanMotor,
  calculateFramePanel,
  calculateSkid,
  calculateStructure,
  finite,
  type CalcLineItem,
} from "@/lib/calculations";

/** Urutan kategori di UI / quotation (sinkron dengan route recalculate). */
export const AHU_COSTING_SECTION_DEFS = [
  { module: "framePanel" as const, category: "Frame & Panel", sortOrder: 0 },
  { module: "skid" as const, category: "Skid", sortOrder: 1 },
  { module: "structure" as const, category: "Structure", sortOrder: 2 },
  { module: "drainPan" as const, category: "Drain Pan", sortOrder: 3 },
  { module: "coil" as const, category: "Coil", sortOrder: 4 },
  { module: "damper" as const, category: "Damper", sortOrder: 5 },
  { module: "fanMotor" as const, category: "Fan & Motor", sortOrder: 6 },
];

export type AhuSegmentCostingInput = {
  dimH: number;
  dimW: number;
  dimD: number;
  profileType: string;
  segmentQty: number;
  nSections: number;
  /** Scope efektif (sudah dinormalisasi). */
  scope: CostingScope;
  mergedParams: AhuRecalcParams;
  materials: MaterialPrice[];
  profiles: ProfileData[];
  components: ComponentCatalog[];
};

export type AhuCostingBlock = {
  category: string;
  sortOrder: number;
  items: CalcLineItem[];
};

/**
 * Engine utama: hitung semua blok line item sesuai `CostingScope`.
 * Sub-kalkulasi dipanggil hanya jika modul aktif (atau full AHU).
 */
export function computeAhuSegmentCostingBlocks(
  input: AhuSegmentCostingInput
): AhuCostingBlock[] {
  const H = finite(input.dimH, 0);
  const W = finite(input.dimW, 0);
  const D = finite(input.dimD, 0);
  const modules = resolveActiveModules(input.scope);
  const merged = input.mergedParams;

  const frameItems = modules.framePanel
    ? calculateFramePanel({
        H,
        W,
        D,
        profileType: input.profileType,
        nSections: input.nSections,
        profiles: input.profiles,
        materials: input.materials,
      })
    : [];

  const skidItems = modules.skid
    ? calculateSkid({ W, D, materials: input.materials })
    : [];

  const structureItems = modules.structure
    ? calculateStructure({ H, W, D, materials: input.materials })
    : [];

  const drainPanItems = modules.drainPan
    ? calculateDrainPan({ H, W, D, materials: input.materials })
    : [];

  const coilBody = (merged.coil ?? {}) as Record<string, unknown>;
  const coilItems = modules.coil
    ? calculateCoil({
        FH: finite(coilBody.FH, H),
        FL: finite(coilBody.FL, W),
        rows: finite(coilBody.rows, 4),
        FPI: finite(coilBody.FPI, 10),
        circuits: finite(coilBody.circuits, 2),
        materials: input.materials,
      })
    : [];

  const damperBody = (merged.damper ?? {}) as Record<string, unknown>;
  const dw = finite(damperBody.W, W);
  const dh = finite(damperBody.H, H);
  const { fa: runFa, ra: runRa } = resolveDamperModes(merged.damper);
  const damperItems: CalcLineItem[] = modules.damper
    ? [
        ...(runFa
          ? calculateDamper({
              W: dw,
              H: dh,
              type: "FA",
              profiles: input.profiles,
              materials: input.materials,
              components: input.components,
            })
          : []),
        ...(runRa
          ? calculateDamper({
              W: dw,
              H: dh,
              type: "RA",
              profiles: input.profiles,
              materials: input.materials,
              components: input.components,
            })
          : []),
      ]
    : [];

  const fmBody = (merged.fanMotor ?? {}) as Record<string, unknown>;
  const fanItems = modules.fanMotor
    ? calculateFanMotor({
        fanModel: String(fmBody.fanModel ?? ""),
        motorKW: finite(fmBody.motorKW, 0),
        motorPoles: Math.floor(finite(fmBody.motorPoles, 4)),
        qty: Math.max(1, Math.floor(finite(fmBody.qty, input.segmentQty))),
        components: input.components,
      })
    : [];

  const byModule: Record<(typeof AHU_COSTING_SECTION_DEFS)[number]["module"], CalcLineItem[]> = {
    framePanel: frameItems,
    skid: skidItems,
    structure: structureItems,
    drainPan: drainPanItems,
    coil: coilItems,
    damper: damperItems,
    fanMotor: fanItems,
  };

  return AHU_COSTING_SECTION_DEFS.map((def) => ({
    category: def.category,
    sortOrder: def.sortOrder,
    items: byModule[def.module],
  }));
}

/** Nama umum untuk integrasi: satu entry point `calculateCosting(input)` sesuai modul aktif. */
export function calculateCosting(input: AhuSegmentCostingInput): AhuCostingBlock[] {
  return computeAhuSegmentCostingBlocks(input);
}
