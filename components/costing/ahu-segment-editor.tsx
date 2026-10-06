"use client";

import { CostingShell } from "@/components/costing/costing-shell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AhuEditorProps } from "./costing-workspace-shared";
import { AhuModulesTab } from "./ahu-modules-tab";
import { AhuSectionsTab } from "./ahu-sections-tab";
import { AhuSummaryTab } from "./ahu-summary-tab";
import { AhuSheet } from "./ahu-sheet";
import { useAhuSegmentEditor } from "./use-ahu-segment-editor";

export function AhuSegmentEditor(props: AhuEditorProps) {
  const ed = useAhuSegmentEditor(props);
  const {
  } = ed;

  return (
    <>
      <CostingShell level="segment" className="space-y-4">
        <Tabs defaultValue="unit" className="flex flex-col gap-4">
          <TabsList className="h-auto w-full flex-wrap">
            <TabsTrigger value="unit">Unit &amp; hitung</TabsTrigger>
            <TabsTrigger value="modules">Parameter modul</TabsTrigger>
            <TabsTrigger value="summary">Ringkasan</TabsTrigger>
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
