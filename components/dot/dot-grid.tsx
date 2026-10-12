"use client";

import { useElementSize } from "@/components/dot/use-element-size";
import { fitDotGrid } from "@/lib/dots";
import { cn } from "@/lib/utils";

export type DotGridKind = "solid" | "muted" | "ring" | "small";

const KIND_CLASS: Record<DotGridKind, string> = {
  solid: "fill-foreground",
  muted: "fill-muted-foreground",
  ring: "fill-none stroke-foreground",
  small: "fill-foreground",
};

/**
 * One dot per item, laid out to fill the whole box: the more items, the smaller the dots.
 * `items` gives each dot its kind (e.g. quotation status); render a legend beside it.
 */
export function DotGrid({
  items,
  label,
  minHeight = 140,
  className,
}: {
  items: readonly DotGridKind[];
  label: string;
  minHeight?: number;
  className?: string;
}) {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { cols, rows, cell } = fitDotGrid(items.length, width, height);

  return (
    <div
      ref={ref}
      className={cn("w-full", className)}
      style={{ minHeight, height: "100%" }}
    >
      {cols > 0 ? (
        <svg
          role="img"
          aria-label={label}
          width={cols * cell}
          height={rows * cell}
          viewBox={`0 0 ${cols} ${rows}`}
          className="mx-auto block"
        >
          {items.map((kind, i) => (
            <circle
              key={i}
              cx={(i % cols) + 0.5}
              cy={Math.floor(i / cols) + 0.5}
              r={kind === "small" ? 0.2 : kind === "ring" ? 0.27 : 0.31}
              strokeWidth={kind === "ring" ? 0.1 : 0}
              className={KIND_CLASS[kind]}
            />
          ))}
        </svg>
      ) : null}
    </div>
  );
}
