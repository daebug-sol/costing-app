"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type TrialState =
  | { trial: false }
  | { trial: true; expired: boolean; trialEndsAt: string; daysLeft: number };

/** Shows the remaining demo days, and a blocking notice once the demo has ended. */
export function TrialBanner() {
  const [state, setState] = useState<TrialState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/trial", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setState(j as TrialState);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state || !state.trial) return null;

  if (state.expired) {
    return (
      <div
        role="alertdialog"
        aria-labelledby="trial-expired-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-6 backdrop-blur-sm"
      >
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <h2 id="trial-expired-title" className="text-lg font-semibold">
            Masa demo berakhir
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Data Anda masih tersimpan. Hubungi kami untuk melanjutkan ke akun
            berbayar, atau unduh salinan datanya.
          </p>
          <Button asChild className="mt-4 gap-2" variant="outline">
            <a href="/api/org/export" download>
              <Download className="size-4" />
              Unduh data
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-muted px-4 py-1.5 text-center text-xs text-muted-foreground">
      Mode demo: sisa {state.daysLeft} hari
    </div>
  );
}
