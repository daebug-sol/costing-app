/** Pure geometry for the Dot Matrix primitives (components/dot/*). */

export type DotGridFit = { cols: number; rows: number; cell: number };

/** Largest square cell that fits `count` dots in a width x height box. */
export function fitDotGrid(count: number, width: number, height: number): DotGridFit {
  if (!(count > 0) || !(width > 0) || !(height > 0)) return { cols: 0, rows: 0, cell: 0 };
  let best: DotGridFit = { cols: 0, rows: 0, cell: 0 };
  for (let cols = 1; cols <= count; cols += 1) {
    const rows = Math.ceil(count / cols);
    const cell = Math.min(width / cols, height / rows);
    if (cell > best.cell) best = { cols, rows, cell };
  }
  return best;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Lit dot count for a 0-100 value; `pointer` is the pace marker index or null. */
export function meterFill(
  pct: number,
  cols: number,
  pace?: number | null
): { lit: number; pointer: number | null } {
  const value = Number.isFinite(pct) ? clamp(pct, 0, 100) : 0;
  const lit = value > 0 ? Math.max(1, Math.round((cols * value) / 100)) : 0;
  const pointer =
    pace == null || !Number.isFinite(pace)
      ? null
      : clamp(Math.floor((cols * clamp(pace, 0, 100)) / 100), 0, cols - 1);
  return { lit: Math.min(lit, cols), pointer };
}

export type RingDot = { x: number; y: number; lit: boolean; index: number };

/** `n` dots on a circle of `radius` centred in a square `size` box, clockwise from 12 o'clock. */
export function ringDotPositions(n: number, pct: number, radius: number, size: number): RingDot[] {
  const lit = Math.round((n * (Number.isFinite(pct) ? clamp(pct, 0, 100) : 0)) / 100);
  const c = size / 2;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: c + Math.cos(a) * radius, y: c + Math.sin(a) * radius, lit: i < lit, index: i };
  });
}

const fmt = (n: number) => String(Number(n.toFixed(2)));

/** Monotone cubic (Fritsch-Carlson) through the points as an SVG path; never overshoots. */
export function monotoneCurvePath(points: ReadonlyArray<readonly [number, number]>): string {
  const n = points.length;
  if (n === 0) return "";
  const [x0, y0] = points[0]!;
  if (n === 1) return `M${fmt(x0)},${fmt(y0)}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const w = points[i + 1]![0] - points[i]![0];
    dx.push(w);
    slope.push(w === 0 ? 0 : (points[i + 1]![1] - points[i]![1]) / w);
  }
  const tan: number[] = new Array(n);
  tan[0] = slope[0]!;
  tan[n - 1] = slope[n - 2]!;
  for (let i = 1; i < n - 1; i += 1) {
    const a = slope[i - 1]!;
    const b = slope[i]!;
    tan[i] = a * b <= 0 ? 0 : (a + b) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    const s = slope[i]!;
    if (s === 0) {
      tan[i] = 0;
      tan[i + 1] = 0;
      continue;
    }
    const a = tan[i]! / s;
    const b = tan[i + 1]! / s;
    const h = Math.hypot(a, b);
    if (h > 3) {
      tan[i] = (3 * a * s) / h;
      tan[i + 1] = (3 * b * s) / h;
    }
  }
  let d = `M${fmt(x0)},${fmt(y0)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const [xa, ya] = points[i]!;
    const [xb, yb] = points[i + 1]!;
    const w = dx[i]! / 3;
    d += `C${fmt(xa + w)},${fmt(ya + tan[i]! * w)},${fmt(xb - w)},${fmt(yb - tan[i + 1]! * w)},${fmt(xb)},${fmt(yb)}`;
  }
  return d;
}
