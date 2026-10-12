import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Hero number in the Doto dot font (KPI values, clock). Pass the already formatted string. */
export function DotNumber({
  className,
  children,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="dot-number"
      className={cn(
        "font-dot leading-none font-black tracking-wide tabular-nums",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
