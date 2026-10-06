"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

/** Shared body for route-segment `error.tsx` files. */
export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 py-16">
      <h1 className="text-lg font-semibold text-foreground">{t("route.errorTitle")}</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {error.message || t("route.errorFallback")}
      </p>
      <Button type="button" onClick={() => reset()} className="gap-2">
        <RefreshCw className="size-4" />
        {t("common.retry")}
      </Button>
    </div>
  );
}
