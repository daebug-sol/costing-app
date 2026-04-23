/**
 * Modular AHU costing: which sub-assemblies participate in auto-costing.
 * Persisted inside `CostingSegment.ahuRecalcParams.costingScope` (JSON).
 */

export type CostingScope = {
  /** true = hitung seluruh paket AHU (semua modul aktif). */
  isFullAhu: boolean;
  includeFramePanel: boolean;
  includeSkid: boolean;
  includeStructure: boolean;
  includeDrainPan: boolean;
  includeAccessDoor: boolean;
  includeMixingBox: boolean;
  includeFilters: boolean;
  includeCoil: boolean;
  includeElectricHeater: boolean;
  includeDamper: boolean;
  includeOpening: boolean;
  includeFanMotor: boolean;
};

/** Default: perilaku lama — full AHU, semua blok dihitung. */
export const DEFAULT_COSTING_SCOPE: CostingScope = {
  isFullAhu: true,
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
};

/** Kunci flag modular — dipakai untuk inferensi jika `isFullAhu` tidak dikirim. */
export const COSTING_SCOPE_INCLUDE_KEYS = [
  "includeFramePanel",
  "includeSkid",
  "includeStructure",
  "includeDrainPan",
  "includeAccessDoor",
  "includeMixingBox",
  "includeFilters",
  "includeCoil",
  "includeElectricHeater",
  "includeDamper",
  "includeOpening",
  "includeFanMotor",
] as const;

function hasAnyIncludeKeyInObject(o: Record<string, unknown>): boolean {
  return COSTING_SCOPE_INCLUDE_KEYS.some((k) => k in o);
}

export type ActiveAhuModules = {
  framePanel: boolean;
  skid: boolean;
  structure: boolean;
  drainPan: boolean;
  accessDoor: boolean;
  mixingBox: boolean;
  filters: boolean;
  coil: boolean;
  electricHeater: boolean;
  damper: boolean;
  opening: boolean;
  fanMotor: boolean;
};

/**
 * Normalisasi dari JSON (field boleh partial). Tanpa `costingScope` → full AHU.
 *
 * Inferensi: jika `isFullAhu` tidak ada di JSON tetapi ada salah satu field `include*`,
 * dianggap **partial** (`isFullAhu: false`). Tanpa itu, `{ includeCoil: true }` saja
 * akan salah dibaca sebagai full AHU (bug).
 */
export function normalizeCostingScope(raw: unknown): CostingScope {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_COSTING_SCOPE };
  }
  const o = raw as Record<string, unknown>;

  let isFullAhu: boolean;
  if (o.isFullAhu === true) {
    isFullAhu = true;
  } else if (o.isFullAhu === false) {
    isFullAhu = false;
  } else {
    /** Objek kosong `{}` atau hanya field lain → tetap full AHU (kompatibel data lama). */
    isFullAhu = !hasAnyIncludeKeyInObject(o);
  }

  if (isFullAhu) {
    return { ...DEFAULT_COSTING_SCOPE };
  }
  return {
    isFullAhu: false,
    includeFramePanel: Boolean(o.includeFramePanel),
    includeSkid: Boolean(o.includeSkid),
    includeStructure: Boolean(o.includeStructure),
    includeDrainPan: Boolean(o.includeDrainPan),
    includeAccessDoor: Boolean(o.includeAccessDoor),
    includeMixingBox: Boolean(o.includeMixingBox),
    includeFilters: Boolean(o.includeFilters),
    includeCoil: Boolean(o.includeCoil),
    includeElectricHeater: Boolean(o.includeElectricHeater),
    includeDamper: Boolean(o.includeDamper),
    includeOpening: Boolean(o.includeOpening),
    includeFanMotor: Boolean(o.includeFanMotor),
  };
}

/** Modul efektif untuk kalkulasi: full AHU → semua true. */
export function resolveActiveModules(scope: CostingScope): ActiveAhuModules {
  if (scope.isFullAhu) {
    return {
      framePanel: true,
      skid: true,
      structure: true,
      drainPan: true,
      accessDoor: true,
      mixingBox: true,
      filters: true,
      coil: true,
      electricHeater: true,
      damper: true,
      opening: true,
      fanMotor: true,
    };
  }
  return {
    framePanel: scope.includeFramePanel,
    skid: scope.includeSkid,
    structure: scope.includeStructure,
    drainPan: scope.includeDrainPan,
    accessDoor: scope.includeAccessDoor,
    mixingBox: scope.includeMixingBox,
    filters: scope.includeFilters,
    coil: scope.includeCoil,
    electricHeater: scope.includeElectricHeater,
    damper: scope.includeDamper,
    opening: scope.includeOpening,
    fanMotor: scope.includeFanMotor,
  };
}

/** Untuk validasi dimensi casing (H, W, D segmen). */
export function requiresCasingDimensions(scope: CostingScope): boolean {
  if (scope.isFullAhu) return true;
  return (
    scope.includeFramePanel ||
    scope.includeSkid ||
    scope.includeStructure ||
    scope.includeDrainPan
  );
}

export function hasAnyPartialModule(scope: CostingScope): boolean {
  const m = resolveActiveModules(scope);
  return (
    m.framePanel ||
    m.skid ||
    m.structure ||
    m.drainPan ||
    m.accessDoor ||
    m.mixingBox ||
    m.filters ||
    m.coil ||
    m.electricHeater ||
    m.damper ||
    m.opening ||
    m.fanMotor
  );
}

/** Label singkat untuk UI / quotation (bukan HPP). */
export function describeCostingScopeLabel(scope: CostingScope): string {
  if (scope.isFullAhu) return "Full AHU";
  const m = resolveActiveModules(scope);
  const labels: string[] = [];
  if (m.framePanel) labels.push("Frame & Panel");
  if (m.skid) labels.push("Skid");
  if (m.structure) labels.push("Structure");
  if (m.drainPan) labels.push("Drain Pan");
  if (m.accessDoor) labels.push("Access Door");
  if (m.mixingBox) labels.push("Mixing Box");
  if (m.filters) labels.push("Filters");
  if (m.coil) labels.push("Coil");
  if (m.electricHeater) labels.push("Electric Heater");
  if (m.damper) labels.push("Damper");
  if (m.opening) labels.push("Inlet/Outlet Opening");
  if (m.fanMotor) labels.push("Fan & Motor");
  return labels.length ? labels.join(" + ") : "—";
}
