"use client";

import { FileText, Layers, Plus, Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { costingErrorMessage } from "@/lib/costing-error-message";
import { tourEvent } from "@/lib/tour/events";
import type { CostingWorkspaceState } from "./use-costing-workspace";

type Props = {
  ed: CostingWorkspaceState;
  /** empty: big buttons for a project with no items; inline: dashed button under the list. */
  variant: "empty" | "inline";
};

export function AddItemMenu({ ed, variant }: Props) {
  const { t } = useI18n();
  const { ahuModuleEnabled, addManualItem, addManualGroupItem, addSegment, showToast } = ed;

  const addManual = () => void addManualItem();
  const addGroup = () => void addManualGroupItem();
  const addAhu = () =>
    addSegment("ahu")
      .then(() => tourEvent("costing.item-added"))
      .catch((e) => showToast(costingErrorMessage(e)));

  if (variant === "empty") {
    return (
      <div className="border-border bg-card rounded-xl border border-dashed px-4 py-10 text-center">
        <h3 className="text-base font-semibold">{t("costing.page.emptyTitle")}</h3>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
          {t("costing.page.emptyDescription")}
        </p>
        <div
          className="mt-5 flex flex-wrap items-center justify-center gap-3"
          data-tour="costing.add-item"
        >
          <Button
            type="button"
            size="lg"
            onClick={addManual}
            data-tour="costing.add-item.single"
          >
            <FileText aria-hidden />
            {t("costing.page.itemManual")}
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={addGroup}>
            <Layers aria-hidden />
            {t("costing.page.itemGroup")}
          </Button>
          {ahuModuleEnabled ? (
            <Button type="button" size="lg" variant="outline" onClick={() => void addAhu()}>
              <Sparkles aria-hidden />
              {t("costing.page.itemAhu")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="border-border text-muted-foreground hover:text-foreground h-12 w-full border-dashed"
        >
          <Plus aria-hidden />
          {t("costing.page.addItem")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={addManual}>
          <FileText aria-hidden />
          {t("costing.page.itemManual")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={addGroup}>
          <Layers aria-hidden />
          {t("costing.page.itemGroup")}
        </DropdownMenuItem>
        {ahuModuleEnabled ? (
          <DropdownMenuItem onClick={() => void addAhu()}>
            <Sparkles aria-hidden />
            {t("costing.page.itemAhu")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
