export const LOCKED_COLUMN_IDS = [
  "col_code",
  "col_name",
  "col_uom",
  "col_price",
] as const;

export function buildColumnId(tableId: string, key: string): string {
  return `${tableId}::${key}`;
}

export function hasColumnKey(columnId: string, key: string): boolean {
  return columnId === key || columnId.endsWith(`::${key}`);
}

export function resolveColumnIdByKey(
  columns: Array<{ id: string }>,
  key: string
): string | null {
  const hit = columns.find((c) => hasColumnKey(c.id, key));
  return hit?.id ?? null;
}

export function isLockedColumnId(columnId: string): boolean {
  return LOCKED_COLUMN_IDS.some((key) => hasColumnKey(columnId, key));
}

export const FIXED_UOMS = ["pcs", "m", "m2", "m3", "kg", "lot", "set", "unit"] as const;

export function sanitizeColumnId(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || `col_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeHeader(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export type FormulaEvalResult = {
  ok: boolean;
  value: number;
};

export function evaluateFormulaExpression(
  expression: string,
  variables: Record<string, number>
): FormulaEvalResult {
  const src = expression.trim().startsWith("=")
    ? expression.trim().slice(1)
    : expression.trim();
  if (!src) return { ok: false, value: 0 };
  const varExpr = src.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (name) =>
    Number.isFinite(variables[name]) ? String(variables[name]) : "0"
  );
  if (!/^[\d+\-*/().\s]+$/.test(varExpr)) return { ok: false, value: 0 };
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${varExpr});`) as () => number;
    const out = Number(fn());
    if (!Number.isFinite(out)) return { ok: false, value: 0 };
    return { ok: true, value: out };
  } catch {
    return { ok: false, value: 0 };
  }
}
