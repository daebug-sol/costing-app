"use client";

import { useI18n } from "@/components/i18n-provider";
import { AhuSegmentEditor } from "./ahu-segment-editor";
import { DndContext, DragOverlay, closestCenter, defaultDropAnimation } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight, FolderKanban, GripVertical, PanelLeftOpen, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { CostingLevelHeading, CostingShell } from "@/components/costing/costing-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { AssemblyTypeBadge } from "@/components/costing/assembly-type-badge";
import { ManualWorkspace } from "@/components/costing/ManualWorkspace";
import { SortableCostingSegment } from "./costing-workspace-shared";
import type { CostingWorkspaceState } from "./use-costing-workspace";

export function CostingMain({ ed }: { ed: CostingWorkspaceState }) {
  const { t } = useI18n();
  const {
    confirm,
    router,
    currentProject,
    isCalculating,
    isLoading,
    updateProject,
    addSegment,
    deleteSegment,
    overrideItem,
    resetItem,
    setSectionOverride,
    resetSegmentMarkup,
    ahuModuleEnabled,
    sidebarCollapsed,
    setCostingSidebar,
    patchCostingOpenSegment,
    projectSummaryOpenByProject,
    patchCostingProjectSummaryOpen,
    openCats,
    openSegments,
    collapseManualTick,
    expandManualTick,
    unlockDraft,
    setUnlockDraft,
    qtyDraft,
    setQtyDraft,
    showToast,
    addManualItem,
    addManualGroupItem,
    useEsk,
    setUseEsk,
    useAsu,
    setUseAsu,
    useMob,
    setUseMob,
    marginPct,
    setMarginPct,
    mainScrollRef,
    activeSegmentDragId,
    onMainScroll,
    totals,
    persistMargins,
    persistToggles,
    patchSegment,
    saveAhuParams,
    saveAhuParamsAndRecalculate,
    openAddItem,
    toggleCat,
    segments,
    collapseAllHierarchy,
    expandAllHierarchy,
    segmentSensors,
    onSegmentDragStart,
    onSegmentDragEnd,
    onSegmentDragCancel,
  } = ed;

  return (
    <>
      <main
        ref={mainScrollRef}
        onScroll={currentProject ? onMainScroll : undefined}
        className="bg-card relative min-h-0 min-w-0 overflow-y-auto rounded-xl border border-border p-5 shadow-sm lg:p-6"
      >
        {sidebarCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute left-3 top-3 z-10 size-8"
                aria-label="Tampilkan daftar proyek"
                onClick={() => setCostingSidebar({ collapsed: false })}
              >
                <PanelLeftOpen className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tampilkan daftar proyek</TooltipContent>
          </Tooltip>
        ) : null}
        {!currentProject ? (
          <EmptyState
            icon={FolderKanban}
            title="Pilih atau buat proyek"
            description={
              sidebarCollapsed
                ? 'Buka daftar proyek dengan tombol di kiri atas, atau buat proyek baru dari halaman ini setelah daftar dibuka.'
                : 'Pilih proyek di daftar kiri, atau buat baru dengan tombol "Proyek baru" di pojok atas daftar.'
            }
            className={cn(
              "h-[min(480px,calc(100vh-8rem))]",
              sidebarCollapsed && "pt-10"
            )}
            secondaryActionLabel="Bantuan"
            onSecondaryAction={() =>
              router.push("/help/costing/proyek-dan-segment")
            }
          />
        ) : (
          <div
            className={cn(
              "mx-auto space-y-4",
              sidebarCollapsed ? "max-w-none" : "max-w-6xl",
              sidebarCollapsed && "pt-10"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {currentProject.name}
                </h2>
                <Label className="mt-2 text-xs text-muted-foreground">
                  Qty penawaran (per unit selling)
                </Label>
                <Input
                  className="mt-1 h-8 w-28 text-sm"
                  type="number"
                  defaultValue={currentProject.qty}
                  key={`pq-${currentProject.id}-${currentProject.qty}`}
                  onBlur={(e) =>
                    updateProject({
                      qty: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                    }).catch((err) => showToast(String(err)))
                  }
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {segments.length > 0 ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => collapseAllHierarchy()}
                    >
                      Ciutkan semua
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => expandAllHierarchy()}
                    >
                      Buka semua
                    </Button>
                  </>
                ) : null}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-8 rounded-full"
                          aria-label="Tambah metode costing"
                          data-add-item-trigger
                        >
                          <Plus className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Tambah metode costing</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => addManualItem()}>
                      Tambah item
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void addManualGroupItem()}
                    >
                      Tambah item grup
                    </DropdownMenuItem>
                    {ahuModuleEnabled ? (
                      <DropdownMenuItem
                        onClick={() =>
                          addSegment("ahu").catch((e) => showToast(String(e)))
                        }
                      >
                        AHU otomatis
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {segments.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="Belum ada item"
                description="Tambahkan item, item grup, atau AHU otomatis. Satu penawaran bisa berisi banyak item."
                actionLabel="Tambah item"
                onAction={() => {
                  const el = document.querySelector<HTMLButtonElement>(
                    "[data-add-item-trigger]"
                  );
                  el?.click();
                }}
                className="bg-card border border-dashed border-border py-12"
              />
            ) : null}

            <DndContext
              sensors={segmentSensors}
              collisionDetection={closestCenter}
              onDragStart={onSegmentDragStart}
              onDragEnd={onSegmentDragEnd}
              onDragCancel={onSegmentDragCancel}
            >
              <SortableContext
                items={segments.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <Table className="border-border rounded-lg border">
                  {segments.map((seg, segIndex) => {
                    const segOpen = openSegments[seg.id] ?? true;
                    return (
                      <SortableCostingSegment key={seg.id} id={seg.id}>
                        {({ setNodeRef, style, dragProps }) => (
                          <tbody
                            ref={setNodeRef}
                            style={style}
                            className={cn(
                              "[&_tr:last-child]:border-0",
                              segIndex > 0 && "border-t border-border"
                            )}
                          >
                            <TableRow className="bg-muted/10 hover:bg-muted/20 border-0">
                              <TableCell
                                colSpan={4}
                                className="max-w-0 p-0 align-middle"
                              >
                                <div className="flex min-w-0 items-center gap-2 px-4 py-3 sm:px-5">
                                  <div
                                    {...dragProps}
                                    className={cn(
                                      "text-muted-foreground hover:text-foreground hover:bg-muted/60 flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md active:cursor-grabbing",
                                      dragProps.className
                                    )}
                                  >
                                    <GripVertical className="size-4" aria-hidden />
                                  </div>
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => {
                                      if (!currentProject?.id) return;
                                      patchCostingOpenSegment(
                                        currentProject.id,
                                        seg.id,
                                        !(openSegments[seg.id] ?? true)
                                      );
                                    }}
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
                                    aria-expanded={segOpen}
                                    aria-label={
                                      segOpen
                                        ? `Ciutkan detail item ${seg.title}`
                                        : `Buka detail item ${seg.title}`
                                    }
                                  >
                                    {segOpen ? (
                                      <ChevronDown className="size-4 shrink-0" />
                                    ) : (
                                      <ChevronRight className="size-4 shrink-0" />
                                    )}
                                  </button>
                                  <AssemblyTypeBadge
                                    variant={seg.type === "manual" ? "manual" : "ahu"}
                                    className="min-w-[4.5rem]"
                                  />
                                  <div className="min-w-0 flex-1 sm:max-w-[14rem]">
                                    <Input
                                      className="h-9 w-full min-w-0 bg-background text-sm font-medium"
                                      defaultValue={seg.title}
                                      key={`t-${seg.id}-${seg.title}`}
                                      title={seg.title}
                                      aria-label={`Nama item ${seg.title}`}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onBlur={(e) =>
                                        patchSegment(seg.id, {
                                          title:
                                            e.target.value.trim() || seg.title,
                                        })
                                      }
                                    />
                                  </div>
                                  <span
                                    className="tabular-money text-muted-foreground min-w-0 flex-1 truncate text-right text-xs sm:text-xs"
                                    title={`Subtotal HPP: ${formatIDR(seg.subtotal)}`}
                                  >
                                    Subtotal HPP: {formatIDR(seg.subtotal)}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                                    title="Hapus item"
                                    aria-label={`Hapus item ${seg.title}`}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => {
                                      void confirm({
                                        title: t("costing.deleteItemTitle", { name: seg.title }),
                                        description: t("costing.deleteItemDescription"),
                                      }).then((ok) => {
                                        if (ok)
                                          deleteSegment(seg.id).catch((e) =>
                                            showToast(String(e))
                                          );
                                      });
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {segOpen ? (
                              <TableRow className="border-0 hover:bg-transparent">
                                <TableCell
                                  colSpan={4}
                                  className="border-border/80 bg-card p-4 sm:p-5"
                                >
                                  <CostingShell level="assembly">
                                    {seg.type === "manual" ? (
                                      <ManualWorkspace
                                        segmentId={seg.id}
                                        embedded
                                        collapseAllManualSignal={
                                          collapseManualTick
                                        }
                                        expandAllManualSignal={
                                          expandManualTick
                                        }
                                      />
                                    ) : (
                                      <AhuSegmentEditor
                                        key={`${seg.id}:${JSON.stringify(seg.ahuRecalcParams ?? null)}`}
                                        segment={seg}
                                        patchSegment={patchSegment}
                                        saveAhuParams={saveAhuParams}
                                        saveAhuParamsAndRecalculate={
                                          saveAhuParamsAndRecalculate
                                        }
                                        segmentActionsDisabled={
                                          isLoading || !currentProject
                                        }
                                        ahuModuleEnabled={ahuModuleEnabled}
                                        isCalculating={isCalculating}
                                        openAddItem={openAddItem}
                                        toggleCat={toggleCat}
                                        openCats={openCats}
                                        unlockDraft={unlockDraft}
                                        setUnlockDraft={setUnlockDraft}
                                        qtyDraft={qtyDraft}
                                        setQtyDraft={setQtyDraft}
                                        overrideItem={overrideItem}
                                        resetItem={resetItem}
                                        setSectionOverride={setSectionOverride}
                                        resetSegmentMarkup={resetSegmentMarkup}
                                        showToast={showToast}
                                      />
                                    )}
                                  </CostingShell>
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </tbody>
                        )}
                      </SortableCostingSegment>
                    );
                  })}
                </Table>
              </SortableContext>
              <DragOverlay dropAnimation={defaultDropAnimation}>
                {activeSegmentDragId ? (
                  <div className="bg-card flex max-w-md flex-wrap items-center gap-2 rounded-lg border border-primary/35 px-4 py-3 shadow-lg">
                    {(() => {
                      const s = segments.find(
                        (x) => x.id === activeSegmentDragId
                      );
                      if (!s) return null;
                      return (
                        <>
                          <AssemblyTypeBadge
                            variant={s.type === "manual" ? "manual" : "ahu"}
                          />
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {s.title}
                          </span>
                          <span className="text-muted-foreground tabular-money text-xs">
                            {formatIDR(s.subtotal)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* C — Summary */}
            <CostingShell level="summary" className="overflow-hidden">
              <Collapsible
                open={projectSummaryOpenByProject[currentProject.id] === true}
                onOpenChange={(open) =>
                  patchCostingProjectSummaryOpen(currentProject.id, open)
                }
              >
                <CollapsibleTrigger className="hover:bg-muted/20 flex w-full items-center gap-3 px-4 py-4 text-left transition-colors sm:gap-4 sm:px-5">
                  <CostingLevelHeading
                    level="summary"
                    as="h3"
                    className="shrink-0 text-sm font-semibold"
                  >
                    Ringkasan biaya proyek
                  </CostingLevelHeading>
                  <div className="min-w-0 flex-1 text-right">
                    <div className="text-muted-foreground flex flex-col items-end gap-0.5 text-xs sm:flex-row sm:justify-end sm:gap-x-6 sm:text-xs">
                      <span className="whitespace-nowrap">
                        HPP:{" "}
                        <span className="tabular-money font-medium text-foreground">
                          {formatIDR(totals.hpp)}
                        </span>
                      </span>
                      <span className="whitespace-nowrap">
                        Total harga jual:{" "}
                        <span className="tabular-money text-sm font-semibold text-foreground sm:text-base">
                          {formatIDR(totals.selling)}
                        </span>
                      </span>
                    </div>
                  </div>
                  {projectSummaryOpenByProject[currentProject.id] === true ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-border px-5 pb-5 pt-3">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total biaya material (HPP)</TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.hpp)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-[5rem]">Overhead</span>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.overhead}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, overhead: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.oh)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-[5rem]">Kontinjensi</span>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.contingency}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, contingency: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.cont)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Switch
                            checked={useEsk}
                            onCheckedChange={(v) => {
                              setUseEsk(v);
                              void persistToggles({
                                esk: v,
                                asu: useAsu,
                                mob: useMob,
                              });
                            }}
                            id="esk"
                          />
                          <Label htmlFor="esk">Eskalasi</Label>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.eskalasi}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, eskalasi: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {useEsk ? formatIDR(totals.esk) : formatIDR(0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Switch
                            checked={useAsu}
                            onCheckedChange={(v) => {
                              setUseAsu(v);
                              void persistToggles({
                                esk: useEsk,
                                asu: v,
                                mob: useMob,
                              });
                            }}
                            id="asu"
                          />
                          <Label htmlFor="asu">Asuransi</Label>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.asuransi}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, asuransi: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {useAsu ? formatIDR(totals.asu) : formatIDR(0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Switch
                            checked={useMob}
                            onCheckedChange={(v) => {
                              setUseMob(v);
                              void persistToggles({
                                esk: useEsk,
                                asu: useAsu,
                                mob: v,
                              });
                            }}
                            id="mob"
                          />
                          <Label htmlFor="mob">Mobilisasi</Label>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.mobilisasi}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, mobilisasi: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {useMob ? formatIDR(totals.mob) : formatIDR(0)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 font-medium">
                      <TableCell>Total cost</TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.totalCost)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-[5rem]">Margin</span>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.margin}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, margin: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.marginAmt)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 border-t-2 text-base font-bold">
                      <TableCell>SELLING PRICE</TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.selling)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Per unit</TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.perUnit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      updateProject({ status: "draft" }).catch((e) =>
                        showToast(String(e))
                      )
                    }
                  >
                    Simpan draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      updateProject({ status: "finalized" }).catch((e) =>
                        showToast(String(e))
                      )
                    }
                  >
                    Finalkan proyek
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/documentation?fromProject=${currentProject.id}`}>
                      Buat penawaran
                    </Link>
                  </Button>
                </div>
                </CollapsibleContent>
              </Collapsible>
            </CostingShell>
          </div>
        )}
      </main>
    </>
  );
}
