"use client";

import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { AssemblyTypeBadge } from "@/components/costing/assembly-type-badge";
import { CostingShell } from "@/components/costing/costing-shell";
import { ManualWorkspace } from "@/components/costing/ManualWorkspace";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { costingErrorMessage } from "@/lib/costing-error-message";
import { cn } from "@/lib/utils";
import { formatIDR } from "@/lib/utils/format";
import { AhuSegmentEditor } from "./ahu-segment-editor";
import { SortableCostingSegment } from "./costing-workspace-shared";
import type { CostingWorkspaceState } from "./use-costing-workspace";

type Props = {
  ed: CostingWorkspaceState;
  seg: CostingWorkspaceState["segments"][number];
  index: number;
  open: boolean;
  onToggle: () => void;
};

export function SegmentCard({ ed, seg, index, open, onToggle }: Props) {
  const { t } = useI18n();
  const { confirm, deleteSegment, patchSegment, showToast } = ed;

  const askDelete = () =>
    void confirm({
      title: t("costing.deleteItemTitle", { name: seg.title }),
      description: t("costing.deleteItemDescription"),
    }).then((ok) => {
      if (ok) deleteSegment(seg.id).catch((e) => showToast(costingErrorMessage(e)));
    });

  return (
    <SortableCostingSegment id={seg.id}>
      {({ setNodeRef, style, dragProps }) => (
        <div
          ref={setNodeRef}
          style={style}
          data-testid="segment-card"
          className="bg-card rounded-xl ring-1 ring-border"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 p-3 sm:p-4">
            <div
              {...dragProps}
              className={cn(
                "text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center",
                dragProps.className
              )}
            >
              <GripVertical className="size-4" aria-hidden />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-expanded={open}
              aria-label={`${open ? "Ciutkan" : "Buka"} ${seg.title}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onToggle}
            >
              {open ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
            </Button>
            <span className="text-muted-foreground text-xs tabular-nums">{index + 1}.</span>
            <Input
              className="h-9 min-w-0 flex-1 text-sm font-medium"
              defaultValue={seg.title}
              key={`t-${seg.id}-${seg.title}`}
              title={seg.title}
              aria-label={t("costing.page.renameItem", { name: seg.title })}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={(e) => patchSegment(seg.id, { title: e.target.value.trim() || seg.title })}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={t("costing.page.itemMenu", { name: seg.title })}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onClick={askDelete}>
                  <Trash2 aria-hidden />
                  {t("costing.page.deleteItem")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex w-full items-center justify-between gap-3 pl-[4.25rem] sm:order-none sm:w-auto sm:pl-0 sm:ml-auto sm:basis-auto">
              <AssemblyTypeBadge variant={seg.type === "manual" ? "manual" : "ahu"} />
              <span className="tabular-money text-muted-foreground min-w-0 truncate text-xs">
                {t("costing.page.subtotal")}: {formatIDR(seg.subtotal)}
              </span>
            </div>
          </div>
          {open ? (
            <div className="border-border border-t p-3 sm:p-4">
              <CostingShell level="assembly">
                {seg.type === "manual" ? (
                  <ManualWorkspace
                    segmentId={seg.id}
                    embedded
                    collapseAllManualSignal={ed.collapseManualTick}
                    expandAllManualSignal={ed.expandManualTick}
                  />
                ) : (
                  <AhuSegmentEditor
                    key={`${seg.id}:${JSON.stringify(seg.ahuRecalcParams ?? null)}`}
                    segment={seg}
                    patchSegment={ed.patchSegment}
                    saveAhuParams={ed.saveAhuParams}
                    saveAhuParamsAndRecalculate={ed.saveAhuParamsAndRecalculate}
                    segmentActionsDisabled={ed.isLoading || !ed.currentProject}
                    ahuModuleEnabled={ed.ahuModuleEnabled}
                    isCalculating={ed.isCalculating}
                    openAddItem={ed.openAddItem}
                    toggleCat={ed.toggleCat}
                    openCats={ed.openCats}
                    unlockDraft={ed.unlockDraft}
                    setUnlockDraft={ed.setUnlockDraft}
                    qtyDraft={ed.qtyDraft}
                    setQtyDraft={ed.setQtyDraft}
                    overrideItem={ed.overrideItem}
                    resetItem={ed.resetItem}
                    setSectionOverride={ed.setSectionOverride}
                    resetSegmentMarkup={ed.resetSegmentMarkup}
                    showToast={ed.showToast}
                  />
                )}
              </CostingShell>
            </div>
          ) : null}
        </div>
      )}
    </SortableCostingSegment>
  );
}
