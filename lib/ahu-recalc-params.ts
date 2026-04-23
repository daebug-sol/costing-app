/**
 * Persisted + request payload for `POST .../recalculate` (Fase B/C).
 * Stored in `CostingSegment.ahuRecalcParams` (JSON).
 */

import type { CostingScope } from "@/lib/costing-scope";
import { normalizeCostingScope } from "@/lib/costing-scope";

export type { CostingScope } from "@/lib/costing-scope";

/** Alias untuk payload input modular (UI + API) — sama dengan `AhuRecalcParams`. */
export type AhuCostingInputPayload = AhuRecalcParams;

export type AhuRecalcParams = {
  nSections?: number;
  /** Scope modular: full AHU vs sub-assembly terpilih. */
  costingScope?: CostingScope;
  accessDoor?: {
    qty?: number;
    height?: number;
    width?: number;
    withWindow?: boolean;
  };
  mixingBox?: {
    faFlowCMH?: number;
    raFlowCMH?: number;
    faDamperW?: number;
    faDamperH?: number;
    raDamperW?: number;
    raDamperH?: number;
  };
  filters?: {
    panelQty?: number;
    bagQty?: number;
    panelClass?: string;
    bagClass?: string;
  };
  coil?: {
    FH?: number;
    FL?: number;
    rows?: number;
    FPI?: number;
    circuits?: number;
    /** kW cooling — untuk spesifikasi quotation (opsional). */
    Qc?: number;
    /** kW sensible — untuk spesifikasi quotation (opsional). */
    Qs?: number;
  };
  electricHeater?: {
    width?: number;
    height?: number;
    depth?: number;
    steps?: number;
    totalLoadKW?: number;
  };
  damper?: {
    W?: number;
    H?: number;
    /** Legacy: jika `includeFA` / `includeRA` tidak diset, hanya tipe ini yang dihitung. */
    type?: "FA" | "RA";
    includeFA?: boolean;
    includeRA?: boolean;
  };
  opening?: {
    qty?: number;
    width?: number;
    height?: number;
    includeFlex?: boolean;
    includeLouvre?: boolean;
    includeWireGauze?: boolean;
    includeActuator?: boolean;
  };
  fanMotor?: {
    fanModel?: string;
    motorKW?: number;
    motorPoles?: number;
    qty?: number;
  };
};

export function parseAhuRecalcParams(raw: unknown): AhuRecalcParams {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as AhuRecalcParams;
}

/** Deep-merge request body over stored segment JSON (request wins per key). */
export function mergeRecalcParams(
  stored: AhuRecalcParams,
  request: Record<string, unknown>
): AhuRecalcParams {
  const r = request as AhuRecalcParams & {
    accessDoor?: Record<string, unknown>;
    mixingBox?: Record<string, unknown>;
    filters?: Record<string, unknown>;
    coil?: Record<string, unknown>;
    electricHeater?: Record<string, unknown>;
    damper?: Record<string, unknown>;
    opening?: Record<string, unknown>;
    fanMotor?: Record<string, unknown>;
    costingScope?: Record<string, unknown>;
  };
  const accessDoor = {
    ...(stored.accessDoor ?? {}),
    ...(r.accessDoor && typeof r.accessDoor === "object" && !Array.isArray(r.accessDoor)
      ? r.accessDoor
      : {}),
  };
  const mixingBox = {
    ...(stored.mixingBox ?? {}),
    ...(r.mixingBox && typeof r.mixingBox === "object" && !Array.isArray(r.mixingBox)
      ? r.mixingBox
      : {}),
  };
  const filters = {
    ...(stored.filters ?? {}),
    ...(r.filters && typeof r.filters === "object" && !Array.isArray(r.filters)
      ? r.filters
      : {}),
  };
  const coil = {
    ...(stored.coil ?? {}),
    ...(r.coil && typeof r.coil === "object" && !Array.isArray(r.coil)
      ? r.coil
      : {}),
  };
  const electricHeater = {
    ...(stored.electricHeater ?? {}),
    ...(r.electricHeater &&
    typeof r.electricHeater === "object" &&
    !Array.isArray(r.electricHeater)
      ? r.electricHeater
      : {}),
  };
  const damper = {
    ...(stored.damper ?? {}),
    ...(r.damper && typeof r.damper === "object" && !Array.isArray(r.damper)
      ? r.damper
      : {}),
  };
  const fanMotor = {
    ...(stored.fanMotor ?? {}),
    ...(r.fanMotor && typeof r.fanMotor === "object" && !Array.isArray(r.fanMotor)
      ? r.fanMotor
      : {}),
  };
  const opening = {
    ...(stored.opening ?? {}),
    ...(r.opening && typeof r.opening === "object" && !Array.isArray(r.opening)
      ? r.opening
      : {}),
  };
  let costingScope: CostingScope | undefined;
  if (r.costingScope !== undefined) {
    if (r.costingScope === null) {
      costingScope = undefined;
    } else {
      const prev =
        stored.costingScope &&
        typeof stored.costingScope === "object" &&
        !Array.isArray(stored.costingScope)
          ? { ...(stored.costingScope as Record<string, unknown>) }
          : {};
      const next =
        r.costingScope && typeof r.costingScope === "object" && !Array.isArray(r.costingScope)
          ? { ...(r.costingScope as Record<string, unknown>) }
          : {};
      costingScope = normalizeCostingScope({ ...prev, ...next });
    }
  } else if (stored.costingScope !== undefined) {
    costingScope = normalizeCostingScope(stored.costingScope);
  }

  return {
    nSections: r.nSections ?? stored.nSections,
    costingScope,
    accessDoor: Object.keys(accessDoor).length ? accessDoor : undefined,
    mixingBox: Object.keys(mixingBox).length ? mixingBox : undefined,
    filters: Object.keys(filters).length ? filters : undefined,
    coil: Object.keys(coil).length ? coil : undefined,
    electricHeater: Object.keys(electricHeater).length ? electricHeater : undefined,
    damper: Object.keys(damper).length ? damper : undefined,
    opening: Object.keys(opening).length ? opening : undefined,
    fanMotor: Object.keys(fanMotor).length ? fanMotor : undefined,
  };
}

/**
 * Memutuskan apakah menghitung damper FA dan/atau RA.
 * - Jika `includeFA` / `includeRA` ada (salah satu), dipakai flag tersebut (default true untuk yang tidak disebut).
 * - Jika tidak: legacy `type` → hanya FA atau RA; tanpa keduanya → keduanya (perilaku baru).
 */
export function resolveDamperModes(
  damper: AhuRecalcParams["damper"]
): { fa: boolean; ra: boolean } {
  const d = damper ?? {};
  if (d.includeFA !== undefined || d.includeRA !== undefined) {
    return {
      fa: d.includeFA !== false,
      ra: d.includeRA !== false,
    };
  }
  if (d.type === "FA") return { fa: true, ra: false };
  if (d.type === "RA") return { fa: false, ra: true };
  return { fa: true, ra: true };
}
