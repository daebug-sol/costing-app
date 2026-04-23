import type { ComponentCatalog, MaterialPrice, ProfileData } from "@prisma/client";
import type { AhuRecalcParams } from "@/lib/ahu-recalc-params";
import { resolveDamperModes } from "@/lib/ahu-recalc-params";
import { resolveActiveModules, type CostingScope } from "@/lib/costing-scope";
import {
  calculateAccessDoor,
  calculateCoil,
  calculateDamper,
  calculateDrainPan,
  calculateElectricHeater,
  calculateFanMotor,
  calculateFilters,
  calculateFramePanel,
  calculateMixingBox,
  calculateOpenings,
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
  { module: "accessDoor" as const, category: "Access Door", sortOrder: 4 },
  { module: "mixingBox" as const, category: "Mixing Box", sortOrder: 5 },
  { module: "filters" as const, category: "Filters", sortOrder: 6 },
  { module: "coil" as const, category: "Coil", sortOrder: 7 },
  { module: "electricHeater" as const, category: "Electric Heater", sortOrder: 8 },
  { module: "damper" as const, category: "Damper", sortOrder: 9 },
  { module: "opening" as const, category: "Inlet/Outlet Opening", sortOrder: 10 },
  { module: "fanMotor" as const, category: "Fan & Motor", sortOrder: 11 },
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

  const adBody = (merged.accessDoor ?? {}) as Record<string, unknown>;
  const accessDoorItems = modules.accessDoor
    ? calculateAccessDoor({
        qty: Math.max(1, Math.floor(finite(adBody.qty, 1))),
        height: finite(adBody.height, H),
        width: finite(adBody.width, W),
        withWindow: adBody.withWindow === true,
        components: input.components,
      })
    : [];

  const mbBody = (merged.mixingBox ?? {}) as Record<string, unknown>;
  const mixingBoxItems = modules.mixingBox
    ? calculateMixingBox({
        faFlowCMH: finite(mbBody.faFlowCMH, 0),
        raFlowCMH: finite(mbBody.raFlowCMH, 0),
        faDamperW: finite(mbBody.faDamperW, W),
        faDamperH: finite(mbBody.faDamperH, H),
        raDamperW: finite(mbBody.raDamperW, W),
        raDamperH: finite(mbBody.raDamperH, H),
        components: input.components,
      })
    : [];

  const fltBody = (merged.filters ?? {}) as Record<string, unknown>;
  const filterItems = modules.filters
    ? calculateFilters({
        panelQty: Math.max(0, Math.floor(finite(fltBody.panelQty, 1))),
        bagQty: Math.max(0, Math.floor(finite(fltBody.bagQty, 1))),
        panelClass: String(fltBody.panelClass ?? "G4"),
        bagClass: String(fltBody.bagClass ?? "F8"),
        components: input.components,
      })
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

  const ehBody = (merged.electricHeater ?? {}) as Record<string, unknown>;
  const electricHeaterItems = modules.electricHeater
    ? calculateElectricHeater({
        width: finite(ehBody.width, W),
        height: finite(ehBody.height, H),
        depth: finite(ehBody.depth, 180),
        steps: Math.max(1, Math.floor(finite(ehBody.steps, 2))),
        totalLoadKW: finite(ehBody.totalLoadKW, 0),
        components: input.components,
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

  const opBody = (merged.opening ?? {}) as Record<string, unknown>;
  const openingItems = modules.opening
    ? calculateOpenings({
        qty: Math.max(1, Math.floor(finite(opBody.qty, 1))),
        width: finite(opBody.width, W),
        height: finite(opBody.height, H),
        includeFlex: opBody.includeFlex === true,
        includeLouvre: opBody.includeLouvre === true,
        includeWireGauze: opBody.includeWireGauze === true,
        includeActuator: opBody.includeActuator === true,
        components: input.components,
      })
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
    accessDoor: accessDoorItems,
    mixingBox: mixingBoxItems,
    filters: filterItems,
    coil: coilItems,
    electricHeater: electricHeaterItems,
    damper: damperItems,
    opening: openingItems,
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
