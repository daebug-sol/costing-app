"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Muted categorical tones from theme tokens (not full Tailwind rainbow). */
const PALETTE = [
  "border-category-1/30 bg-category-1-muted text-category-1",
  "border-category-2/30 bg-category-2-muted text-category-2",
  "border-category-3/30 bg-category-3-muted text-category-3",
  "border-category-4/30 bg-category-4-muted text-category-4",
  "border-category-5/30 bg-category-5-muted text-category-5",
  "border-category-6/30 bg-category-6-muted text-category-6",
] as const;

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
