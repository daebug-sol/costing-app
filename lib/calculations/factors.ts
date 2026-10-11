/**
 * Org-tunable waste factors for the AHU frame / skid / structure blocks.
 * Defaults equal the original hard-coded workbook values (parity baseline).
 */
export type CostingFactors = {
  /** Frame profile cut/waste multiplier (was inline 1.05). */
  profileWaste: number;
  /** GI liner sheet waste multiplier (was LINER_WASTE = 1.05). */
  linerWaste: number;
  /** Skid + structure steel plate waste multiplier (was inline 1.15). */
  plateWaste: number;
};

export const DEFAULT_COSTING_FACTORS: CostingFactors = {
  profileWaste: 1.05,
  linerWaste: 1.05,
  plateWaste: 1.15,
};

export const COSTING_FACTOR_MIN = 1;
export const COSTING_FACTOR_MAX = 2;

export function isValidCostingFactor(n: unknown): n is number {
  return (
    typeof n === "number" &&
    Number.isFinite(n) &&
    n >= COSTING_FACTOR_MIN &&
    n <= COSTING_FACTOR_MAX
  );
}

/** Missing / out-of-range keys fall back to the default for that key. */
export function resolveCostingFactors(raw: unknown): CostingFactors {
  const r =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const pick = (k: keyof CostingFactors) =>
    isValidCostingFactor(r[k]) ? (r[k] as number) : DEFAULT_COSTING_FACTORS[k];
  return {
    profileWaste: pick("profileWaste"),
    linerWaste: pick("linerWaste"),
    plateWaste: pick("plateWaste"),
  };
}
