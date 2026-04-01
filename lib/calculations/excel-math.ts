import Decimal from "decimal.js";

/**
 * Math helpers aligned with Excel semantics using decimal.js.
 * Apply ROUND / ROUNDUP at the same intermediate steps as the spreadsheet — not only at the end.
 *
 * @see excel-formulas-dump.json (source formulas from Costing AHU DS50.xlsx)
 */

/** Coerce to Decimal without using raw `number` in arithmetic at call sites. */
export function d(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

/**
 * Excel `ROUND(value, num_digits)`.
 * - num_digits ≥ 0: round to that many decimal places (half away from zero, matching Excel).
 * - num_digits &lt; 0: round to multiples of 10^|num_digits| (e.g. -5 → nearest 100_000).
 */
export function excelRound(value: Decimal.Value, numDigits: number): Decimal {
  const x = d(value);
  const n = numDigits;
  if (n >= 0) {
    return x.toDecimalPlaces(n, Decimal.ROUND_HALF_UP);
  }
  const factor = d(10).pow(-n);
  return x
    .div(factor)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .mul(factor);
}

/**
 * Excel `ROUNDUP(value, num_digits)` — rounds away from zero.
 */
export function excelRoundUp(value: Decimal.Value, numDigits: number): Decimal {
  const x = d(value);
  const n = numDigits;
  if (n >= 0) {
    return x.toDecimalPlaces(n, Decimal.ROUND_UP);
  }
  const factor = d(10).pow(-n);
  return x
    .div(factor)
    .toDecimalPlaces(0, Decimal.ROUND_UP)
    .mul(factor);
}

/**
 * Excel `IF(ISBLANK(ref), expr, ref)` for migration: treat null/undefined as blank.
 */
export function ifBlank<T>(ref: T | null | undefined, whenBlank: Decimal): Decimal {
  if (ref === null || ref === undefined) return whenBlank;
  if (typeof ref === "string" && ref.trim() === "") return whenBlank;
  return d(ref as Decimal.Value);
}
