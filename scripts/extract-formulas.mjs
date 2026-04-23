/**
 * Extract cell values + formulas from selected sheets → JSON (merged and/or split).
 * Run from project root: node scripts/extract-formulas.mjs [--list] [--split <dir>] [--merged-only]
 *
 * Requires: Costing AHU DS50.xlsx di root project.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const INPUT = path.join(ROOT, "Costing AHU DS50.xlsx");
const DEFAULT_MERGED = path.join(ROOT, "excel-formulas-dump.json");

/**
 * Sheet yang relevan untuk parity costing AHU (nama persis seperti di Excel).
 * Termasuk DB/catalog & sheet biaya per modul. Sesuaikan jika workbook berubah.
 */
const TARGET_SHEETS = [
  "DB_MOTOR",
  "DB-SanMu Plug Fan",
  "Master",
  "SCU75M1",
  "AHU IU1",
  "VolDamperCost2023 RA ",
  "VolDamperCost2023 FA ",
  "drainpan",
  "1. AHU-Skid",
  "2. AHU-Frame & Panel",
  "3. AHU-Structure",
  "CoilCost 20251027",
  "Quotation",
  "Project Cost",
];

function sanitizeFilename(name) {
  return name.replace(/[/\\:*?"<>|]/g, "_").trim() || "sheet";
}

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
  if (Array.isArray(value)) {
    return value.map((r) => (typeof r === "object" && r && "text" in r ? r.text : r));
  }
  if (typeof value === "object") {
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

function extractSheet(ws) {
  const dim = ws.dimensions;
  if (!dim || dim.bottom < dim.top) {
    return { cells: {}, note: "empty or no dimensions" };
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

  return {
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

async function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes("--list");
  let splitDir = null;
  const mergedIdx = args.indexOf("--split");
  if (mergedIdx !== -1 && args[mergedIdx + 1]) {
    splitDir = path.isAbsolute(args[mergedIdx + 1])
      ? args[mergedIdx + 1]
      : path.join(ROOT, args[mergedIdx + 1]);
  }
  const mergedOnly = args.includes("--merged-only");

  if (!fs.existsSync(INPUT)) {
    console.error(`File tidak ditemukan: ${INPUT}`);
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(INPUT);

  const allNames = workbook.worksheets.map((ws) => ws.name);

  if (listOnly) {
    console.log("Sheets in workbook:");
    allNames.forEach((n) => console.log(`  ${JSON.stringify(n)}`));
    process.exit(0);
  }

  let exceljsVersion;
  try {
    const pkg = await import("exceljs/package.json", { assert: { type: "json" } });
    exceljsVersion = pkg.default?.version;
  } catch {
    exceljsVersion = undefined;
  }

  const dump = {
    meta: {
      source: path.basename(INPUT),
      generatedAt: new Date().toISOString(),
      exceljsVersion,
      sheetNamesInWorkbook: allNames,
      targetSheets: TARGET_SHEETS,
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

    dump.sheets[sheetName] = extractSheet(ws);
  }

  if (!mergedOnly) {
    fs.writeFileSync(DEFAULT_MERGED, JSON.stringify(dump, null, 2), "utf8");
    console.log(`Written: ${DEFAULT_MERGED}`);
  }

  if (splitDir) {
    fs.mkdirSync(splitDir, { recursive: true });
    const index = {
      meta: dump.meta,
      sheets: {},
    };
    for (const sheetName of TARGET_SHEETS) {
      const data = dump.sheets[sheetName];
      const file = `${sanitizeFilename(sheetName)}.json`;
      const full = path.join(splitDir, file);
      fs.writeFileSync(full, JSON.stringify({ sheetName, ...data }, null, 2), "utf8");
      index.sheets[sheetName] = file;
    }
    fs.writeFileSync(path.join(splitDir, "index.json"), JSON.stringify(index, null, 2), "utf8");
    console.log(`Split sheets written under: ${splitDir}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
