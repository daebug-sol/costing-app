"use client";

import {
  DndContext,
  DragOverlay,
  closestCenter,
  defaultDropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { AssemblyTypeBadge } from "@/components/costing/assembly-type-badge";
import { Button } from "@/components/ui/button";
import { costingErrorMessage } from "@/lib/costing-error-message";
import { useSaveState } from "@/lib/save-state";
import { formatIDR } from "@/lib/utils/format";
import { AddItemMenu } from "./add-item-menu";
import { MarginsCard } from "./margins-card";
import { isFinalizedStatus, ProjectHeader } from "./project-header";
import { ProjectPriceBar } from "./project-price-bar";
import { SegmentCard } from "./segment-card";
import type { CostingWorkspaceState } from "./use-costing-workspace";

export function CostingMain({ ed }: { ed: CostingWorkspaceState }) {
  const { t } = useI18n();
  const {
    currentProject,
    segments,
    totals,
    marginPct,
    setMarginPct,
    useEsk,
    setUseEsk,
    useAsu,
    setUseAsu,
    useMob,
    setUseMob,
    persistMargins,
    persistToggles,
    segmentSensors,
    onSegmentDragStart,
    onSegmentDragEnd,
    onSegmentDragCancel,
    activeSegmentDragId,
    confirm,
    updateProject,
    showToast,
  } = ed;

  const save = useSaveState();
  // undefined = untouched (first item open); null = every item collapsed.
  const [openId, setOpenId] = useState<string | null | undefined>(undefined);
  // Keep the open item valid when items are added or removed.
  // Open a newly added item so the user can start filling it in.
  const knownIds = useRef<string[] | null>(null);
  useEffect(() => {
    const ids = segments.map((s) => s.id);
    const prev = knownIds.current;
    knownIds.current = ids;
    if (prev && ids.length > prev.length) {
      const added = ids.find((id) => !prev.includes(id));
      if (added) setOpenId(added);
    }
  }, [segments]);
  const effectiveOpenId =
    openId === null
      ? null
      : openId && segments.some((s) => s.id === openId)
        ? openId
        : (segments[0]?.id ?? null);

  if (!currentProject) return null;
  const finalized = isFinalizedStatus(currentProject.status);

  const saveMargins = () => save.run(() => persistMargins());
  const saveToggles = (next: { esk: boolean; asu: boolean; mob: boolean }) => {
    setUseEsk(next.esk);
    setUseAsu(next.asu);
    setUseMob(next.mob);
    return save.run(() => persistToggles(next));
  };

  const toggleStatus = () =>
    void confirm({
      title: t(
        finalized ? "costing.page.draftTitle" : "costing.page.finalizeTitle",
        {
          name: currentProject.name,
        },
      ),
      description: t(
        finalized
          ? "costing.page.draftDescription"
          : "costing.page.finalizeDescription",
      ),
      confirmLabel: t(
        finalized ? "costing.page.backToDraft" : "costing.page.finalize",
      ),
      destructive: false,
    }).then((ok) => {
      if (ok)
        updateProject({ status: finalized ? "draft" : "finalized" }).catch(
          (e) => showToast(costingErrorMessage(e)),
        );
    });

  const dragged = segments.find((s) => s.id === activeSegmentDragId);

  return (
    <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start xl:gap-6">
      <div className="order-1 xl:col-span-2">
        <ProjectHeader ed={ed} />
      </div>
      {/* Below xl the aside dissolves (contents) and children keep their own order. */}
      <aside className="contents xl:sticky xl:top-[4.5rem] xl:col-start-2 xl:row-start-2 xl:flex xl:flex-col xl:gap-4">
        <div className="order-2 sticky top-14 z-30 xl:static">
          <ProjectPriceBar
            totals={totals}
            saveState={save.state}
            onRetry={() => void saveMargins()}
            qty={currentProject.qty}
            onQtyCommit={(qty) =>
              updateProject({ qty }).catch((e) =>
                showToast(costingErrorMessage(e)),
              )
            }
          />
        </div>
        <div className="order-4">
          <MarginsCard
            marginPct={marginPct}
            setMarginPct={setMarginPct}
            useEsk={useEsk}
            useAsu={useAsu}
            useMob={useMob}
            totals={totals}
            onSaveMargins={() => void saveMargins()}
            onToggles={(next) => void saveToggles(next)}
            saveState={save.state}
          />
        </div>
        <div className="order-5 flex flex-wrap justify-end gap-2 pb-4">
          <Button type="button" variant="outline" onClick={toggleStatus}>
            {finalized
              ? t("costing.page.backToDraft")
              : t("costing.page.finalize")}
          </Button>
        </div>
      </aside>

      <div className="order-3 flex min-w-0 flex-col gap-4 xl:col-start-1 xl:row-start-2">
        {segments.length === 0 ? (
          <AddItemMenu ed={ed} variant="empty" />
        ) : (
          <>
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
                <div className="space-y-3">
                  {segments.map((seg, i) => (
                    <SegmentCard
                      key={seg.id}
                      ed={ed}
                      seg={seg}
                      index={i}
                      open={seg.id === effectiveOpenId}
                      onToggle={() =>
                        setOpenId(seg.id === effectiveOpenId ? null : seg.id)
                      }
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={defaultDropAnimation}>
                {dragged ? (
                  <div className="bg-card flex max-w-md items-center gap-2 rounded-xl border border-primary/35 px-4 py-3 shadow-lg">
                    <AssemblyTypeBadge
                      variant={dragged.type === "manual" ? "manual" : "ahu"}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {dragged.title}
                    </span>
                    <span className="text-muted-foreground tabular-money text-xs">
                      {formatIDR(dragged.subtotal)}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
            <AddItemMenu ed={ed} variant="inline" />
          </>
        )}
      </div>
    </div>
  );
}
