"use client";

import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "./custom-database-shared";
import type { PanelCtx } from "./use-custom-database";

export function CustomDatabasePagination({ ed }: { ed: PanelCtx }) {
  const {
    gridPage,
    setGridPage,
    rows,
  } = ed;

  return (
    <>
      {rows.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Baris {gridPage * PAGE_SIZE + 1}–{Math.min((gridPage + 1) * PAGE_SIZE, rows.length)} dari{" "}
            {rows.length}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={gridPage <= 0}
              onClick={() => setGridPage((p) => Math.max(0, p - 1))}
            >
              Sebelumnya
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              Halaman {gridPage + 1} / {Math.max(1, Math.ceil(rows.length / PAGE_SIZE))}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={gridPage >= Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1)}
              onClick={() =>
                setGridPage((p) =>
                  Math.min(Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1), p + 1)
                )
              }
            >
              Berikutnya
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
