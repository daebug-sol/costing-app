import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AssemblyTypeBadgeProps = {
  variant: "ahu" | "manual" | "sub-assembly";
  className?: string;
};

const LABEL: Record<AssemblyTypeBadgeProps["variant"], string> = {
  ahu: "AHU",
  manual: "Manual",
  "sub-assembly": "Sub-assembly",
};

export function AssemblyTypeBadge({ variant, className }: AssemblyTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        variant === "ahu" &&
          "border-primary/35 bg-primary/10 text-primary dark:border-primary/50 dark:bg-primary/20 dark:text-primary-foreground",
        (variant === "manual" || variant === "sub-assembly") &&
          "border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-600 dark:bg-violet-950/90 dark:text-violet-50",
        className
      )}
    >
      {LABEL[variant]}
    </Badge>
  );
}
