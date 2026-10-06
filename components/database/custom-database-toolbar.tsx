"use client";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import type { PanelCtx } from "./use-custom-database";

export function CustomDatabaseToolbar({ ed }: { ed: PanelCtx }) {
  const { t } = useI18n();
  const {
    table,
    importRef,
    saveStatus,
    openFile,
    exportActiveFile,
    downloadTemplate,
    onImportFile,
  } = ed;

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void openFile("")}
          >
            Kembali ke file
          </Button>
          <span className="truncate text-sm text-muted-foreground">Editing: {table.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => importRef.current?.click()}>
            Import Excel
          </Button>
          <Button type="button" variant="outline" onClick={() => void downloadTemplate()}>
            Download Template
          </Button>
          <Button type="button" variant="outline" onClick={() => void exportActiveFile()}>
            Export Excel
          </Button>
        </div>
        <div className="flex items-center">
        <span className="text-xs text-muted-foreground">
          {saveStatus === "saving"
            ? t("common.saving")
            : saveStatus === "saved"
              ? t("common.saved")
              : saveStatus === "failed"
                ? t("common.saveFailed")
                : ""}
        </span>
        </div>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={onImportFile}
        />
      </div>
    </>
  );
}
