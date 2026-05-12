import fs from "fs";
import path from "path";

/** Currency / derived decimals in IDR scale */
export const EPS_IDR = 0.01;
/** Integer Excel cells (counts, fin qty) */
export const EPS_INT = 0;
/** Mass kg from workbook (often many decimals) */
export const EPS_KG = 0.000001;

export type DumpCell = {
  formula?: string;
  calculatedResult?: unknown;
  value?: unknown;
};

export type ExcelFormulaDump = {
  sheets: Record<string, { cells?: Record<string, DumpCell> }>;
};

export function readExcelDump(dumpPath = path.join(process.cwd(), "excel-formulas-dump.json")): ExcelFormulaDump {
  const raw = fs.readFileSync(dumpPath, "utf8");
  return JSON.parse(raw) as ExcelFormulaDump;
}

export function dumpCell(dump: ExcelFormulaDump, sheet: string, cell: string): DumpCell {
  const got = dump.sheets[sheet]?.cells?.[cell];
  if (!got) {
    throw new Error(`Missing dump cell ${sheet}!${cell}`);
  }
  return got;
}

export function dumpCellMaybe(
  dump: ExcelFormulaDump,
  sheet: string,
  cell: string
): DumpCell | undefined {
  return dump.sheets[sheet]?.cells?.[cell];
}

export function numericFromDump(
  cell: DumpCell | undefined,
  source: "calculatedResult" | "value" = "calculatedResult"
): number {
  if (!cell) return 0;
  const raw = source === "calculatedResult" ? cell.calculatedResult ?? cell.value : cell.value ?? cell.calculatedResult;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

