import Decimal from "decimal.js";
import type { CalcLineItem, MaterialPrice } from "./types";
import { finite, findMaterial } from "./types";
import { d, excelRoundUp } from "./excel-math";

const AL_FIN_CODE = "AL-FIN";
const COPPER_CODE = "COPPER-TUBE";
const GI_HEADER_CODE = "SGCC-1.0";
const GI_DENSITY = 8030;

/** Dump `J213` / `O236` fin waste factor */
const DEFAULT_FIN_LINE_WASTE = 1.0305970149253734;
/** Dump `J214` / `O237` tube waste factor */
const DEFAULT_TUBE_LINE_WASTE = 1.02;
/** Dump `G211` */
const DEFAULT_FIN_PITCH_FACTOR_G211 = 1.0694056943669443;

function line(
  partial: Omit<CalcLineItem, "currency" | "wasteFactor" | "subtotal"> & {
    currency?: string;
    wasteFactor?: number;
  }
): CalcLineItem {
  const currency = partial.currency ?? "IDR";
  const wasteFactor = finite(partial.wasteFactor, 1);
  const qty = finite(partial.qty, 0);
  const unitPrice = finite(partial.unitPrice, 0);
  const subtotal = finite(qty * unitPrice * wasteFactor, 0);
  return {
    description: partial.description,
    uom: partial.uom,
    qty,
    qtyFormula: partial.qtyFormula ?? String(qty),
    unitPrice,
    currency,
    wasteFactor,
    subtotal,
    componentRef: partial.componentRef ?? null,
    notes: partial.notes ?? null,
  };
}

/**
 * Excel `CoilCost 20251027` `J236`/`J237`/`J238` IF ladder (volume fragment).
 */
export function coilRowJMassFromFGHI(f: number, g: number, h: number, i: number): Decimal {
  const F = d(f);
  const G = d(g);
  const H = d(h);
  const I = d(i);
  if (F.gt(0)) {
    return d(22)
      .div(28)
      .mul(F.div(1000).pow(2).minus(F.div(1000).minus(d(2).mul(G).div(1000)).pow(2)))
      .mul(H.div(1000));
  }
  if (G.gt(0)) return G.div(1000).mul(H.div(1000)).mul(I.div(1000));
  if (H.gt(0)) return H.div(1000).mul(I.div(1000));
  if (I.eq(0)) return d(1);
  return I.div(1000);
}

export type CalculateCoilParams = {
  FH: number;
  FL: number;
  rows: number;
  FPI: number;
  circuits: number;
  materials: MaterialPrice[];
  /** Workbook `I209` for fin count (`L236`). Defaults to FL. */
  coilFaceMm?: number;
  /** Dump `G211` inside `ROUNDUP((face/25.4*FPI)*G211,0)`. */
  finPitchFactorG211?: number;
  /** `F213` → `G236` fin-path OD mm */
  finTubeOdMm?: number;
  /** `F237` tube bundle OD mm (`E211`) */
  tubeOdMm?: number;
  /** `G237` tube wall mm (`F214`) */
  tubeWallMm?: number;
  /** `H237` effective tube length mm (`I211`) — defaults FL */
  tubeStretchMm?: number;
  /** `F209` nominal multiplier for `L237 = F209*H209` */
  tubePrimaryFactor?: number;
  /** Catalog UB header kg (`M238`) — overrides GI strip header model when set */
  headerAssemblyKg?: number;
  /** Workbook `I236` span mm in fin volume `J236` (G×H×I). Defaults to FL. */
  finPackSpanMm?: number;
  finLineWaste?: number;
  tubeLineWaste?: number;
};

export function calculateCoil(params: CalculateCoilParams): CalcLineItem[] {
  const FH = finite(params.FH, 0);
  const FL = finite(params.FL, 0);
  const rows = Math.max(0, Math.floor(finite(params.rows, 0)));
  const FPI = finite(params.FPI, 0);
  const circuits = Math.max(0, Math.floor(finite(params.circuits, 0)));

  const finMat = findMaterial(params.materials, AL_FIN_CODE);
  const cuMat = findMaterial(params.materials, COPPER_CODE);
  const giMat = findMaterial(params.materials, GI_HEADER_CODE);

  const finPrice = finMat ? finite(finMat.pricePerKg, 0) : 0;
  const cuPrice = cuMat ? finite(cuMat.pricePerKg, 0) : 0;
  const giPrice = giMat ? finite(giMat.pricePerKg, 0) : 0;

  const faceMm = finite(params.coilFaceMm ?? FL, 0);
  const g211 = finite(params.finPitchFactorG211 ?? DEFAULT_FIN_PITCH_FACTOR_G211, 0);
  const finTubeOd = finite(params.finTubeOdMm ?? 0.11, 0);
  const tubeOd = finite(params.tubeOdMm ?? 9.525, 0);
  const tubeWall = finite(params.tubeWallMm ?? 0.33, 0);
  const tubeStretch = finite(params.tubeStretchMm ?? FL, 0);
  const tubePrimary = finite(params.tubePrimaryFactor ?? 6, 0);

  const finLineWaste = finite(params.finLineWaste ?? DEFAULT_FIN_LINE_WASTE, 0);
  const tubeLineWaste = finite(params.tubeLineWaste ?? DEFAULT_TUBE_LINE_WASTE, 0);

  const finPackSpan = finite(params.finPackSpanMm ?? FL, 0);

  const fpiSafe = FPI > 0 ? FPI : 1;

  const j236 = coilRowJMassFromFGHI(0, finTubeOd, FH, finPackSpan);
  const k236 = d(2700);
  const l236 = excelRoundUp(d(faceMm).div(25.4).mul(fpiSafe).mul(g211), 0);
  const m236 = j236.mul(k236).mul(l236);
  const p236 = m236.mul(1).mul(finLineWaste);

  const j237 = coilRowJMassFromFGHI(tubeOd, tubeWall, tubeStretch, 0);
  const k237 = d(8900);
  const l237 = d(tubePrimary).mul(d(rows));
  const m237 = j237.mul(k237).mul(l237);
  const p237 = m237.mul(1).mul(tubeLineWaste);

  const kgHeaderGi =
    0.0015 * 0.268 * (FH / 1000 + 0.1) * GI_DENSITY * 1.15 * 2;
  const headerKg = finite(params.headerAssemblyKg ?? kgHeaderGi, 0);
  const p238 = d(headerKg).mul(1).mul(1);

  void circuits;

  return [
    line({
      description: "Coil fin (Al)",
      uom: "kg",
      qty: finite(p236.toNumber(), 0),
      qtyFormula: `P236=M236*N236*O236`,
      unitPrice: finPrice,
      componentRef: AL_FIN_CODE,
    }),
    line({
      description: "Coil tube (Cu)",
      uom: "kg",
      qty: finite(p237.toNumber(), 0),
      qtyFormula: `P237=M237*N237*O237`,
      unitPrice: cuPrice,
      componentRef: COPPER_CODE,
    }),
    line({
      description: "Coil header (GI)",
      uom: "kg",
      qty: finite(p238.toNumber(), 0),
      qtyFormula: params.headerAssemblyKg != null ? `catalog UB header` : `GI strip header`,
      unitPrice: giPrice,
      componentRef: GI_HEADER_CODE,
    }),
  ];
}
