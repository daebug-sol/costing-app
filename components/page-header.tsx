import type { ReactNode } from "react";
import { dashboardToolbarPanelClass } from "@/components/dashboard/dashboard-surface-styles";
import { cn } from "@/lib/utils";

export type PageHeaderWidth = "wide" | "narrow" | "doc";

const widthClass: Record<PageHeaderWidth, string> = {
  wide: "max-w-[1400px]",
  narrow: "max-w-[720px]",
  doc: "max-w-3xl",
};

export type PageHeaderProps = {
  title: string;
  description?: string;
  /** Short label above the title (e.g. module name). */
  eyebrow?: string;
  actions?: ReactNode;
  width?: PageHeaderWidth;
  className?: string;
  innerClassName?: string;
  /**
   * band — full-width strip with border & surface (default for PageShell).
   * inline — typography block only, for embedded layouts (e.g. Costing).
   */
  variant?: "band" | "inline";
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  width = "wide",
  className,
  innerClassName,
  variant = "band",
}: PageHeaderProps) {
  const inner = (
    <div
      className={cn(
        "mx-auto flex w-full flex-col items-center px-4 text-center sm:px-6 lg:px-8",
        widthClass[width],
        variant === "band" ? "gap-6 py-7 pb-8 sm:py-9 sm:pb-10" : "gap-5 pt-5 pb-4",
        innerClassName
      )}
    >
      <div className="flex w-full max-w-3xl flex-col items-center">
        {eyebrow ? (
          <p className="text-primary mb-2 text-[0.7rem] font-semibold tracking-[0.2em] uppercase sm:text-xs">
            {eyebrow}
          </p>
        ) : null}
        <span
          className="bg-primary mb-4 block h-1 w-14 rounded-full sm:mb-5 sm:w-16"
          aria-hidden
        />
        <h1
          className={cn(
            "font-display text-foreground w-full text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem]",
            "text-balance"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-relaxed text-pretty sm:mt-4 sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={cn(
            dashboardToolbarPanelClass,
            "flex min-h-[4.75rem] w-full max-w-3xl flex-wrap items-center justify-center gap-3 rounded-lg px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4"
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );

  if (variant === "inline") {
    return <header className={cn("w-full", className)}>{inner}</header>;
  }

  return (
    <header
      className={cn(
        "border-border/80 w-full border-b bg-gradient-to-b from-card via-card to-muted/25 shadow-sm",
        className
      )}
    >
      {inner}
    </header>
  );
}

export { widthClass as pageHeaderWidthClass };
