"use client";

import { FolderKanban, Plus, Search } from "lucide-react";
import {
  ExplorerItem,
  ExplorerItems,
  ExplorerViewControls,
  useExplorerView,
} from "@/components/file-explorer";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils/format";
import type { CostingWorkspaceState } from "./use-costing-workspace";

export function CostingProjectList({ ed }: { ed: CostingWorkspaceState }) {
  const { t } = useI18n();
  const [view, setView] = useExplorerView();
  const {
    projects,
    isLoading,
    search,
    statusFilter,
    monthFilter,
    dateFilter,
    setCostingSidebar,
    setNewOpen,
    availableMonths,
    filteredProjects,
    projectGroups,
    statusBadge,
  } = ed;

  const filtersActive =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    monthFilter !== "" ||
    dateFilter !== "";

  return (
    <section
      aria-labelledby="costing-list-title"
      className="bg-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border shadow-sm"
    >
      <div className="border-border shrink-0 space-y-3 border-b p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="costing-list-title"
            className="truncate text-sm font-semibold text-foreground"
          >
            {t("costing.list.title")}
          </h2>
          <div className="flex items-center gap-2">
            <ExplorerViewControls view={view} onChange={setView} />
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 gap-1"
              onClick={() => setNewOpen(true)}
            >
              <Plus className="size-3.5" aria-hidden />
              {t("costing.list.newProject")}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <Search
              aria-hidden
              className="text-muted-foreground absolute left-2 top-1/2 size-3.5 -translate-y-1/2"
            />
            <Input
              aria-label={t("costing.list.searchPlaceholder")}
              placeholder={t("costing.list.searchPlaceholder")}
              value={search}
              onChange={(e) => setCostingSidebar({ search: e.target.value })}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="sr-only">{t("costing.list.filter.status")}</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setCostingSidebar({
                  statusFilter: v as "all" | "draft" | "finalized",
                })
              }
            >
              <SelectTrigger
                className="h-8 w-full text-xs"
                aria-label={t("costing.list.filter.status")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("costing.list.filter.statusAll")}
                </SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="finalized">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="sr-only">{t("costing.list.filter.month")}</Label>
            <Select
              value={monthFilter || "all"}
              onValueChange={(v) =>
                setCostingSidebar({ monthFilter: v === "all" ? "" : v })
              }
            >
              <SelectTrigger
                className="h-8 w-full text-xs"
                aria-label={t("costing.list.filter.month")}
              >
                <SelectValue placeholder={t("costing.list.filter.monthAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("costing.list.filter.monthAll")}
                </SelectItem>
                {availableMonths.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="sr-only">{t("costing.list.filter.date")}</Label>
            <Input
              type="date"
              aria-label={t("costing.list.filter.date")}
              className="h-8 text-xs"
              value={dateFilter}
              onChange={(e) =>
                setCostingSidebar({ dateFilter: e.target.value })
              }
            />
          </div>
        </div>
        {filtersActive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() =>
              setCostingSidebar({
                search: "",
                statusFilter: "all",
                monthFilter: "",
                dateFilter: "",
              })
            }
          >
            {t("costing.list.resetFilters")}
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {isLoading && projects.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-lg border border-border p-4 sm:p-5"
              >
                <Skeleton className="mb-2 h-4 w-[40%]" />
                <Skeleton className="h-3 w-[25%]" />
                <Skeleton className="mt-3 h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={t("costing.list.empty.title")}
            description={t("costing.list.empty.description")}
            actionLabel={t("costing.list.newProject")}
            onAction={() => setNewOpen(true)}
            className="py-8"
          />
        ) : filteredProjects.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {t("costing.list.noMatch")}
          </p>
        ) : (
          <div className="space-y-4">
            {projectGroups.map((month) =>
              month.days.map((day) => (
                <div key={day.dayKey}>
                  <p className="text-muted-foreground mb-1.5 text-xs">
                    {month.monthLabel} · {day.dayLabel}
                  </p>
                  <ExplorerItems view={view}>
                    {day.items.map((p) => (
                      <ExplorerItem
                        key={p.id}
                        view={view}
                        href={`/costing?project=${encodeURIComponent(p.id)}`}
                        title={p.name}
                        lead={
                          <span className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-md">
                            <FolderKanban
                              className="text-primary size-4"
                              aria-hidden
                            />
                          </span>
                        }
                        meta={
                          <>
                            <span className="whitespace-nowrap">
                              {t("costing.list.itemCount", {
                                count: p.segmentCount,
                              })}
                            </span>
                            <span className="whitespace-nowrap">
                              {p.previewAhuModel ?? "—"} · Flow{" "}
                              {p.previewFlowCMH != null
                                ? formatNumber(p.previewFlowCMH, 0)
                                : "—"}{" "}
                              CMH
                            </span>
                          </>
                        }
                        trailing={statusBadge(p.status)}
                      />
                    ))}
                  </ExplorerItems>
                </div>
              )),
            )}
          </div>
        )}
      </div>
    </section>
  );
}
