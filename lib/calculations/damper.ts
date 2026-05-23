import type { CalcLineItem, ComponentCatalog, MaterialPrice, ProfileData } from "./types";
import { finite } from "./types";
import { calculateVolDamperWorkbookLines } from "./vol-damper-workbook";

/**
 * Volume damper cost for one FA or RA opening, aligned with `VolDamperCost2023 *`
 * rows 50–58 (see `calculateVolDamperWorkbookLines`).
 *
 * `W` / `H` map to workbook `C43` / `P43` (opening width × height, mm).
 * `profiles` / `materials` / `components` are accepted for API stability; pricing
 * follows the embedded VolDamper catalog snapshot (same source as oracle dump).
 */
export function calculateDamper(params: {
  W: number;
  H: number;
  type: "RA" | "FA";
  profiles: ProfileData[];
  materials: MaterialPrice[];
  components: ComponentCatalog[];
  /** Optional workbook `B44` (0/1) — defaults to 0. */
  b44?: number;
}): CalcLineItem[] {
  const { profiles: _p, materials: _m, components: _c, ...rest } = params;
  void _p;
  void _m;
  void _c;

  return calculateVolDamperWorkbookLines({
    openingWidthMm: finite(rest.W, 0),
    openingHeightMm: finite(rest.H, 0),
    b44: rest.b44,
    type: rest.type,
  });
}
