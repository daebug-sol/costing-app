"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DashboardStickyToolbarProps = {
  children: ReactNode;
  visible: boolean;
  className?: string;
};

/**
 * Fixed bar below Navbar — only shown after the hero header scrolls away.
 * Tools align to the right (see DashboardToolbar align="end").
 */
export function DashboardStickyToolbar({ children, visible, className }: DashboardStickyToolbarProps) {
  if (!visible) return null;

  return (
    <div
      data-testid="dashboard-sticky-toolbar"
      className={cn(
        "fixed inset-x-0 top-14 z-40 border-b border-border/80 bg-background/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        className
      )}
    >
      <div className="mx-auto flex max-w-[1400px] justify-end px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
