"use client";

import { CostingShell } from "@/components/costing/costing-shell";
import { useI18n } from "@/components/i18n-provider";
import { costingErrorMessage } from "@/lib/costing-error-message";
import { AhuStaleBanner } from "./ahu-stale-banner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AhuEditorProps } from "./costing-workspace-shared";
import { AhuModulesTab } from "./ahu-modules-tab";
import { AhuSectionsTab } from "./ahu-sections-tab";
import { AhuSummaryTab } from "./ahu-summary-tab";
import { AhuSheet } from "./ahu-sheet";
import { useAhuSegmentEditor } from "./use-ahu-segment-editor";

export function AhuSegmentEditor(props: AhuEditorProps) {
  const { t } = useI18n();
  const ed = useAhuSegmentEditor(props);
  const { seg, ahu, ahuDirty, isCalculating, segmentActionsDisabled, ahuModuleEnabled, saveAhuParamsAndRecalculate, showToast } = ed;

  return (
    <>
      <CostingShell level="segment" className="space-y-4">
        <AhuStaleBanner
          show={ahuDirty}
          busy={isCalculating}
          canRecalculate={ahuModuleEnabled && !segmentActionsDisabled}
          onRecalculate={() =>
            saveAhuParamsAndRecalculate(seg.id, ahu).catch((e) => showToast(costingErrorMessage(e)))
          }
        />
        <Tabs defaultValue="unit" className="flex flex-col gap-4">
          <TabsList className="h-auto w-full flex-wrap">
            <TabsTrigger value="unit">{t("costing.ahu.tabUnit")}</TabsTrigger>
            <TabsTrigger value="modules">{t("costing.ahu.tabModules")}</TabsTrigger>
            <TabsTrigger value="summary">{t("costing.ahu.tabSummary")}</TabsTrigger>
          </TabsList>

          <AhuModulesTab ed={ed} />

          <AhuSectionsTab ed={ed} />

          <AhuSummaryTab ed={ed} />
        </Tabs>
      </CostingShell>

      <AhuSheet ed={ed} />
    </>
  );
}
