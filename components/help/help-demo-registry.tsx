"use client";

import type { ComponentType } from "react";
import type { HelpDemoId } from "@/content/help/types";
import { CreateProjectDemo } from "@/components/help/demos/create-project-demo";
import { EditCellDemo } from "@/components/help/demos/edit-cell-demo";
import { ExportQuotationDemo } from "@/components/help/demos/export-quotation-demo";
import { FolderFileDemo } from "@/components/help/demos/folder-file-demo";

const REGISTRY: Record<HelpDemoId, ComponentType> = {
  "create-project": CreateProjectDemo,
  "folder-file": FolderFileDemo,
  "edit-cell": EditCellDemo,
  "export-quotation": ExportQuotationDemo,
};

export function HelpDemo({ demoId }: { demoId: HelpDemoId }) {
  const Demo = REGISTRY[demoId];
  return <Demo />;
}

export function hasHelpDemo(demoId: string): demoId is HelpDemoId {
  return demoId in REGISTRY;
}
