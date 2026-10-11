import { meterFill } from "@/lib/dots";
import { cn } from "@/lib/utils";

export type DotMeterTone = "ink" | "signal" | "positive";

const FILL: Record<DotMeterTone, string> = {
  ink: "fill-foreground",
  signal: "fill-signal",
  positive: "fill-positive",
};

/** One row of dots; `value` is 0-100. `pace` (0-100) draws a pointer dot in signal red. */
export function DotMeter({
  value,
  label,
  cols = 24,
  pace = null,
  tone = "ink",
  className,
}: {
  value: number;
  /** Accessible name, e.g. "Target tercapai 60 persen". */
  label: string;
  cols?: number;
  pace?: number | null;
  tone?: DotMeterTone;
  className?: string;
}) {
  const { lit, pointer } = meterFill(value, cols, pace);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${cols * 8} 8`}
      className={cn("block h-auto w-full", className)}
    >
      {Array.from({ length: cols }, (_, i) => {
        const isPointer = i === pointer;
        return (
          <circle
            key={i}
            cx={i * 8 + 4}
            cy={4}
            r={isPointer ? 3.2 : 2}
            className={
              isPointer ? "fill-signal" : i < lit ? FILL[tone] : "fill-muted-foreground/30"
            }
          />
        );
      })}
    </svg>
  );
}
