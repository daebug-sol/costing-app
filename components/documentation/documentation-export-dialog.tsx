"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EditorCtx } from "./use-documentation-editor";

export function DocumentationExportDialog({ ed }: { ed: EditorCtx }) {
  const {
    exportOpen,
    setExportOpen,
    runExport,
  } = ed;

  return (
    <>
      <Dialog open={exportOpen !== null} onOpenChange={(o) => !o && setExportOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {exportOpen === "pdf" ? "Export PDF" : "Export Excel"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                void runExport(exportOpen === "excel" ? "excel" : "pdf", "internal")
              }
            >
              Internal Draft
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void runExport(exportOpen === "excel" ? "excel" : "pdf", "quotation")
              }
            >
              Quotation
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void runExport(exportOpen === "excel" ? "excel" : "pdf", "detailed")
              }
            >
              Detailed Costing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
