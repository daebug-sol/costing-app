"use client";

import { ContextualHelpLink } from "@/components/help/contextual-help-link";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { CostingSidebar } from "./costing-sidebar";
import { CostingMain } from "./costing-main";
import { NewProjectDialog } from "./new-project-dialog";
import { AddItemDialog } from "./add-item-dialog";
import { useCostingWorkspace } from "./use-costing-workspace";

export function CostingWorkspace() {
  const ed = useCostingWorkspace();
  const {
    confirmDialog,
    sidebarCollapsed,
  } = ed;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden border-t border-border bg-background">
      {confirmDialog}

      <PageHeader
        variant="band"
        width="wide"
        eyebrow="Workspace"
        title="Costing"
        description="Kelola proyek, item, dan rincian biaya tanpa mengubah logika perhitungan."
        className="shrink-0"
        actions={<ContextualHelpLink pathname="/costing" />}
      />

      <div className="app-page-gutter-wide min-h-0 flex-1 overflow-hidden py-4 sm:py-5 lg:py-6">
        <div
          className={cn(
            "grid h-full min-h-0 grid-cols-1 gap-4 sm:gap-5",
            !sidebarCollapsed && "lg:grid-cols-[minmax(0,32%)_minmax(0,68%)]"
          )}
        >
          <CostingSidebar ed={ed} />

          {/* Right */}
          <CostingMain ed={ed} />
        </div>
      </div>

      <NewProjectDialog ed={ed} />

      <AddItemDialog ed={ed} />
    </div>
  );
}
