/**
 * Extract cell values + formulas from selected sheets → excel-formulas-dump.json
 * Run from project root: node scripts/extract-formulas.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const INPUT = path.join(ROOT, "Costing AHU DS50.xlsx");
const OUTPUT = path.join(ROOT, "excel-formulas-dump.json");

/** Sesuaikan nama sheet persis seperti di Excel (case-sensitive). */
const TARGET_SHEETS = [
  "2. AHU-Frame & Panel",
  "3. AHU-Structure",
  "drainpan",
  "CoilCost 20251027",
];

function safeJsonValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : value.toISOString();
  }
  // Rich text: array of { text, font? }
  if (Array.isArray(value)) {
    return value.map((r) => (typeof r === "object" && r && "text" in r ? r.text : r));
  }
  if (typeof value === "object") {
    // Formula object { formula, result } sometimes appears as .value
    if ("result" in value && ("formula" in value || "sharedFormula" in value)) {
      return safeJsonValue(value.result);
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
  return value;
}

function normalizeFormula(f) {
  if (!f || typeof f !== "string") return null;
  const t = f.trim();
  if (!t) return null;
  return t.startsWith("=") ? t : `=${t}`;
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`File tidak ditemukan: ${INPUT}`);
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(INPUT);

  const allNames = workbook.worksheets.map((ws) => ws.name);
  console.log("Sheet di workbook:", allNames);

  const dump = {
    meta: {
      source: path.basename(INPUT),
      generatedAt: new Date().toISOString(),
      exceljsVersion: (await import("exceljs/package.json", { assert: { type: "json" } }).catch(() => null))?.default?.version,
    },
    sheets: {},
  };

  for (const sheetName of TARGET_SHEETS) {
    const ws = workbook.getWorksheet(sheetName);
    if (!ws) {
      dump.sheets[sheetName] = {
        error: "Sheet not found",
        availableSheets: allNames,
      };
      continue;
    }

    const dim = ws.dimensions;
    if (!dim || dim.bottom < dim.top) {
      dump.sheets[sheetName] = { cells: {}, note: "empty or no dimensions" };
      continue;
    }

    const cells = {};

    for (let r = dim.top; r <= dim.bottom; r++) {
      for (let c = dim.left; c <= dim.right; c++) {
        const cell = ws.getCell(r, c);
        const formulaRaw = cell.formula;
        const formula = normalizeFormula(formulaRaw);

        const rawValue = cell.value;
        const value = safeJsonValue(rawValue);
        const result = cell.result !== undefined ? safeJsonValue(cell.result) : undefined;

        const isEmpty =
          !formula &&
          (value === null || value === "") &&
          (result === undefined || result === null);

        if (isEmpty) continue;

        const entry = {
          address: cell.address,
          row: cell.row,
          col: cell.col,
          type: cell.type,
          value,
        };
        if (result !== undefined && formula) {
          entry.calculatedResult = result;
        }
        if (formula) {
          entry.formula = formula;
        }

        cells[cell.address] = entry;
      }
    }

    dump.sheets[sheetName] = {
      dimensions: {
        top: dim.top,
        left: dim.left,
        bottom: dim.bottom,
        right: dim.right,
      },
      cellCount: Object.keys(cells).length,
      cells,
    };
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(dump, null, 2), "utf8");
  console.log(`Written: ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});