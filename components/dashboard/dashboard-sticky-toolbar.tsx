"use client";

import type { ReactNode } from "react";
import { dashboardStickyToolbarShellClass } from "@/components/dashboard/dashboard-surface-styles";
import { cn } from "@/lib/utils";

type DashboardStickyToolbarProps = {
  children: ReactNode;
  visible: boolean;
  className?: string;
};

/**
 * Fixed bar below Navbar — only shown after the hero header scrolls away.
 * Tools align to the left (see DashboardToolbar align="start").
 */
export function DashboardStickyToolbar({ children, visible, className }: DashboardStickyToolbarProps) {
  if (!visible) return null;

  return (
    <div
      data-testid="dashboard-sticky-toolbar"
      className={cn("fixed inset-x-0 top-14 z-40", dashboardStickyToolbarShellClass, className)}
    >
      <div className="mx-auto flex max-w-[1400px] justify-start px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8">
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
