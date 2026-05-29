import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  /** Optional toolbar beside the title (filters, primary actions). */
  actions?: ReactNode;
  /** wide = 1400px (dashboard, database, costing header); narrow = 720px (settings) */
  width?: "wide" | "narrow" | "doc";
  className?: string;
  headerClassName?: string;
};

const widthClass = {
  wide: "max-w-[1400px]",
  narrow: "max-w-[720px]",
  doc: "max-w-3xl",
} as const;

export function PageShell({
  title,
  description,
  children,
  actions,
  width = "wide",
  className,
  headerClassName,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8",
        widthClass[width],
        className
      )}
    >
      <header
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          headerClassName
        )}
      >
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </header>
      {children}
    </div>
  );
}
