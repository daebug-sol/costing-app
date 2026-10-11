"use client";

import { FolderKanban } from "lucide-react";
import { ContextualHelpLink } from "@/components/help/contextual-help-link";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/components/i18n-provider";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CostingProjectList } from "./costing-project-list";
import { CostingMain } from "./costing-main";
import { NewProjectDialog } from "./new-project-dialog";
import { AddItemDialog } from "./add-item-dialog";
import { useCostingWorkspace } from "./use-costing-workspace";

export function CostingWorkspace() {
  const { t } = useI18n();
  const ed = useCostingWorkspace();
  const { confirmDialog, projectFromUrl, currentProject, projectLoad, closeProject } = ed;

  // Only show a project's editor when the store really holds the URL's project;
  // never render a stale project under a different ?project= id.
  const projectReady =
    projectFromUrl && currentProject?.id === projectFromUrl && projectLoad !== "error";

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

      <div className="app-page-gutter-wide flex min-h-0 flex-1 flex-col overflow-hidden py-4 sm:py-5 lg:py-6">
        {!projectFromUrl ? (
          <CostingProjectList ed={ed} />
        ) : projectReady ? (
          <CostingMain ed={ed} />
        ) : projectLoad === "error" ? (
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <EmptyState
              icon={FolderKanban}
              title={t("costing.project.notFound.title")}
              description={t("costing.project.notFound.description")}
              actionLabel={t("costing.project.back")}
              onAction={closeProject}
              className="py-8"
            />
          </div>
        ) : (
          <div
            className="bg-card space-y-3 rounded-xl border border-border p-6 shadow-sm"
            aria-busy="true"
          >
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
      </div>

      <NewProjectDialog ed={ed} />

      <AddItemDialog ed={ed} />
    </div>
  );
}
