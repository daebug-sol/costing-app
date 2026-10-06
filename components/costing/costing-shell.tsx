"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CostingLevel =
  | "project"
  | "assembly"
  | "segment"
  | "module"
  | "summary";

const levelSurface: Record<CostingLevel, string> = {
  project: "bg-card border border-border",
  assembly: "space-y-4 border-t border-border pt-4",
  segment: "rounded-md border border-border bg-card",
  module:
    "rounded-md border border-dashed border-border/70 bg-muted/30",
  summary: "bg-card border border-border",
};

const levelPadding: Record<CostingLevel, string> = {
  project: "p-5 sm:p-6",
  assembly: "",
  segment: "p-4 sm:p-5",
  module: "p-3 sm:p-4",
  summary: "p-4 sm:p-5",
};

const levelHeading: Record<CostingLevel, string> = {
  project: "text-base font-semibold text-foreground",
  assembly: "text-sm font-semibold text-foreground",
  segment: "text-sm font-semibold text-foreground",
  module:
    "text-xs font-semibold tracking-wide text-muted-foreground uppercase",
  summary: "text-sm font-semibold text-foreground",
};

export function costingLevelClass(
  level: CostingLevel,
  part: "surface" | "padding" | "heading"
) {
  if (part === "surface") return levelSurface[level];
  if (part === "padding") return levelPadding[level];
  return levelHeading[level];
}

type CostingShellProps = {
  level: CostingLevel;
  className?: string;
  children: ReactNode;
  as?: "div" | "section";
};

export function CostingShell({
  level,
  className,
  children,
  as: Tag = "div",
}: CostingShellProps) {
  return (
    <Tag
      className={cn(
        levelSurface[level],
        levelPadding[level],
        className
      )}
    >
      {children}
    </Tag>
  );
}

type CostingLevelHeadingProps = {
  level: CostingLevel;
  as?: "h2" | "h3" | "h4" | "h5";
  className?: string;
  children: ReactNode;
};

export function CostingLevelHeading({
  level,
  as: Tag = "h3",
  className,
  children,
}: CostingLevelHeadingProps) {
  return <Tag className={cn(levelHeading[level], className)}>{children}</Tag>;
}

type CostingBreadcrumbProps = {
  projectName: string;
  segmentTitle: string;
  segmentKind: "AHU" | "Manual";
  className?: string;
};

export function CostingBreadcrumb({
  projectName,
  segmentTitle,
  segmentKind,
  className,
}: CostingBreadcrumbProps) {
  return (
    <nav
      aria-label="Lokasi item"
      className={cn(
        "text-muted-foreground mb-3 flex min-w-0 flex-wrap items-center gap-1 text-xs",
        className
      )}
    >
      <span className="max-w-[12rem] truncate font-medium text-foreground">
        {projectName}
      </span>
      <span aria-hidden className="text-muted-foreground/80">
        ›
      </span>
      <span className="min-w-0 truncate">
        {segmentTitle}{" "}
        <span className="text-muted-foreground">({segmentKind})</span>
      </span>
    </nav>
  );
}
