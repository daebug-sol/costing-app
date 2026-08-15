import { cn } from "@/lib/utils";

type AssemblyTypeBadgeProps = {
  variant: "ahu" | "manual" | "sub-assembly";
  className?: string;
};

const LABEL: Record<AssemblyTypeBadgeProps["variant"], string> = {
  ahu: "AHU",
  manual: "Manual",
  "sub-assembly": "Kelompok",
};

/** Inline type label (not a bordered pill). `sub-assembly` kept for TS; prefer not rendering it in UI. */
export function AssemblyTypeBadge({ variant, className }: AssemblyTypeBadgeProps) {
  return (
    <span
      className={cn(
        "shrink-0 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase",
        className
      )}
    >
      {LABEL[variant]}
    </span>
  );
}
