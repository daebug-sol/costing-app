"use client";

import ExcelJS from "exceljs";

function cellToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    if ("result" in o && o.result != null) {
      const r = o.result;
      if (typeof r === "number") return String(r);
      if (typeof r === "string") return r;
    }
    if (
      "richText" in o &&
      Array.isArray((o as { richText: { text: string }[] }).richText)
    ) {
      return (o as { richText: { text: string }[] }).richText
        .map((x) => x.text)
        .join("");
    }
  }
  return String(v);
}

export async function exportDatabaseSheet(
  filename: string,
  header: string[],
  data: (string | number | boolean | null | undefined)[][]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.addRow(header);
  for (const row of data) {
    ws.addRow(row);
  }
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function parseXlsxFirstSheet(file: File): Promise<{
  headers: string[];
  rows: Record<string, string>[];
}> {
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], rows: [] };

  const matrix: unknown[][] = [];
  ws.eachRow((row) => {
    const arr: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      arr[colNumber - 1] = cell.value;
    });
    matrix.push(arr);
  });

  if (matrix.length === 0) return { headers: [], rows: [] };

  const headerRow = matrix[0]!.map((h) => String(h ?? "").trim());
  const dataRows = matrix.slice(1);
  const rows: Record<string, string>[] = [];

  for (const r of dataRows) {
    const rec: Record<string, string> = {};
    for (let i = 0; i < headerRow.length; i++) {
      const key = headerRow[i];
      if (!key) continue;
      rec[key] = cellToString(r[i]).trim();
    }
    rows.push(rec);
  }

  return { headers: headerRow, rows };
}

export function validateRequiredColumns(
  headers: Set<string>,
  required: readonly string[]
): string[] {
  return required.filter((c) => !headers.has(c));
}
