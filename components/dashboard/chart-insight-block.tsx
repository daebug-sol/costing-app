"use client";

import type { ReactNode } from "react";
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
import { cn } from "@/lib/utils";

type ChartInsightBlockProps = {
  title: string;
  description: string;
  loading: boolean;
  children: ReactNode;
  detailTitle?: string;
  detailDescription?: string;
  detailContent?: ReactNode;
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
  className,
}: ChartInsightBlockProps) {
  const sheetTitle = detailTitle ?? title;
  const sheetDescription = detailDescription ?? description;

  return (
    <article
      className={cn(
        "min-w-0 rounded-lg border border-border/80 bg-card/60 p-4 shadow-sm ring-1 ring-foreground/5",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {detailContent ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="shrink-0">
                Lihat detail
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>{sheetTitle}</SheetTitle>
                <SheetDescription>{sheetDescription}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 pb-8">{detailContent}</div>
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
      <div className="mt-4">
        {loading ? <TableLoadingSkeleton columns={3} rows={4} /> : children}
      </div>
    </article>
  );
}
