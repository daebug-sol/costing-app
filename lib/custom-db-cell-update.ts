import {
  columnHeaderToVariableKey,
  computeNumericVariablesForRow,
  evaluateFormulaExpression,
  resolveColumnIdByKey,
} from "@/lib/custom-db";
import { prisma } from "@/lib/prisma";

/**
 * Full cell update: upsert raw, recompute formula on column, cascade formula→price,
 * and apply raw_price × forex → Price when applicable.
 */
export async function applyCustomDbCellValue(
  rowId: string,
  columnId: string,
  rawValue: string
) {
  const row = await prisma.customDbRow.findUnique({
    where: { id: rowId },
    include: {
      table: { include: { columns: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!row) throw new Error("Row not found");

  const settings = await prisma.appSettings.findFirst();

  await prisma.customDbCell.upsert({
    where: { rowId_columnId: { rowId, columnId } },
    create: { rowId, columnId, rawValue, computedValue: null },
    update: { rawValue },
  });

  const rowCells = await prisma.customDbCell.findMany({ where: { rowId } });
  const byCol = new Map(rowCells.map((c) => [c.columnId, c]));

  const textValues: Record<string, string> = {};
  for (const col of row.table.columns) {
    const cell = byCol.get(col.id);
    const key = columnHeaderToVariableKey(col.header);
    textValues[key] = String(cell?.rawValue ?? "").trim();
  }

  const variables = computeNumericVariablesForRow(row.table.columns, byCol);
  const currentCol = row.table.columns.find((c) => c.id === columnId);
  const currentKey = currentCol ? columnHeaderToVariableKey(currentCol.header) : "";

  const rawTrim = rawValue.trim();
  let computedValue: number | null = null;
  if (rawTrim.startsWith("=")) {
    computedValue = currentKey ? (variables[currentKey] ?? 0) : 0;
  } else {
    const n = Number(rawTrim.replace(/,/g, ""));
    computedValue = Number.isFinite(n) ? n : null;
  }

  const saved = await prisma.customDbCell.update({
    where: { rowId_columnId: { rowId, columnId } },
    data: { computedValue },
  });

  const priceColumnId = resolveColumnIdByKey(row.table.columns, "col_price");
  const formulaColumnId = resolveColumnIdByKey(row.table.columns, "col_formula");
  if (priceColumnId && columnId !== priceColumnId) {
    const formulaCell = await prisma.customDbCell.findUnique({
      where: { rowId_columnId: { rowId, columnId: formulaColumnId ?? "" } },
    });
    if (formulaCell?.rawValue) {
      const result = evaluateFormulaExpression(formulaCell.rawValue, variables);
      await prisma.customDbCell.upsert({
        where: { rowId_columnId: { rowId, columnId: priceColumnId } },
        create: {
          rowId,
          columnId: priceColumnId,
          rawValue: String(result.value),
          computedValue: result.ok ? result.value : 0,
        },
        update: {
          rawValue: String(result.value),
          computedValue: result.ok ? result.value : 0,
        },
      });
    }
  }

  const rawPriceKey = Object.keys(textValues).find(
    (k) => k === "raw_price" || k.endsWith("_raw_price")
  );
  const currencyKey = Object.keys(textValues).find(
    (k) => k === "currency" || k.endsWith("_currency")
  );
  if (rawPriceKey && currencyKey && priceColumnId) {
    const rawPrice = Number(textValues[rawPriceKey]);
    const currency = textValues[currencyKey].toUpperCase();
    const rateMap: Record<string, number> = {
      IDR: 1,
      USD: settings?.forexUSD ?? 0,
      EUR: settings?.forexEUR ?? 0,
      RM: settings?.forexRM ?? 0,
      SGD: settings?.forexSGD ?? 0,
    };
    const rate = rateMap[currency] ?? 0;
    const converted = Number.isFinite(rawPrice) ? rawPrice * rate : 0;
    await prisma.customDbCell.upsert({
      where: { rowId_columnId: { rowId, columnId: priceColumnId } },
      create: {
        rowId,
        columnId: priceColumnId,
        rawValue: String(converted),
        computedValue: converted,
      },
      update: {
        rawValue: String(converted),
        computedValue: converted,
      },
    });
  }

  return saved;
}
