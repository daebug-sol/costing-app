import { hasColumnKey, isLockedColumnId } from "@/lib/custom-db";

export type MandatoryColumnKey = "code" | "name" | "uom" | "price";

export const MANDATORY_DB_HEADER: Record<MandatoryColumnKey, string> = {
  code: "Code",
  name: "Name",
  uom: "UOM",
  price: "Price",
};

const MANDATORY_ORDER: MandatoryColumnKey[] = ["code", "name", "uom", "price"];

/** Skor minimum agar sebuah kolom Excel dianggap cocok dengan salah satu kolom wajib. */
const MIN_MATCH_SCORE = 72;

/**
 * Normalisasi untuk perbandingan: lowercase, rapatkan spasi, hilangkan info dalam kurung di akhir
 * (mis. "Price (IDR)" → "price").
 */
export function normalizeHeaderForExcelMatch(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  for (let i = 0; i < 3; i++) {
    const next = s.replace(/\s*\([^)]*\)\s*$/g, "").trim();
    if (next === s) break;
    s = next;
  }
  return s;
}

function escapeRe(x: string): string {
  return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Skor 0–100: seberapa mirip header Excel dengan nama kanonik (code / name / uom / price).
 */
export function scoreMatchToMandatoryKey(
  normalizedExcel: string,
  key: MandatoryColumnKey
): number {
  const t = key;
  const s = normalizedExcel;
  if (!s) return 0;
  if (s === t) return 100;
  if (new RegExp(`^${escapeRe(t)}\\b`).test(s)) return 92;
  if (new RegExp(`\\b${escapeRe(t)}\\b`).test(s)) return 88;
  const alnum = s.replace(/[^a-z0-9]/g, "");
  const alnumKey = t.replace(/[^a-z0-9]/g, "");
  if (alnum === alnumKey) return 95;
  if (alnum.startsWith(alnumKey) && alnumKey.length >= 3) return 78;

  if (key === "uom") {
    if (s === "unit" || /\bunit of measure\b/.test(s)) return 85;
  }
  if (key === "price") {
    if (/\bamount\b/.test(s) || /\brate\b/.test(s)) return 72;
    if (s === "harga" || /^harga\b/.test(s)) return 90;
  }
  if (key === "code" && (s === "kode" || /^kode\b/.test(s))) return 90;
  if (key === "name" && (s === "nama" || /^nama\b/.test(s))) return 90;

  return 0;
}

function mandatoryKeyFromLockedColumn(column: { id: string }): MandatoryColumnKey | null {
  if (hasColumnKey(column.id, "col_code")) return "code";
  if (hasColumnKey(column.id, "col_name")) return "name";
  if (hasColumnKey(column.id, "col_uom")) return "uom";
  if (hasColumnKey(column.id, "col_price")) return "price";
  return null;
}

/**
 * Cocokkan header Excel ke empat kolom wajib (Code, Name, UOM, Price).
 * Setiap kolom Excel paling banyak memetakan satu kolom wajib (greedy per urutan code→name→uom→price).
 */
export function matchMandatoryExcelHeaders(
  excelHeaders: string[]
):
  | { ok: true; excelToDbHeader: Map<string, string> }
  | { ok: false; missing: MandatoryColumnKey[] } {
  const excelToDbHeader = new Map<string, string>();
  const missing: MandatoryColumnKey[] = [];
  const usedIdx = new Set<number>();

  for (const key of MANDATORY_ORDER) {
    let bestIdx: number | null = null;
    let bestScore = 0;
    for (let i = 0; i < excelHeaders.length; i++) {
      if (usedIdx.has(i)) continue;
      const h = excelHeaders[i]!.trim();
      if (!h) continue;
      const norm = normalizeHeaderForExcelMatch(h);
      const sc = scoreMatchToMandatoryKey(norm, key);
      if (sc > bestScore) {
        bestScore = sc;
        bestIdx = i;
      }
    }
    if (bestIdx !== null && bestScore >= MIN_MATCH_SCORE) {
      usedIdx.add(bestIdx);
      excelToDbHeader.set(excelHeaders[bestIdx]!, MANDATORY_DB_HEADER[key]);
    } else {
      missing.push(key);
    }
  }

  if (missing.length) return { ok: false, missing };
  return { ok: true, excelToDbHeader };
}

/**
 * Resolve kolom impor ke id kolom di DB: cocokkan persis dulu, lalu fuzzy hanya untuk kolom terkunci.
 */
export function resolveImportColumnId(
  incomingHeader: string,
  columns: Array<{ id: string; header: string }>
): string | undefined {
  const trimmed = incomingHeader.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();

  const exact = columns.find((c) => c.header.toLowerCase() === lower);
  if (exact) return exact.id;

  let best: { id: string; score: number } | undefined;
  for (const c of columns) {
    if (!isLockedColumnId(c.id)) continue;
    const mk = mandatoryKeyFromLockedColumn(c);
    if (!mk) continue;
    const norm = normalizeHeaderForExcelMatch(trimmed);
    const sc = scoreMatchToMandatoryKey(norm, mk);
    if (sc >= MIN_MATCH_SCORE && (!best || sc > best.score)) best = { id: c.id, score: sc };
  }
  return best?.id;
}
