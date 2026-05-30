import type { ReactNode } from "react";
import { PageHeader, type PageHeaderWidth } from "@/components/page-header";
import { cn } from "@/lib/utils";

type PageShellProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
  /** Optional toolbar beside the title (filters, primary actions). */
  actions?: ReactNode;
  /** wide = 1400px (dashboard, database, costing header); narrow = 720px (settings) */
  width?: PageHeaderWidth;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

const widthClass = {
  wide: "max-w-[1400px]",
  narrow: "max-w-[720px]",
  doc: "max-w-3xl",
} as const;

export function PageShell({
  title,
  description,
  eyebrow,
  children,
  actions,
  width = "wide",
  className,
  headerClassName,
  contentClassName,
}: PageShellProps) {
  return (
    <div className={cn("flex w-full flex-col", className)}>
      <PageHeader
        title={title}
        description={description}
        eyebrow={eyebrow}
        actions={actions}
        width={width}
        className={headerClassName}
      />
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8",
          widthClass[width],
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
