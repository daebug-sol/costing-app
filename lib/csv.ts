/** Minimal RFC-style CSV parser (quoted fields, comma separator) */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushRow = () => {
    row.push(field);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
    field = "";
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      pushRow();
    } else if (c === "\r") {
      if (text[i + 1] === "\n") i++;
      pushRow();
    } else {
      field += c;
    }
  }

  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);

  return rows;
}

export function toCsv(rows: string[][]): string {
  return rows
    .map((r) =>
      r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
