"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16">
      <h1 className="text-foreground text-lg font-semibold">
        Something went wrong
      </h1>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        {error.message || "An unexpected error occurred."}
      </p>
      <Button type="button" onClick={() => reset()} className="gap-2">
        <RefreshCw className="size-4" />
        Retry
      </Button>
    </div>
  );
}
