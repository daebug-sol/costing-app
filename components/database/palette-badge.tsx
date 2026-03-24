"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PALETTE = [
  "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
  "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
  "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
  "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200",
  "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-200",
];

export function PaletteBadge({ label }: { label: string }) {
  let h = 0;
  for (let i = 0; i < label.length; i++) {
    h = (h + label.charCodeAt(i) * (i + 1)) % 1_000_000_007;
  }
  const cls = PALETTE[h % PALETTE.length]!;
  return (
    <Badge variant="outline" className={cn("font-normal", cls)}>
      {label}
    </Badge>
  );
}
