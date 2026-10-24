"use client";

import { ArrowLeft, Boxes, Package, Ruler } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { PillTabsList, PillTabsTrigger } from "@/components/ui/pill-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { AhuDatasetKind } from "@/lib/database-folders";
import { useUiWorkflowStore } from "@/store/uiWorkflowStore";
import { useCostingStore } from "@/store/costingStore";
import { CustomDatabasePanel } from "./custom-database-panel";
import { DatabaseShell } from "./database-shell";
import { useToast, AHU_TAB_CONTENT_CLASS } from "./database-shared";
import { MaterialsPanel } from "./materials-panel";
import { ProfilesPanel } from "./profiles-panel";
import { ComponentsPanel } from "./components-panel";

export function DatabaseModule() {
  const { t } = useI18n();
  const { show } = useToast();
  const modules = useCostingStore((s) => s.modules);
  const loadOrgModules = useCostingStore((s) => s.loadOrgModules);
  const ahuModuleEnabled = modules.ahu;
  const activeTabRaw = useUiWorkflowStore((s) => s.database.activeTab || "ahu");
  const setDatabaseActiveTab = useUiWorkflowStore((s) => s.setDatabaseActiveTab);
  const ahuSection = useUiWorkflowStore((s) => s.database.ahuSection || "materials");
  const setDatabaseAhuSection = useUiWorkflowStore((s) => s.setDatabaseAhuSection);
  const [inAhu, setInAhu] = useState(false);

  useEffect(() => {
    void loadOrgModules().catch(() => undefined);
  }, [loadOrgModules]);

  useEffect(() => {
    if (!ahuModuleEnabled && activeTabRaw === "ahu") {
      setDatabaseActiveTab("custom");
    }
  }, [ahuModuleEnabled, activeTabRaw, setDatabaseActiveTab]);

  const ahuEntry = useMemo(
    () =>
      ahuModuleEnabled
        ? {
            selected: activeTabRaw === "ahu",
            onSelect: () => setDatabaseActiveTab("ahu"),
            onOpen: (kind: AhuDatasetKind) => {
              setDatabaseAhuSection(kind);
              setInAhu(true);
            },
            datasets: [
              { key: "materials" as const, label: t("database.tab.materials"), Icon: Package },
              { key: "profiles" as const, label: t("database.tab.profiles"), Icon: Ruler },
              { key: "components" as const, label: t("database.tab.components"), Icon: Boxes },
            ],
          }
        : undefined,
    [ahuModuleEnabled, activeTabRaw, setDatabaseActiveTab, setDatabaseAhuSection, t]
  );

  if (ahuModuleEnabled && inAhu) {
    return (
      <DatabaseShell>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 self-start"
          onClick={() => setInAhu(false)}
        >
          <ArrowLeft className="size-4" />
          {t("database.explorer.ahu")}
        </Button>
        <Tabs value={ahuSection} onValueChange={setDatabaseAhuSection} className="w-full">
          <PillTabsList className="mb-6">
            <PillTabsTrigger value="materials" layoutId="database-ahu-section-pill">
              {t("database.tab.materials")}
            </PillTabsTrigger>
            <PillTabsTrigger value="profiles" layoutId="database-ahu-section-pill">
              {t("database.tab.profiles")}
            </PillTabsTrigger>
            <PillTabsTrigger value="components" layoutId="database-ahu-section-pill">
              {t("database.tab.components")}
            </PillTabsTrigger>
          </PillTabsList>
          <TabsContent value="materials" forceMount className={AHU_TAB_CONTENT_CLASS}>
            <MaterialsPanel show={show} />
          </TabsContent>
          <TabsContent value="profiles" forceMount className={AHU_TAB_CONTENT_CLASS}>
            <ProfilesPanel show={show} />
          </TabsContent>
          <TabsContent value="components" forceMount className={AHU_TAB_CONTENT_CLASS}>
            <ComponentsPanel show={show} />
          </TabsContent>
        </Tabs>
      </DatabaseShell>
    );
  }

  return <CustomDatabasePanel show={show} ahuEntry={ahuEntry} />;
}
