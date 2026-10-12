import { ringDotPositions } from "@/lib/dots";
import { cn } from "@/lib/utils";

/** Circular progress drawn as dots; `value` is 0-100. Put a DotNumber in the middle via children. */
export function DotRing({
  value,
  label,
  dots = 72,
  pointer = false,
  className,
  children,
}: {
  value: number;
  label: string;
  dots?: number;
  /** Draw the dot at the current position in signal red. */
  pointer?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const ring = ringDotPositions(dots, value, 70, 160);
  const litCount = ring.filter((d) => d.lit).length;
  return (
    <div className={cn("relative aspect-square w-full", className)}>
      <svg role="img" aria-label={label} viewBox="0 0 160 160" className="block size-full">
        {ring.map((d) => {
          const isPointer = pointer && d.index === litCount;
          return (
            <circle
              key={d.index}
              cx={d.x}
              cy={d.y}
              r={isPointer ? 4.6 : 2.6}
              className={
                isPointer
                  ? "fill-signal"
                  : d.lit
                    ? "fill-foreground"
                    : "fill-muted-foreground/30"
              }
            />
          );
        })}
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}
