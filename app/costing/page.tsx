import { Suspense } from "react";
import { CostingWorkspaceLazy } from "@/components/costing/costing-workspace-lazy";
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

export default function CostingPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <Suspense fallback={<CostingFallback />}>
        <CostingWorkspaceLazy />
      </Suspense>
    </div>
  );
}
