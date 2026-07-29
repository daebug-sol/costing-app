/** Indonesian-style number and currency formatting */

export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Parse an Indonesian Rupiah display string (e.g. "Rp 43.469.116") to a number.
 * Empty / whitespace-only → `null` (caller may treat as reset).
 * Non-numeric → `NaN`.
 */
export function parseIDR(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const cleaned = trimmed
    .replace(/Rp\.?/gi, "")
    .replace(/\u00a0/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  if (cleaned === "" || cleaned === "-" || cleaned === "+") return null;

  const v = Number(cleaned);
  return Number.isFinite(v) ? v : NaN;
}

/** Compact axis labels for narrow chart containers (split-screen friendly). */
export function formatIDRCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${sign}Rp${(abs / 1_000_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp${Math.round(abs / 1_000_000)}jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp${Math.round(abs / 1_000)}rb`;
  }
  return formatIDR(value);
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** e.g. 20 → "20,0%" (Indonesian decimal comma) */
export function formatPercent(value: number): string {
  return (
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value) + "%"
  );
}
