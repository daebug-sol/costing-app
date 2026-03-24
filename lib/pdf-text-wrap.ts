import type { jsPDF } from "jspdf";

const ZWSP = "\u200b";

/** Sisipkan titik potong lunak agar jsPDF bisa memecah token panjang tanpa spasi. */
export function softBreakLongTokens(text: string, maxRun = 36): string {
  if (text.length <= maxRun) return text;
  let s = text;
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(
      new RegExp(`([^\\s\\u200b]{${maxRun}})([^\\s\\u200b])`, "g"),
      `$1${ZWSP}$2`
    );
  }
  return s;
}

/** Pecah teks per baris (Enter), lalu wrap ke lebar mm; gabungkan jadi array baris PDF. */
export function wrapMultilineForPdf(
  doc: jsPDF,
  text: string,
  maxWidthMm: number
): string[] {
  const norm = text.replace(/\r\n/g, "\n");
  const out: string[] = [];
  for (const rawLine of norm.split("\n")) {
    if (rawLine === "") {
      out.push("");
      continue;
    }
    const softened = softBreakLongTokens(rawLine, 40);
    const chunk = doc.splitTextToSize(softened, maxWidthMm) as string[];
    out.push(...chunk);
  }
  return out;
}
