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
  /** wide = full width (dashboard, database, costing header); narrow = 720px (settings) */
  width?: PageHeaderWidth;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  inlineActions?: boolean;
};

const widthClass = {
  wide: "max-w-none",
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
  inlineActions,
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
        inlineActions={inlineActions}
      />
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8",
          widthClass[width],
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
