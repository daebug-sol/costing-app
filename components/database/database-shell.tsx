import type { ReactNode } from "react";
import { PageShell } from "@/components/page-shell";

/** Page title shared by every Database state (explorer, AHU datasets, file editor). */
export function DatabaseShell({
  actions,
  children,
}: {
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageShell eyebrow="Master data" title="Database" inlineActions actions={actions}>
      {children}
    </PageShell>
  );
}
