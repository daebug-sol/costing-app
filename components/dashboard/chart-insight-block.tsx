"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TableLoadingSkeleton } from "@/components/table-loading-skeleton";
import {
  insightAccentClass,
  type DashboardInsightAccent,
} from "@/components/dashboard/dashboard-surface-styles";
import { cn } from "@/lib/utils";

type ChartInsightBlockProps = {
  title: string;
  description: string;
  loading: boolean;
  children: ReactNode;
  detailTitle?: string;
  detailDescription?: string;
  detailContent?: ReactNode;
  /** Color-block variant for subsegment hierarchy. */
  accent?: DashboardInsightAccent;
  className?: string;
};

export function ChartInsightBlock({
  title,
  description,
  loading,
  children,
  detailTitle,
  detailDescription,
  detailContent,
  accent = "status",
  className,
}: ChartInsightBlockProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const sheetTitle = detailTitle ?? title;
  const sheetDescription = detailDescription ?? description;

  return (
    <article
      className={cn(
        "relative min-w-0 overflow-hidden rounded-none border p-4 shadow-sm sm:p-5",
        insightAccentClass(accent, "surface"),
        className
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1 rounded-r-full",
          insightAccentClass(accent, "stripe")
        )}
        aria-hidden
      />
      <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <h3 className={cn("text-base font-semibold", insightAccentClass(accent, "header"))}>
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {detailContent ? (
          <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="default" size="sm" className="shrink-0">
                Lihat detail
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>{sheetTitle}</SheetTitle>
                <SheetDescription>{sheetDescription}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 pb-8">{detailOpen ? detailContent : null}</div>
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
      <div className="mt-4 rounded-none border border-border/50 bg-background/60 p-3 pl-2 sm:p-4">
        {loading ? <TableLoadingSkeleton columns={3} rows={4} /> : children}
      </div>
    </article>
  );
}
