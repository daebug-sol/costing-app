/** Formats phone as +XX-XXX-XXX-XXXX (Indonesia-friendly: +62-XXX-XXX-XXXX). */

export function formatPhoneDash(input: string): string {
  const raw = input.replace(/[^\d+]/g, "");
  if (!raw) return "";

  let digits = raw.startsWith("+") ? raw.slice(1).replace(/\D/g, "") : raw.replace(/\D/g, "");

  if (!digits) return raw.startsWith("+") ? "+" : "";

  if (!raw.startsWith("+")) {
    if (digits.startsWith("0")) digits = "62" + digits.slice(1);
    else if (!digits.startsWith("62")) digits = "62" + digits;
  }

  const cc = digits.slice(0, 2);
  const rest = digits.slice(2);
  const a = rest.slice(0, 3);
  const b = rest.slice(3, 6);
  const c = rest.slice(6, 10);
  const d = rest.slice(10);

  let out = `+${cc}`;
  if (a) out += `-${a}`;
  if (b) out += `-${b}`;
  if (c) out += `-${c}`;
  if (d) out += `-${d}`;
  return out;
}
