"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DemoShell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-muted/40 p-4",
        className
      )}
      data-testid="help-demo"
      aria-label={label}
    >
      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
        Demo
      </p>
      <div className="relative min-h-[160px] rounded-lg border border-border bg-card p-3 shadow-sm">
        {children}
      </div>
    </div>
  );
}
