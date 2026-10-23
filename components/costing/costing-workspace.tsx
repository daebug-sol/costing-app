"use client";

import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/components/i18n-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { CostingProjectList } from "./costing-project-list";
import { CostingMain } from "./costing-main";
import { NewProjectDialog } from "./new-project-dialog";
import { AddItemDialog } from "./add-item-dialog";
import { useCostingWorkspace } from "./use-costing-workspace";

export function CostingWorkspace() {
  const { t } = useI18n();
  const ed = useCostingWorkspace();
  const { confirmDialog, projectView, closeProject } = ed;
  const isList = projectView === "list";

  return (
    <div
      className={
        isList
          ? "bg-background border-border border-t"
          : "min-h-[calc(100vh-3.5rem)] border-t border-border bg-background"
      }
    >
      {confirmDialog}

      {isList ? (
        <CostingProjectList ed={ed} />
      ) : (
        <div className="w-full px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          {projectView === "ready" ? (
            <CostingMain ed={ed} />
          ) : projectView === "error" ? (
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
              role="status"
              aria-busy="true"
              aria-label="Memuat proyek"
            >
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
        </div>
      )}

      <NewProjectDialog ed={ed} />

      <AddItemDialog ed={ed} />
    </div>
  );
}
