import { NextResponse } from "next/server";
import {
  columnHeaderToVariableKey,
  computeNumericVariablesForRow,
  evaluateFormulaExpression,
  resolveColumnIdByKey,
} from "@/lib/custom-db";
import { resolveImportColumnId } from "@/lib/excel-column-match";
import { prisma } from "@/lib/prisma";

type ImportRow = Record<string, unknown>;

function toRaw(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toNumber(raw: string): number | null {
  const n = Number(raw.replace(/,/g, "").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      tableId?: string;
      headers?: string[];
      rows?: ImportRow[];
    };
    const tableId = String(body.tableId ?? "").trim();
    const headers = Array.isArray(body.headers) ? body.headers.map((h) => String(h).trim()) : [];
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!tableId || headers.length === 0 || rows.length === 0) {
      return NextResponse.json(
        { error: "tableId, headers, and rows are required" },
        { status: 400 }
      );
    }

    const table = await prisma.customDbTable.findUnique({
      where: { id: tableId },
      include: { columns: { orderBy: { sortOrder: "asc" } } },
    });
    if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

    const colByHeader = new Map(table.columns.map((c) => [c.header.toLowerCase(), c.id]));
    const mappedHeaders = headers.filter((h) => {
      const t = String(h).trim();
      if (!t) return false;
      if (colByHeader.has(t.toLowerCase())) return true;
      return resolveImportColumnId(t, table.columns) !== undefined;
    });
    if (mappedHeaders.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada header Excel yang cocok dengan kolom di file target" },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.customDbRow.aggregate({
      where: { tableId },
      _max: { sortOrder: true },
    });
    const startOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const rowRecords = rows.map((_, idx) => ({
      id: crypto.randomUUID(),
      tableId,
      sortOrder: startOrder + idx,
    }));

    for (const batch of chunk(rowRecords, 500)) {
      await prisma.customDbRow.createMany({ data: batch });
    }

    const priceColumnId = resolveColumnIdByKey(table.columns, "col_price");
    const formulaColumnId = resolveColumnIdByKey(table.columns, "col_formula");
    const settings = await prisma.appSettings.findFirst();

    const cellRecords: Array<{
      rowId: string;
      columnId: string;
      rawValue: string;
      computedValue: number | null;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const rec = rows[i]!;
      const rowId = rowRecords[i]!.id;

      const rowCellMap = new Map<string, { rawValue: string; computedValue: number | null }>();

      for (const h of mappedHeaders) {
        const colId =
          colByHeader.get(h.toLowerCase()) ?? resolveImportColumnId(h, table.columns);
        if (!colId) continue;
        const rawValue = toRaw(rec[h]);
        if (!rawValue) continue;
        if (rawValue.trimStart().startsWith("=")) {
          rowCellMap.set(colId, { rawValue, computedValue: null });
        } else {
          rowCellMap.set(colId, { rawValue, computedValue: toNumber(rawValue) });
        }
      }

      const byCol = new Map(
        Array.from(rowCellMap.entries()).map(([columnId, v]) => [
          columnId,
          { rawValue: v.rawValue, computedValue: v.computedValue },
        ])
      );
      const variables = computeNumericVariablesForRow(table.columns, byCol);

      for (const [colId, c] of rowCellMap) {
        if (c.rawValue.trimStart().startsWith("=")) {
          const res = evaluateFormulaExpression(c.rawValue, variables);
          c.computedValue = res.ok ? res.value : 0;
        }
      }

      if (priceColumnId && formulaColumnId) {
        const f = rowCellMap.get(formulaColumnId)?.rawValue?.trim();
        if (f) {
          const result = evaluateFormulaExpression(f, variables);
          rowCellMap.set(priceColumnId, {
            rawValue: String(result.value),
            computedValue: result.ok ? result.value : 0,
          });
        }
      }

      const textValues: Record<string, string> = {};
      for (const col of table.columns) {
        const key = columnHeaderToVariableKey(col.header);
        textValues[key] = rowCellMap.get(col.id)?.rawValue?.trim() ?? "";
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
        rowCellMap.set(priceColumnId, {
          rawValue: String(converted),
          computedValue: converted,
        });
      }

      for (const [columnId, c] of rowCellMap) {
        cellRecords.push({
          rowId,
          columnId,
          rawValue: c.rawValue,
          computedValue: c.computedValue,
        });
      }
    }

    for (const batch of chunk(cellRecords, 1000)) {
      await prisma.customDbCell.createMany({ data: batch });
    }

    return NextResponse.json({
      ok: true,
      importedRows: rowRecords.length,
      importedCells: cellRecords.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to import excel data" }, { status: 500 });
  }
}

