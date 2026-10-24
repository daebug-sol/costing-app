"use client";

import { ChevronLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { costingErrorMessage } from "@/lib/costing-error-message";
import type { CostingWorkspaceState } from "./use-costing-workspace";

export function isFinalizedStatus(status: string) {
  const v = status.toLowerCase();
  return v === "finalized" || v === "final";
}

export function ProjectHeader({ ed }: { ed: CostingWorkspaceState }) {
  const { t } = useI18n();
  const {
    currentProject,
    updateProject,
    confirm,
    showToast,
    statusBadge,
    loadProjects,
    closeProject,
  } = ed;
  const [editingName, setEditingName] = useState(false);

  if (!currentProject) return null;
  const finalized = isFinalizedStatus(currentProject.status);
  const fail = (e: unknown) => showToast(costingErrorMessage(e));

  const toggleStatus = () =>
    void confirm({
      title: t(finalized ? "costing.page.draftTitle" : "costing.page.finalizeTitle", {
        name: currentProject.name,
      }),
      description: t(finalized ? "costing.page.draftDescription" : "costing.page.finalizeDescription"),
      confirmLabel: t(finalized ? "costing.page.backToDraft" : "costing.page.finalize"),
      destructive: false,
    }).then((ok) => {
      if (ok) updateProject({ status: finalized ? "draft" : "finalized" }).catch(fail);
    });

  const deleteProject = () =>
    void confirm({
      title: t("costing.page.deleteProjectTitle", { name: currentProject.name }),
      description: t("costing.page.deleteProjectDescription"),
      confirmLabel: t("costing.page.deleteProject"),
    }).then(async (ok) => {
      if (!ok) return;
      const r = await fetch(`/api/projects/${encodeURIComponent(currentProject.id)}`, {
        method: "DELETE",
      }).catch(() => null);
      if (r?.status === 409) return showToast(t("costing.page.deleteProjectInUse"));
      if (!r?.ok) {
        const j = (await r?.json().catch(() => null)) as { error?: string } | null;
        return showToast(costingErrorMessage(j?.error));
      }
      closeProject();
      loadProjects().catch(fail);
    });

  const saveName = (value: string) => {
    setEditingName(false);
    const next = value.trim();
    if (next && next !== currentProject.name) updateProject({ name: next }).catch(fail);
  };

  return (
    <header className="space-y-3">
      <Link
        href="/costing"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -ml-1 inline-flex items-center gap-1 rounded-md px-1 text-xs focus-visible:ring-2 focus-visible:outline-none"
      >
        <ChevronLeft className="size-3.5" aria-hidden />
        {t("costing.project.back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
          {editingName ? (
            <Input
              autoFocus
              className="h-9 max-w-md text-lg font-semibold"
              defaultValue={currentProject.name}
              aria-label={t("costing.page.renameProject")}
              onBlur={(e) => saveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditingName(false);
              }}
            />
          ) : (
            <>
              <h1 className="text-foreground min-w-0 truncate text-xl font-semibold">
                {currentProject.name}
              </h1>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={t("costing.page.renameProject")}
                onClick={() => setEditingName(true)}
              >
                <Pencil aria-hidden />
              </Button>
            </>
          )}
          {statusBadge(currentProject.status)}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Button asChild data-tour="costing.create-quote">
            <Link href={`/documentation?fromProject=${encodeURIComponent(currentProject.id)}`}>
              {t("costing.page.createQuotation")}
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t("costing.page.moreActions")}
                data-tour="costing.project-menu"
              >
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={toggleStatus}>
                {finalized ? t("costing.page.backToDraft") : t("costing.page.finalize")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={deleteProject}>
                <Trash2 aria-hidden />
                {t("costing.page.deleteProject")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
