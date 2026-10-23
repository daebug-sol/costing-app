import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageHeaderWidth = "wide" | "narrow" | "doc";

const widthClass: Record<PageHeaderWidth, string> = {
  wide: "max-w-none",
  narrow: "max-w-[720px]",
  doc: "max-w-3xl",
};

export type PageHeaderProps = {
  title: string;
  /** Record facts only (e.g. "Customer · Status" on a detail page). Never a sentence explaining the page. */
  description?: string;
  /** Kept for call-site compatibility; not rendered. */
  eyebrow?: string;
  actions?: ReactNode;
  width?: PageHeaderWidth;
  className?: string;
  innerClassName?: string;
  /**
   * band — default for PageShell: slim title row with a little more top space.
   * inline — tighter variant for embedded layouts (e.g. Costing).
   */
  variant?: "band" | "inline";
  /** Keep actions on the title row below `sm` instead of stacking under it. */
  inlineActions?: boolean;
};

export function PageHeader({
  title,
  description,
  actions,
  width = "wide",
  className,
  innerClassName,
  variant = "band",
  inlineActions = false,
}: PageHeaderProps) {
  const inner = (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-3 px-4 sm:px-6 lg:px-8",
        widthClass[width],
        variant === "band" ? "pt-5 pb-1" : "pt-4 pb-2",
        innerClassName,
      )}
    >
      <div
        className={cn(
          "flex gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
          inlineActions ? "flex-row items-center justify-between" : "flex-col",
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-foreground text-xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (variant === "inline") {
    return <header className={cn("w-full", className)}>{inner}</header>;
  }

  return <header className={cn("w-full", className)}>{inner}</header>;
}

export { widthClass as pageHeaderWidthClass };
