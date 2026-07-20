import type { ReactNode } from "react";
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
  /** Kept for call-site compatibility; not rendered. */
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
  actions,
  width = "wide",
  className,
  innerClassName,
  variant = "band",
}: PageHeaderProps) {
  const inner = (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-3 px-4 sm:px-6 lg:px-8",
        widthClass[width],
        variant === "band" ? "py-5 sm:py-6" : "pt-4 pb-3",
        innerClassName
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight text-balance">
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

  return (
    <header className={cn("border-border w-full border-b bg-card", className)}>
      {inner}
    </header>
  );
}

export { widthClass as pageHeaderWidthClass };
