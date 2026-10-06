"use client";

import { FolderKanban, ListFilter, PanelLeftClose, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { CostingWorkspaceState } from "./use-costing-workspace";

export function CostingSidebar({ ed }: { ed: CostingWorkspaceState }) {
  const {
    router,
    projects,
    currentProject,
    isLoading,
    loadProject,
    search,
    statusFilter,
    monthFilter,
    dateFilter,
    sidebarCollapsed,
    setCostingSidebar,
    setNewOpen,
    showToast,
    availableMonths,
    filteredProjects,
    projectGroups,
    statusBadge,
  } = ed;

  return (
    <>
      {!sidebarCollapsed ? (
      <aside className="bg-card flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border shadow-sm">
        <div className="border-border shrink-0 border-b p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <h2 className="truncate text-sm font-semibold text-foreground">
                Proyek costing
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground size-7 shrink-0"
                    aria-label="Sembunyikan daftar proyek"
                    onClick={() => setCostingSidebar({ collapsed: true })}
                  >
                    <PanelLeftClose className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sembunyikan daftar proyek</TooltipContent>
              </Tooltip>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 gap-1"
              onClick={() => setNewOpen(true)}
            >
              <Plus className="size-3.5" />
              Proyek baru
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute left-2 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              placeholder="Cari nama / model / ID…"
              value={search}
              onChange={(e) =>
                setCostingSidebar({ search: e.target.value })
              }
              className="h-8 pl-8 pr-10 text-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground absolute right-0.5 top-1/2 size-7 -translate-y-1/2"
                  aria-label="Filter proyek"
                >
                  <ListFilter className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 p-3" align="end">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) =>
                        setCostingSidebar({
                          statusFilter: v as "all" | "draft" | "finalized",
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="finalized">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bulan (update)</Label>
                    <Select
                      value={monthFilter || "all"}
                      onValueChange={(v) =>
                        setCostingSidebar({
                          monthFilter: v === "all" ? "" : v,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Semua" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua bulan</SelectItem>
                        {availableMonths.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tanggal (update)</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={dateFilter}
                      onChange={(e) =>
                        setCostingSidebar({ dateFilter: e.target.value })
                      }
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading && projects.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-lg border border-border p-4 sm:p-5"
                >
                  <Skeleton className="mb-2 h-4 w-[85%]" />
                  <Skeleton className="h-3 w-[55%]" />
                  <Skeleton className="mt-3 h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Belum ada proyek"
              description='Klik tombol "Proyek baru" di atas untuk membuat proyek costing.'
              className="py-8"
              secondaryActionLabel="Bantuan"
              onSecondaryAction={() =>
                router.push("/help/costing/proyek-dan-segment")
              }
            />
          ) : filteredProjects.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">
              Tidak ada proyek yang cocok dengan filter.
            </p>
          ) : (
            <div className="space-y-4">
              {projectGroups.map((month) => (
                <div key={month.monthKey}>
                  {month.days.map((day) => (
                    <div key={day.dayKey} className="mb-3">
                      <p className="text-muted-foreground mb-1.5 text-xs">
                        {month.monthLabel} · {day.dayLabel}
                      </p>
                      <div className="space-y-2">
                        {day.items.map((p) => {
                          const active = currentProject?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                loadProject(p.id).catch((e) =>
                                  showToast(String(e))
                                )
                              }
                              className={cn(
                                "w-full rounded-lg border p-2.5 text-left text-sm transition-colors",
                                active
                                  ? "border-primary bg-primary/8 border-l-4 "
                                  : "bg-card border-border hover:bg-muted/40"
                              )}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {p.name}
                                </span>
                                <Badge variant="outline" className="text-2xs">
                                  {p.segmentCount} item
                                </Badge>
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {p.previewAhuModel ?? "—"} · Flow{" "}
                                {p.previewFlowCMH != null
                                  ? formatNumber(p.previewFlowCMH, 0)
                                  : "—"}{" "}
                                CMH
                              </div>
                              <div className="mt-1.5">{statusBadge(p.status)}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
      ) : null}
    </>
  );
}
