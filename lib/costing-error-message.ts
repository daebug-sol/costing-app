const DEFAULT_MESSAGE = "Terjadi kesalahan. Coba lagi.";

/** Human-readable text for a failed costing action (never a raw JS error name). */
export function costingErrorMessage(e: unknown, fallback = DEFAULT_MESSAGE): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  const text = raw.trim();
  if (!text || /^\w*Error:/.test(text)) return fallback;
  return text;
}
