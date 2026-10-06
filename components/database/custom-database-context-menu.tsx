"use client";

import { isLocked } from "./custom-database-shared";
import type { PanelCtx } from "./use-custom-database";

export function CustomDatabaseContextMenu({ ed }: { ed: PanelCtx }) {
  const {
    setAddColumnDialogOpen,
    ctxMenu,
    setCtxMenu,
    selectedCell,
    deleteColumn,
    addRow,
    deleteRow,
    clearCell,
  } = ed;

  return (
    <>
      {ctxMenu.open ? (
        <div
          className="fixed z-50 min-w-[180px] rounded-md border border-border bg-card p-1 shadow-lg"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
          <button
            type="button"
            className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
            onClick={() => {
              setCtxMenu((s) => ({ ...s, open: false }));
              setAddColumnDialogOpen(true);
            }}
          >
            Tambah kolom
          </button>
          <button
            type="button"
            className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
            onClick={() => {
              setCtxMenu((s) => ({ ...s, open: false }));
              void addRow();
            }}
          >
            Tambah baris
          </button>
          {ctxMenu.rowId ? (
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-left text-sm text-destructive hover:bg-muted"
              onClick={() => {
                const rowId = ctxMenu.rowId;
                setCtxMenu((s) => ({ ...s, open: false }));
                if (rowId) void deleteRow(rowId);
              }}
            >
              Hapus baris
            </button>
          ) : null}
          {ctxMenu.columnId && !isLocked(ctxMenu.columnId) ? (
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-left text-sm text-destructive hover:bg-muted"
              onClick={() => {
                const colId = ctxMenu.columnId;
                setCtxMenu((s) => ({ ...s, open: false }));
                if (colId) void deleteColumn(colId);
              }}
            >
              Hapus kolom
            </button>
          ) : null}
          {(ctxMenu.rowId && ctxMenu.columnId) || selectedCell ? (
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-left text-sm text-destructive hover:bg-muted"
              onClick={() => {
                const rowId = ctxMenu.rowId ?? selectedCell?.rowId;
                const colId = ctxMenu.columnId ?? selectedCell?.columnId;
                setCtxMenu((s) => ({ ...s, open: false }));
                if (rowId && colId) void clearCell(rowId, colId);
              }}
            >
              Kosongkan sel
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
