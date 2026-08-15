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
import type { DashboardInsightAccent } from "@/components/dashboard/dashboard-surface-styles";
import { cn } from "@/lib/utils";

type ChartInsightBlockProps = {
  title: string;
  /** Optional; shown in detail sheet only when provided. */
  description?: string;
  loading: boolean;
  children: ReactNode;
  detailTitle?: string;
  detailDescription?: string;
  detailContent?: ReactNode;
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
  accent: _accent = "status",
  className,
}: ChartInsightBlockProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const sheetTitle = detailTitle ?? title;
  const sheetDescription = detailDescription ?? description;

  return (
    <article
      className={cn(
        "relative min-w-0 overflow-hidden rounded-none border border-border bg-card p-4 sm:p-5",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        {detailContent ? (
          <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="shrink-0">
                Lihat detail
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>{sheetTitle}</SheetTitle>
                {sheetDescription ? <SheetDescription>{sheetDescription}</SheetDescription> : null}
              </SheetHeader>
              <div className="mt-6 pb-8">{detailOpen ? detailContent : null}</div>
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
      <div className="mt-4 min-w-0">
        {loading ? <TableLoadingSkeleton columns={3} rows={4} /> : children}
      </div>
    </article>
  );
}
