"use client";

import { useDndMonitor } from "@dnd-kit/core";
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { type MouseEvent, useRef, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { AssemblyTypeBadge } from "@/components/costing/assembly-type-badge";
import { ManualWorkspace } from "@/components/costing/ManualWorkspace";
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

/** Clicks on these inside the header do their own thing and never toggle the item. */
const INTERACTIVE = "button, input, textarea, select, a, [role='menuitem']";

export function SegmentCard({ ed, seg, index, open, onToggle }: Props) {
  const { t } = useI18n();
  const { confirm, deleteSegment, patchSegment, showToast, moveSegment, segments } = ed;
  const [renaming, setRenaming] = useState(false);
  // Radix returns focus to the menu trigger on close, which would blur the rename input at once.
  const keepRenameFocus = useRef(false);
  const renameInput = useRef<HTMLInputElement>(null);
  // A press-and-hold drag ends with a click on the header; swallow it so dropping doesn't toggle.
  const lastDragEnd = useRef(0);
  useDndMonitor({
    onDragEnd: () => (lastDragEnd.current = Date.now()),
    onDragCancel: () => (lastDragEnd.current = Date.now()),
  });

  const askDelete = () =>
    void confirm({
      title: t("costing.deleteItemTitle", { name: seg.title }),
      description: t("costing.deleteItemDescription"),
    }).then((ok) => {
      if (ok) deleteSegment(seg.id).catch((e) => showToast(costingErrorMessage(e)));
    });

  const onHeaderClick = (e: MouseEvent<HTMLDivElement>) => {
    if (renaming || Date.now() - lastDragEnd.current < 250) return;
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
    onToggle();
  };

  const commitRename = (value: string) => {
    setRenaming(false);
    const next = value.trim();
    if (next && next !== seg.title) patchSegment(seg.id, { title: next });
  };

  return (
    <SortableCostingSegment id={seg.id}>
      {({ setNodeRef, style, dragProps }) => (
        <div
          ref={setNodeRef}
          style={style}
          data-testid="segment-card"
          className="bg-card rounded-xl ring-1 ring-border"
        >
          <div
            {...dragProps}
            onClick={onHeaderClick}
            className={cn("flex flex-col gap-1 rounded-xl p-3 sm:p-4", dragProps.className)}
          >
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="text-muted-foreground focus-visible:ring-ring shrink-0 rounded-sm text-sm tabular-nums outline-none focus-visible:ring-2"
                aria-expanded={open}
                aria-label={t("costing.page.toggleItem", { name: seg.title })}
                onClick={onToggle}
              >
                {index + 1}.
              </button>
              {renaming ? (
                <Input
                  ref={renameInput}
                  autoFocus
                  className="h-9 min-w-0 flex-1 text-sm font-medium"
                  defaultValue={seg.title}
                  aria-label={t("costing.page.renameItem", { name: seg.title })}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(e.currentTarget.value);
                    if (e.key === "Escape") setRenaming(false);
                  }}
                  onBlur={(e) => commitRename(e.target.value)}
                />
              ) : (
                <span
                  className="min-w-0 flex-1 truncate text-base font-medium"
                  title={seg.title}
                >
                  {seg.title}
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={t("costing.page.itemMenu", { name: seg.title })}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onCloseAutoFocus={(e) => {
                    if (!keepRenameFocus.current) return;
                    keepRenameFocus.current = false;
                    e.preventDefault();
                    renameInput.current?.focus();
                    renameInput.current?.select();
                  }}
                >
                  <DropdownMenuItem
                    onClick={() => {
                      keepRenameFocus.current = true;
                      setRenaming(true);
                    }}
                  >
                    <Pencil aria-hidden />
                    {t("costing.page.renameAction")}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={index === 0} onClick={() => moveSegment(seg.id, -1)}>
                    <ArrowUp aria-hidden />
                    {t("costing.page.moveUp")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={index === segments.length - 1}
                    onClick={() => moveSegment(seg.id, 1)}
                  >
                    <ArrowDown aria-hidden />
                    {t("costing.page.moveDown")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={askDelete}>
                    <Trash2 aria-hidden />
                    {t("costing.page.deleteItem")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <AssemblyTypeBadge variant={seg.type === "manual" ? "manual" : "ahu"} />
              <span className="tabular-money text-muted-foreground min-w-0 truncate text-xs">
                {t("costing.page.subtotal")}: {formatIDR(seg.subtotal)}
              </span>
            </div>
          </div>
          {open ? (
            <div className="border-border border-t p-3 sm:p-4">
              <div className="space-y-4">
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
              </div>
            </div>
          ) : null}
        </div>
      )}
    </SortableCostingSegment>
  );
}
