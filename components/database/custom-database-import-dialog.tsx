"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PanelCtx } from "./use-custom-database";

export function CustomDatabaseImportDialog({ ed }: { ed: PanelCtx }) {
  const {
    importDialogOpen,
    setImportDialogOpen,
    pendingImportFile,
    setPendingImportFile,
    importIntoTable,
  } = ed;

  return (
    <>
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mode import</DialogTitle>
            <DialogDescription>
              Pilih cara import Excel untuk file custom database ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!pendingImportFile) return;
                setImportDialogOpen(false);
                const file = pendingImportFile;
                setPendingImportFile(null);
                await importIntoTable(file, "append");
              }}
            >
              Add Part ke File Aktif
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!pendingImportFile) return;
                setImportDialogOpen(false);
                const file = pendingImportFile;
                setPendingImportFile(null);
                await importIntoTable(file, "new");
              }}
            >
              Buat file baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
