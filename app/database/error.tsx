"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DatabaseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 py-16">
      <h2 className="text-lg font-semibold text-slate-900">Database error</h2>
      <p className="max-w-md text-center text-sm text-slate-600">
        {error.message || "Something went wrong on this page."}
      </p>
      <Button type="button" onClick={() => reset()} className="gap-2">
        <RefreshCw className="size-4" />
        Retry
      </Button>
    </div>
  );
}
