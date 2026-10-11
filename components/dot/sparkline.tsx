import { cn } from "@/lib/utils";

export type SparklineTone = "positive" | "signal";

/** Tiny trend line with a coloured end dot and direction triangle. Decorative: pair with text. */
export function Sparkline({
  data,
  reference,
  tone,
  direction,
  className,
}: {
  data: readonly number[];
  /** Optional dashed reference level (e.g. target). */
  reference?: number | null;
  tone: SparklineTone;
  direction: "up" | "down";
  className?: string;
}) {
  const W = 64;
  const H = 24;
  if (data.length < 2) return null;
  const all = reference == null ? data : [...data, reference];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const px = (i: number) => 2 + (i * (W - 8)) / (data.length - 1);
  const py = (v: number) => H - 3 - ((v - min) / (max - min || 1)) * (H - 6);
  const points = data.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const last = data.length - 1;
  const fill = tone === "positive" ? "fill-positive" : "fill-signal";
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {reference == null ? null : (
          <line
            x1={2}
            x2={W - 6}
            y1={py(reference)}
            y2={py(reference)}
            className="stroke-muted-foreground"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        )}
        <polyline
          points={points}
          fill="none"
          className="stroke-foreground"
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={px(last)} cy={py(data[last]!)} r={3.2} className={fill} />
      </svg>
      <svg width={10} height={10} viewBox="0 0 10 10">
        <path d={direction === "up" ? "M5 1L9.5 9H.5Z" : "M5 9L.5 1h9Z"} className={fill} />
      </svg>
    </span>
  );
}
