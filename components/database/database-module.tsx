"use client";

import { useEffect } from "react";
import { PillTabsList, PillTabsTrigger } from "@/components/ui/pill-tabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUiWorkflowStore } from "@/store/uiWorkflowStore";
import { useCostingStore } from "@/store/costingStore";
import { CustomDatabasePanel } from "./custom-database-panel";
import { useToast, AHU_TAB_CONTENT_CLASS } from "./database-shared";
import { MaterialsPanel } from "./materials-panel";
import { ProfilesPanel } from "./profiles-panel";
import { ComponentsPanel } from "./components-panel";

export function DatabaseModule() {
  const { show } = useToast();
  const modules = useCostingStore((s) => s.modules);
  const loadOrgModules = useCostingStore((s) => s.loadOrgModules);
  const ahuModuleEnabled = modules.ahu;
  const activeTabRaw = useUiWorkflowStore((s) => s.database.activeTab || "ahu");
  const setDatabaseActiveTab = useUiWorkflowStore((s) => s.setDatabaseActiveTab);
  const ahuSection = useUiWorkflowStore((s) => s.database.ahuSection || "materials");
  const setDatabaseAhuSection = useUiWorkflowStore((s) => s.setDatabaseAhuSection);

  useEffect(() => {
    void loadOrgModules().catch(() => undefined);
  }, [loadOrgModules]);

  useEffect(() => {
    if (!ahuModuleEnabled && activeTabRaw === "ahu") {
      setDatabaseActiveTab("custom");
    }
  }, [ahuModuleEnabled, activeTabRaw, setDatabaseActiveTab]);

  const activeTab = ahuModuleEnabled ? activeTabRaw : "custom";

  return (
    <div className="relative">
      <Tabs value={activeTab} onValueChange={setDatabaseActiveTab} className="w-full">
        {ahuModuleEnabled ? (
          <TabsList className="mb-6 inline-flex h-auto rounded-full border border-primary/20 bg-muted/70 p-1">
            <TabsTrigger
              value="ahu"
              className="rounded-full px-5 py-2 data-[state=active]:text-primary-foreground data-[state=active]:hover:text-primary-foreground"
            >
              AHU Database
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className="rounded-full px-5 py-2 data-[state=active]:text-primary-foreground data-[state=active]:hover:text-primary-foreground"
            >
              Custom Database
            </TabsTrigger>
          </TabsList>
        ) : null}
        {ahuModuleEnabled ? (
          <TabsContent value="ahu" className="mt-0">
            <Tabs value={ahuSection} onValueChange={setDatabaseAhuSection} className="w-full">
              <PillTabsList className="mb-6">
                <PillTabsTrigger value="materials" layoutId="database-ahu-section-pill">
                  Material Prices
                </PillTabsTrigger>
                <PillTabsTrigger value="profiles" layoutId="database-ahu-section-pill">
                  Profile Data
                </PillTabsTrigger>
                <PillTabsTrigger value="components" layoutId="database-ahu-section-pill">
                  Component Catalog
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
          </TabsContent>
        ) : null}
        <TabsContent value="custom" className="mt-0">
          <CustomDatabasePanel show={show} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
