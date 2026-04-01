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
  includeCoil: boolean;
  includeDamper: boolean;
  includeFanMotor: boolean;
};

/** Default: perilaku lama — full AHU, semua blok dihitung. */
export const DEFAULT_COSTING_SCOPE: CostingScope = {
  isFullAhu: true,
  includeFramePanel: true,
  includeSkid: true,
  includeStructure: true,
  includeDrainPan: true,
  includeCoil: true,
  includeDamper: true,
  includeFanMotor: true,
};

/** Kunci flag modular — dipakai untuk inferensi jika `isFullAhu` tidak dikirim. */
export const COSTING_SCOPE_INCLUDE_KEYS = [
  "includeFramePanel",
  "includeSkid",
  "includeStructure",
  "includeDrainPan",
  "includeCoil",
  "includeDamper",
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
  coil: boolean;
  damper: boolean;
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
    includeCoil: Boolean(o.includeCoil),
    includeDamper: Boolean(o.includeDamper),
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
      coil: true,
      damper: true,
      fanMotor: true,
    };
  }
  return {
    framePanel: scope.includeFramePanel,
    skid: scope.includeSkid,
    structure: scope.includeStructure,
    drainPan: scope.includeDrainPan,
    coil: scope.includeCoil,
    damper: scope.includeDamper,
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
    m.coil ||
    m.damper ||
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
  if (m.coil) labels.push("Coil");
  if (m.damper) labels.push("Damper");
  if (m.fanMotor) labels.push("Fan & Motor");
  return labels.length ? labels.join(" + ") : "—";
}
