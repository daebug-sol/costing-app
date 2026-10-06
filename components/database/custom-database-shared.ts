import { hasColumnKey } from "@/lib/custom-db";
import { cn } from "@/lib/utils";
import { formatIDR, formatNumber } from "@/lib/utils/format";

export type CustomCol = {
  id: string;
  header: string;
  sortOrder: number;
  locked: boolean;
  kind: string;
};

export type SchemaCol = {
  header: string;
  kind: string;
  dropdownOptions?: string;
};

export type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
  rowId?: string;
  columnId?: string;
};

export type CustomCell = {
  rowId: string;
  columnId: string;
  rawValue: string | null;
  computedValue: number | null;
};

export type CustomRow = {
  id: string;
  sortOrder: number;
  cells: CustomCell[];
};

export type CustomTable = {
  id: string;
  name: string;
  columns: CustomCol[];
  rows: CustomRow[];
};

export type UpdateCellResponse = {
  rowId: string;
  updatedCell: CustomCell;
  cells: CustomCell[];
};

export const PAGE_SIZE = 100;

/** Formula reference tones — semantic tokens only; more than four refs reuse tones in order. */
export const FORMULA_REF_TONES = [
  { cell: "bg-destructive/10 text-foreground", text: "text-destructive", ring: "ring-2 ring-destructive/70" },
  { cell: "bg-primary/10 text-foreground", text: "text-primary", ring: "ring-2 ring-primary/70" },
  { cell: "bg-warning/10 text-foreground", text: "text-warning", ring: "ring-2 ring-warning/70" },
  { cell: "bg-success/10 text-foreground", text: "text-success", ring: "ring-2 ring-success/70" },
] as const;

/** Spreadsheet cell focus — inset outline avoids broken ring on table borders (UI-HARNESS: clear state). */
export function getGridCellInteractionClasses(opts: {
  isActive: boolean;
  isEditing: boolean;
  inFill: boolean;
  isFormulaRefTarget: boolean;
  refCellClass: string;
  refCellBorderClass: string;
  hasRefHighlight: boolean;
}): string {
  const {
    isActive,
    isEditing,
    inFill,
    isFormulaRefTarget,
    refCellClass,
    refCellBorderClass,
    hasRefHighlight,
  } = opts;

  if (isActive) {
    return cn(
      "z-20 bg-primary/10 transition-[background-color,box-shadow] duration-150 ease-out",
      isEditing && "bg-primary/14",
      "shadow-[inset_0_0_0_2px_var(--primary)]"
    );
  }
  if (inFill) return "bg-primary/12";
  if (isFormulaRefTarget) {
    return "z-10 bg-primary/8 shadow-[inset_0_0_0_2px_var(--primary)] transition-[box-shadow] duration-150";
  }
  if (refCellClass) {
    return cn(refCellClass, refCellBorderClass, hasRefHighlight && "z-20");
  }
  return "bg-card";
}

export function getRefToneClasses(index: number) {
  const n = FORMULA_REF_TONES.length;
  const tone = FORMULA_REF_TONES[((index % n) + n) % n];
  return { cellClass: tone.cell, formulaTextClass: tone.text, borderClass: tone.ring };
}

export function extractFormulaVarKeys(rawValue: string): string[] {
  const src = rawValue.trimStart();
  if (!src.startsWith("=")) return [];
  const body = src.slice(1);
  const hits = body.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) ?? [];
  const uniq: string[] = [];
  for (const h of hits) {
    const key = h.toLowerCase();
    if (!uniq.includes(key)) uniq.push(key);
  }
  return uniq;
}

export function tokenizeFormulaBody(body: string): string[] {
  return body.match(/[A-Za-z_][A-Za-z0-9_]*|[0-9]+(?:\.[0-9]+)?|\s+|./g) ?? [];
}

export const isLocked = (columnId: string) =>
  hasColumnKey(columnId, "col_code") ||
  hasColumnKey(columnId, "col_name") ||
  hasColumnKey(columnId, "col_uom") ||
  hasColumnKey(columnId, "col_price");

export async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

export function isCurrencyKind(kind: string): boolean {
  return kind === "currency" || kind === "finance";
}

export function isNumericKind(kind: string): boolean {
  return kind === "number" || isCurrencyKind(kind);
}

export function parseNumericRaw(raw: string): number | null {
  const n = Number(raw.replace(/,/g, "").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseDropdownOptions(kind: string): string[] {
  if (!kind.startsWith("dropdown:")) return [];
  const body = kind.slice("dropdown:".length);
  if (!body) return [];
  return body.split("|").filter(Boolean);
}

export function encodeDropdownKind(optionsText: string): string {
  const opts = optionsText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (opts.length === 0) return "dropdown:";
  return `dropdown:${opts.join("|")}`;
}

export function getCellRenderMode(col: CustomCol): "uom" | "dropdown" | "input" {
  if (hasColumnKey(col.id, "col_uom") || col.kind === "uom") return "uom";
  if (parseDropdownOptions(col.kind).length > 0) return "dropdown";
  return "input";
}

export function normalizeNumericOnBlur(raw: string, kind: string): string {
  if (!isNumericKind(kind)) return raw;
  const n = parseNumericRaw(raw);
  return n !== null ? String(n) : raw;
}

export function cellInputDisplay(
  cell: CustomCell | undefined,
  col: CustomCol,
  focused: boolean
): string {
  const raw = cell?.rawValue ?? "";
  const colId = col.id;
  const kind = col.kind ?? "text";
  if (focused) return raw;
  const t = raw.trim();
  if (t.startsWith("=")) {
    if (hasColumnKey(colId, "col_price") && cell?.computedValue != null) {
      return formatIDR(cell.computedValue);
    }
    if (isCurrencyKind(kind) && cell?.computedValue != null) {
      return formatIDR(cell.computedValue);
    }
    return cell?.computedValue != null ? String(cell.computedValue) : "";
  }
  if (hasColumnKey(colId, "col_price") && cell?.computedValue != null) {
    return formatIDR(cell.computedValue);
  }
  if (isCurrencyKind(kind)) {
    const n = parseNumericRaw(raw);
    if (n !== null) return formatIDR(n);
  }
  if (kind === "number") {
    const n = parseNumericRaw(raw);
    if (n !== null) return formatNumber(n);
  }
  return raw;
}
