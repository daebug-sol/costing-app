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

/** Header → identifier used in =formula (same rules as variable substitution). */
export function columnHeaderToVariableKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function lookupVariableValue(variables: Record<string, number>, name: string): number | undefined {
  if (Object.prototype.hasOwnProperty.call(variables, name)) return variables[name];
  const lower = name.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(variables, lower)) return variables[lower];
  const hit = Object.keys(variables).find((k) => k.toLowerCase() === lower);
  return hit !== undefined ? variables[hit] : undefined;
}

/**
 * Build numeric variables for one row. Literals are fixed; formulas are re-evaluated in a loop
 * so any column can reference any other column (acyclic refs converge; cycles capped).
 */
export function computeNumericVariablesForRow(
  columns: Array<{ id: string; header: string; sortOrder: number }>,
  byCol: Map<string, { rawValue: string | null; computedValue: number | null }>
): Record<string, number> {
  const sorted = [...columns].sort((a, b) => a.sortOrder - b.sortOrder);
  const variables: Record<string, number> = {};

  for (const col of sorted) {
    const key = columnHeaderToVariableKey(col.header);
    if (!key) continue;
    const cell = byCol.get(col.id);
    const raw = String(cell?.rawValue ?? "").trim();
    if (raw.startsWith("=")) {
      variables[key] = 0;
    } else {
      const n = Number(raw.replace(/,/g, "").replace(/\s/g, ""));
      variables[key] = Number.isFinite(n) ? n : 0;
    }
  }

  const MAX_ITER = 64;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let changed = false;
    for (const col of sorted) {
      const key = columnHeaderToVariableKey(col.header);
      if (!key) continue;
      const cell = byCol.get(col.id);
      const raw = String(cell?.rawValue ?? "").trim();
      if (!raw.startsWith("=")) continue;

      const result = evaluateFormulaExpression(raw, variables);
      const next = result.ok ? result.value : 0;
      if (Math.abs(next - variables[key]) > 1e-12) changed = true;
      variables[key] = next;
    }
    if (!changed) break;
  }

  return variables;
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
  const varExpr = src.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (name) => {
    const v = lookupVariableValue(variables, name);
    return Number.isFinite(v) ? String(v) : "0";
  });
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
