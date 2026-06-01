import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type PageRouteSkeletonVariant =
  | "dashboard"
  | "database"
  | "costing"
  | "documentation"
  | "settings"
  | "default";

function PageHeaderSkeleton({
  width = "wide",
  hasToolbar = false,
}: {
  width?: "wide" | "narrow" | "doc";
  hasToolbar?: boolean;
}) {
  const maxW =
    width === "narrow"
      ? "max-w-[720px]"
      : width === "doc"
        ? "max-w-3xl"
        : "max-w-[1400px]";

  return (
    <header className="w-full border-b border-border/80 bg-gradient-to-b from-card via-card to-muted/25 shadow-sm">
      <div
        className={cn(
          "mx-auto flex w-full flex-col items-center gap-6 px-4 py-7 pb-8 sm:px-6 sm:py-9 sm:pb-10 lg:px-8",
          maxW
        )}
      >
        <div className="flex w-full max-w-3xl flex-col items-center gap-3">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-1 w-14 rounded-full" />
          <Skeleton className="h-10 w-56 max-w-full rounded-md sm:h-12 sm:w-72" />
          <Skeleton className="h-4 w-full max-w-md rounded-md" />
          <Skeleton className="h-4 w-[85%] max-w-sm rounded-md" />
        </div>
        {hasToolbar ? (
          <Skeleton className="h-[4.75rem] w-full max-w-3xl rounded-lg" />
        ) : null}
      </div>
    </header>
  );
}

function ContentShell({
  width = "wide",
  children,
}: {
  width?: "wide" | "narrow" | "doc";
  children: ReactNode;
}) {
  const maxW =
    width === "narrow"
      ? "max-w-[720px]"
      : width === "doc"
        ? "max-w-3xl"
        : "max-w-[1400px]";

  return (
    <div
      className={cn(
        "mx-auto flex w-full min-h-[calc(100vh-3.5rem)] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8",
        maxW
      )}
    >
      {children}
    </div>
  );
}

function DashboardBodySkeleton() {
  return (
    <ContentShell>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-11 w-full max-w-2xl rounded-full" />
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    </ContentShell>
  );
}

function DatabaseBodySkeleton() {
  return (
    <ContentShell>
      <Skeleton className="h-11 w-full max-w-xl rounded-full" />
      <Skeleton className="h-11 w-full max-w-3xl rounded-full" />
      <Skeleton className="h-10 w-full max-w-lg rounded-md" />
      <Skeleton className="min-h-[28rem] w-full rounded-lg" />
    </ContentShell>
  );
}

function CostingBodySkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col border-t border-border">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Skeleton className="h-48 w-full shrink-0 lg:h-auto lg:w-72 xl:w-80" />
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="min-h-[24rem] flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function DocumentationBodySkeleton() {
  return (
    <ContentShell width="doc">
      <Skeleton className="h-10 w-full rounded-md" />
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem] w-full rounded-lg" />
        ))}
      </div>
    </ContentShell>
  );
}

function SettingsBodySkeleton() {
  return (
    <ContentShell width="narrow">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-52 w-full rounded-lg" />
      ))}
    </ContentShell>
  );
}

export function PageRouteSkeleton({
  variant = "default",
}: {
  variant?: PageRouteSkeletonVariant;
}) {
  switch (variant) {
    case "dashboard":
      return (
        <>
          <PageHeaderSkeleton hasToolbar />
          <DashboardBodySkeleton />
        </>
      );
    case "database":
      return (
        <>
          <PageHeaderSkeleton />
          <DatabaseBodySkeleton />
        </>
      );
    case "costing":
      return <CostingBodySkeleton />;
    case "documentation":
      return (
        <>
          <PageHeaderSkeleton width="doc" />
          <DocumentationBodySkeleton />
        </>
      );
    case "settings":
      return (
        <>
          <PageHeaderSkeleton width="narrow" />
          <SettingsBodySkeleton />
        </>
      );
    default:
      return (
        <>
          <PageHeaderSkeleton />
          <ContentShell>
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </ContentShell>
        </>
      );
  }
}
