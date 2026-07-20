"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function CostingFallback() {
  return (
    <div className="bg-background flex min-h-[calc(100vh-3.5rem)] items-center justify-center border-t border-border">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

const CostingWorkspace = dynamic(
  () =>
    import("@/components/costing/costing-workspace").then((m) => ({
      default: m.CostingWorkspace,
    })),
  { loading: () => <CostingFallback />, ssr: false }
);

export function CostingWorkspaceLazy() {
  return <CostingWorkspace />;
}
