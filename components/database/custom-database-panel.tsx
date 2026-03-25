"use client";

import { FileSpreadsheet, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { columnHeaderToVariableKey, hasColumnKey } from "@/lib/custom-db";
import { exportDatabaseSheet, parseXlsxFirstSheet } from "@/lib/database-xlsx";
import { formatIDR } from "@/lib/utils/format";

type CustomCol = {
  id: string;
  header: string;
  sortOrder: number;
  locked: boolean;
};

type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
  rowId?: string;
  columnId?: string;
};

type CustomCell = {
  rowId: string;
  columnId: string;
  rawValue: string | null;
  computedValue: number | null;
};

type CustomRow = {
  id: string;
  sortOrder: number;
  cells: CustomCell[];
};

type CustomTable = {
  id: string;
  name: string;
  columns: CustomCol[];
  rows: CustomRow[];
};

type FileItem = {
  id: string;
  name: string;
  updatedAt: string;
  rowsCount: number;
  columnsCount: number;
};

const PAGE_SIZE = 100;

const FORMULA_REF_CELL_CLASSES = [
  "bg-rose-100/80 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200",
  "bg-sky-100/80 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200",
  "bg-amber-100/80 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  "bg-emerald-100/80 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  "bg-violet-100/80 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200",
  "bg-fuchsia-100/80 text-fuchsia-900 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
] as const;

function hashToToneIndex(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % FORMULA_REF_CELL_CLASSES.length;
}

function getRefToneClasses(index: number) {
  const i = ((index % FORMULA_REF_CELL_CLASSES.length) + FORMULA_REF_CELL_CLASSES.length) %
    FORMULA_REF_CELL_CLASSES.length;
  switch (i) {
    case 0:
      return {
        cellClass: FORMULA_REF_CELL_CLASSES[0],
        formulaTextClass: "text-rose-700 dark:text-rose-300",
        borderClass: "ring-2 ring-rose-500/80 dark:ring-rose-400/70",
      };
    case 1:
      return {
        cellClass: FORMULA_REF_CELL_CLASSES[1],
        formulaTextClass: "text-sky-700 dark:text-sky-300",
        borderClass: "ring-2 ring-sky-500/80 dark:ring-sky-400/70",
      };
    case 2:
      return {
        cellClass: FORMULA_REF_CELL_CLASSES[2],
        formulaTextClass: "text-amber-700 dark:text-amber-300",
        borderClass: "ring-2 ring-amber-500/80 dark:ring-amber-400/70",
      };
    case 3:
      return {
        cellClass: FORMULA_REF_CELL_CLASSES[3],
        formulaTextClass: "text-emerald-700 dark:text-emerald-300",
        borderClass: "ring-2 ring-emerald-500/80 dark:ring-emerald-400/70",
      };
    case 4:
      return {
        cellClass: FORMULA_REF_CELL_CLASSES[4],
        formulaTextClass: "text-violet-700 dark:text-violet-300",
        borderClass: "ring-2 ring-violet-500/80 dark:ring-violet-400/70",
      };
    default:
      return {
        cellClass: FORMULA_REF_CELL_CLASSES[5],
        formulaTextClass: "text-fuchsia-700 dark:text-fuchsia-300",
        borderClass: "ring-2 ring-fuchsia-500/80 dark:ring-fuchsia-400/70",
      };
  }
}

function extractFormulaVarKeys(rawValue: string): string[] {
  const src = rawValue.trimStart();
  if (!src.startsWith("=")) return [];
  const body = src.slice(1);
  const hits = body.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) ?? [];
  const uniq: string[] = [];
  for (const h of hits) {
    const key = h.toLowerCase();
    if (!uniq.includes(key)) uniq.push(key);
  }
  return uniq;
}

function tokenizeFormulaBody(body: string): string[] {
  return body.match(/[A-Za-z_][A-Za-z0-9_]*|[0-9]+(?:\.[0-9]+)?|\s+|./g) ?? [];
}

const isLocked = (columnId: string) =>
  hasColumnKey(columnId, "col_code") ||
  hasColumnKey(columnId, "col_name") ||
  hasColumnKey(columnId, "col_uom") ||
  hasColumnKey(columnId, "col_price");

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

function cellInputDisplay(
  cell: CustomCell | undefined,
  colId: string,
  focused: boolean
): string {
  const raw = cell?.rawValue ?? "";
  if (focused) return raw;
  const t = raw.trim();
  if (t.startsWith("=")) {
    if (hasColumnKey(colId, "col_price") && cell?.computedValue != null) {
      return formatIDR(cell.computedValue);
    }
    return cell?.computedValue != null ? String(cell.computedValue) : "";
  }
  if (hasColumnKey(colId, "col_price") && cell?.computedValue != null) {
    return formatIDR(cell.computedValue);
  }
  return raw;
}

export function CustomDatabasePanel({
  show,
}: {
  show: (t: "success" | "error", m: string) => void;
}) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [table, setTable] = useState<CustomTable | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newFileName, setNewFileName] = useState("");
  const [newColumns, setNewColumns] = useState<Array<{ header: string; kind: string }>>([]);
  const [insertRef, setInsertRef] = useState<{ rowId: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);
  const [addColumnName, setAddColumnName] = useState("");
  const [addColumnKind, setAddColumnKind] = useState("text");
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [explorerSearch, setExplorerSearch] = useState("");
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
  });
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(
    null
  );
  const [gridPage, setGridPage] = useState(0);
  const [fillPreview, setFillPreview] = useState<{
    r0: number;
    c0: number;
    r1: number;
    c1: number;
  } | null>(null);
  const [focusedCell, setFocusedCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [formulaRefSelecting, setFormulaRefSelecting] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const formulaInputRef = useRef<HTMLInputElement | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/custom-db", { cache: "no-store" });
      if (!r.ok) throw new Error("Gagal memuat daftar file");
      const data = (await r.json()) as FileItem[];
      setFiles(data);
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal memuat daftar file");
    } finally {
      setLoading(false);
    }
  }, [show]);

  const openFile = useCallback(async (id: string, resetPage = true) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/custom-db/${id}`, { cache: "no-store" });
      if (!r.ok) throw new Error("Gagal membuka file");
      const data = (await r.json()) as CustomTable;
      data.columns.sort((a, b) => a.sortOrder - b.sortOrder);
      data.rows.sort((a, b) => a.sortOrder - b.sortOrder);
      setTable(data);
      setActiveFileId(id);
      if (resetPage) {
        setGridPage(0);
        const firstRowId = data.rows[0]?.id;
        const codeColId =
          data.columns.find((c) => hasColumnKey(c.id, "col_code"))?.id ?? data.columns[0]?.id;
        setSelectedCell(
          firstRowId && codeColId ? { rowId: firstRowId, columnId: codeColId } : null
        );
        setFocusedCell(null);
        setInsertRef(null);
      }
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal membuka file");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    const onWindowClick = () => setCtxMenu((s) => ({ ...s, open: false }));
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, []);

  useEffect(() => {
    if (!focusedCell) formulaInputRef.current = null;
  }, [focusedCell]);

  const pendingFocusRef = useRef<{ rowId: string; columnId: string } | null>(null);
  const skipBlurCommitRef = useRef(false);

  const rows = table?.rows ?? [];
  const columns = table?.columns ?? [];

  const focusCellInput = useCallback(
    (rowId: string, columnId: string) => {
      pendingFocusRef.current = { rowId, columnId };
      const rowIdx = rows.findIndex((r) => r.id === rowId);
      if (rowIdx < 0) return;
      const nextPage = Math.floor(rowIdx / PAGE_SIZE);
      setGridPage((p) => (p === nextPage ? p : nextPage));
      requestAnimationFrame(() => {
        tryFocusPending();
      });
    },
    [rows]
  );

  const tryFocusPending = useCallback(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    const { rowId, columnId } = pending;
    const el = document.querySelector<HTMLInputElement>(
      `input[data-grid-row-id="${rowId}"][data-grid-col-id="${columnId}"]`
    );
    if (el) {
      el.focus();
      const pos = el.value.length;
      el.setSelectionRange(pos, pos);
      pendingFocusRef.current = null;
      skipBlurCommitRef.current = false;
    }
  }, []);

  useEffect(() => {
    tryFocusPending();
  }, [tryFocusPending, gridPage, table]);

  useEffect(() => {
    if (focusedCell) return;
    if (!selectedCell) return;
    const el = document.querySelector<HTMLInputElement>(
      `input[data-grid-row-id="${selectedCell.rowId}"][data-grid-col-id="${selectedCell.columnId}"]`
    );
    if (el) el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedCell, focusedCell, gridPage]);

  useEffect(() => {
    if (!activeFileId || !table) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (focusedCell) return; // only when not actively typing

      const ae = document.activeElement as HTMLElement | null;
      const isTypingTarget =
        !!ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.tagName === "SELECT" ||
          ae.getAttribute("contenteditable") === "true");
      if (isTypingTarget) return;

      if (!selectedCell) return;

      if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        focusCellInput(selectedCell.rowId, selectedCell.columnId);
        return;
      }

      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const colIdx = columns.findIndex((c) => c.id === selectedCell.columnId);
        if (colIdx < 0) return;
        const nextColIdx = colIdx + (e.key === "ArrowLeft" ? -1 : 1);
        const nextCol = columns[nextColIdx];
        if (!nextCol) return;
        setSelectedCell({ rowId: selectedCell.rowId, columnId: nextCol.id });
        return;
      }

      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const rowIdx = rows.findIndex((r) => r.id === selectedCell.rowId);
        if (rowIdx < 0) return;
        const nextRowIdx = rowIdx + (e.key === "ArrowUp" ? -1 : 1);
        const nextRow = rows[nextRowIdx];
        if (!nextRow) return;
        setSelectedCell({ rowId: nextRow.id, columnId: selectedCell.columnId });
        const nextPage = Math.floor(nextRowIdx / PAGE_SIZE);
        setGridPage(nextPage);
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true } as any);
  }, [activeFileId, table, focusedCell, selectedCell, columns, focusCellInput]);

  const activeFormulaRefs = useMemo(() => {
    if (!focusedCell || !table) return null;
    const row = table.rows.find((r) => r.id === focusedCell.rowId);
    if (!row) return null;
    const cell = row.cells.find((c) => c.columnId === focusedCell.columnId);
    const raw = String(cell?.rawValue ?? "");
    const keys = extractFormulaVarKeys(raw);
    if (keys.length === 0) return null;
    const colorByKey = new Map<string, number>();
    keys.forEach((k, i) => colorByKey.set(k, i % FORMULA_REF_CELL_CLASSES.length));
    return {
      rowId: focusedCell.rowId,
      formulaColumnId: focusedCell.columnId,
      keys,
      colorByKey,
    };
  }, [focusedCell, table]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
    setGridPage((p) => Math.min(p, maxPage));
  }, [rows.length]);

  const visibleRows = useMemo(() => {
    const start = gridPage * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, gridPage]);

  const getCell = (row: CustomRow, colId: string) =>
    row.cells.find((c) => c.columnId === colId);

  const insertVarKeyAtCursor = useCallback(
    (varKey: string) => {
      if (!varKey || !focusedCell || !table) return;
      setFormulaRefSelecting(null);
      const row = table.rows.find((r) => r.id === focusedCell.rowId);
      if (!row) return;
      const cell = getCell(row, focusedCell.columnId);
      const raw = cell?.rawValue ?? "";
      if (!String(raw).trimStart().startsWith("=")) return;

      const input = formulaInputRef.current;
      const selStart = input?.selectionStart ?? raw.length;
      const selEnd = input?.selectionEnd ?? raw.length;

      let replaceStart = selStart;
      let replaceEnd = selEnd;

      // If no selection, replace nearest variable token at cursor (prevent stacking refs).
      if (selStart === selEnd) {
        const isVarChar = (ch: string) => /[A-Za-z0-9_]/.test(ch);
        let left = selStart;
        let right = selStart;
        while (left > 0 && isVarChar(raw[left - 1] ?? "")) left -= 1;
        while (right < raw.length && isVarChar(raw[right] ?? "")) right += 1;
        const token = raw.slice(left, right);
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
          replaceStart = left;
          replaceEnd = right;
        }
      }

      const next = raw.slice(0, replaceStart) + varKey + raw.slice(replaceEnd);

      setTable((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((r) => {
            if (r.id !== focusedCell.rowId) return r;
            const cells = r.cells.some((c) => c.columnId === focusedCell.columnId)
              ? r.cells.map((c) =>
                  c.columnId === focusedCell.columnId ? { ...c, rawValue: next } : c
                )
              : [
                  ...r.cells,
                  {
                    rowId: focusedCell.rowId,
                    columnId: focusedCell.columnId,
                    rawValue: next,
                    computedValue: null,
                  },
                ];
            return { ...r, cells };
          }),
        };
      });

      queueMicrotask(() => {
        const el = formulaInputRef.current;
        if (!el) return;
        el.focus();
        const pos = replaceStart + varKey.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [focusedCell, table]
  );

  const updateCell = async (rowId: string, columnId: string, rawValue: string) => {
    setSaveStatus("saving");
    const r = await fetch("/api/custom-db/cells", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowId, columnId, rawValue }),
    });
    if (!r.ok) {
      setSaveStatus("failed");
      show("error", "Gagal menyimpan cell");
      return;
    }
    if (activeFileId) await openFile(activeFileId, false);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus((prev) => (prev === "saved" ? "idle" : prev)), 1200);
  };

  const patchCellRaw = async (rowId: string, columnId: string, rawValue: string) => {
    await fetch("/api/custom-db/cells", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowId, columnId, rawValue }),
    });
  };

  const addColumn = async (header: string, kind: string) => {
    if (!table) return;
    if (!header.trim()) return;
    const r = await fetch("/api/custom-db/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: table.id, header, kind }),
    });
    if (!r.ok) {
      show("error", await readErr(r));
      return;
    }
    if (activeFileId) await openFile(activeFileId, false);
  };

  const renameColumn = async (columnId: string, header: string) => {
    if (isLocked(columnId)) return;
    const next = header.trim();
    if (!next) return;
    const r = await fetch(`/api/custom-db/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ header: next }),
    });
    if (!r.ok) {
      show("error", "Gagal rename kolom");
      return;
    }
    if (activeFileId) await openFile(activeFileId, false);
  };

  const deleteColumn = async (colId: string) => {
    if (isLocked(colId)) return;
    const r = await fetch(`/api/custom-db/columns/${colId}`, { method: "DELETE" });
    if (!r.ok) {
      show("error", "Gagal hapus kolom");
      return;
    }
    if (activeFileId) await openFile(activeFileId, false);
  };

  const addRow = async () => {
    if (!table) return;
    const r = await fetch("/api/custom-db/rows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: table.id }),
    });
    if (!r.ok) {
      show("error", "Gagal tambah row");
      return;
    }
    if (activeFileId) await openFile(activeFileId, false);
  };

  const deleteRow = async (rowId: string) => {
    const r = await fetch(`/api/custom-db/rows/${rowId}`, { method: "DELETE" });
    if (!r.ok) {
      show("error", "Gagal hapus row");
      return;
    }
    if (activeFileId) await openFile(activeFileId, false);
  };

  const clearCell = async (rowId: string, columnId: string) => {
    await updateCell(rowId, columnId, "");
  };

  const applyRectFill = async (
    sourceRowId: string,
    sourceColumnId: string,
    targets: Array<{ rowId: string; columnId: string }>
  ) => {
    if (targets.length === 0) return;
    setSaveStatus("saving");
    const r = await fetch("/api/custom-db/fill", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceRowId, sourceColumnId, targets }),
    });
    if (!r.ok) {
      setSaveStatus("failed");
      show("error", "Gagal menyalin ke area terpilih");
      return;
    }
    if (activeFileId) await openFile(activeFileId, false);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus((prev) => (prev === "saved" ? "idle" : prev)), 1200);
  };

  const startFillDrag = (
    e: React.MouseEvent,
    sourceRowIndex: number,
    sourceColIndex: number,
    sourceRowId: string,
    sourceColumnId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const endRef = { row: sourceRowIndex, col: sourceColIndex };
    setFillPreview({
      r0: sourceRowIndex,
      c0: sourceColIndex,
      r1: sourceRowIndex,
      c1: sourceColIndex,
    });

    const onMove = (ev: MouseEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const td = el?.closest?.("td[data-custom-col-index]");
      const tr = el?.closest?.("tr[data-custom-row-index]");
      if (!tr || !td) return;
      const rowIdx = Number(tr.getAttribute("data-custom-row-index"));
      const colIdx = Number(td.getAttribute("data-custom-col-index"));
      if (!Number.isFinite(rowIdx) || !Number.isFinite(colIdx)) return;
      endRef.row = rowIdx;
      endRef.col = colIdx;
      setFillPreview({
        r0: sourceRowIndex,
        c0: sourceColIndex,
        r1: rowIdx,
        c1: colIdx,
      });
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setFillPreview(null);

      const rMin = Math.min(sourceRowIndex, endRef.row);
      const rMax = Math.max(sourceRowIndex, endRef.row);
      const cMin = Math.min(sourceColIndex, endRef.col);
      const cMax = Math.max(sourceColIndex, endRef.col);

      const targets: Array<{ rowId: string; columnId: string }> = [];
      for (let ri = rMin; ri <= rMax; ri++) {
        for (let ci = cMin; ci <= cMax; ci++) {
          if (ri === sourceRowIndex && ci === sourceColIndex) continue;
          const row = rows[ri];
          const col = columns[ci];
          if (row && col) targets.push({ rowId: row.id, columnId: col.id });
        }
      }
      if (targets.length > 0) {
        void applyRectFill(sourceRowId, sourceColumnId, targets);
      }
    };

    document.body.style.cursor = "cell";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const createFile = async () => {
    if (!newFileName.trim()) {
      show("error", "Nama file wajib diisi");
      return;
    }
    const r = await fetch("/api/custom-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFileName, columns: newColumns }),
    });
    if (!r.ok) {
      show("error", await readErr(r));
      return;
    }
    const created = (await r.json()) as CustomTable;
    setNewFileName("");
    setNewColumns([]);
    setNewFileDialogOpen(false);
    await loadFiles();
    await openFile(created.id);
  };

  const exportActiveFile = async () => {
    if (!table) return;
    const header = table.columns.map((c) => c.header);
    const data = table.rows.map((row) =>
      table.columns.map((col) => {
        const cell = row.cells.find((c) => c.columnId === col.id);
        return cell?.rawValue ?? cell?.computedValue ?? "";
      })
    );
    await exportDatabaseSheet(`${table.name}.xlsx`, header, data);
    show("success", "Export Excel berhasil");
  };

  const importIntoTable = async (file: File, mode: "new" | "append") => {
    setSaveStatus("saving");
    const parsed = await parseXlsxFirstSheet(file);
    const headers = parsed.headers.map((h) => h.trim()).filter(Boolean);
    if (headers.length === 0) {
      show("error", "Header Excel kosong");
      setSaveStatus("failed");
      return;
    }
    const lower = headers.map((h) => h.toLowerCase());
    const hasCode = lower.includes("code");
    const hasName = lower.includes("name");
    if (!hasCode || !hasName) {
      show("error", "Excel wajib punya header Code dan Name");
      setSaveStatus("failed");
      return;
    }

    let target: CustomTable | null = table;
    if (mode === "new") {
      const dynamicHeaders = headers.filter(
        (h) => !["code", "name", "uom", "price"].includes(h.toLowerCase())
      );
      const createRes = await fetch("/api/custom-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name.replace(/\.xlsx$/i, ""),
          columns: dynamicHeaders.map((h) => ({ header: h, kind: "text" })),
        }),
      });
      if (!createRes.ok) {
        show("error", "Gagal membuat file baru dari import");
        setSaveStatus("failed");
        return;
      }
      const created = (await createRes.json()) as CustomTable;
      target = created;
    }
    if (!target) {
      show("error", "Tidak ada file target untuk import");
      setSaveStatus("failed");
      return;
    }
    const latestRes = await fetch(`/api/custom-db/${target.id}`, { cache: "no-store" });
    if (!latestRes.ok) {
      show("error", "Gagal membuka file target import");
      setSaveStatus("failed");
      return;
    }
    const latest = (await latestRes.json()) as CustomTable;
    const colByHeader = new Map(latest.columns.map((c) => [c.header.toLowerCase(), c.id]));

    for (const rec of parsed.rows) {
      const rowRes = await fetch("/api/custom-db/rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: latest.id }),
      });
      if (!rowRes.ok) continue;
      const row = (await rowRes.json()) as { id: string };
      for (const h of headers) {
        const colId = colByHeader.get(h.toLowerCase());
        if (!colId) continue;
        const value = String(rec[h] ?? "").trim();
        if (!value) continue;
        await patchCellRaw(row.id, colId, value);
      }
    }
    await loadFiles();
    await openFile(latest.id);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus((prev) => (prev === "saved" ? "idle" : prev)), 1200);
    show("success", "Import Excel selesai");
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      show("error", "Gunakan file .xlsx");
      return;
    }
    if (activeFileId) {
      setPendingImportFile(file);
      setImportDialogOpen(true);
      return;
    }
    await importIntoTable(file, "new");
  };

  const filteredFiles = files.filter((f) => {
    const q = explorerSearch.trim().toLowerCase();
    if (!q) return true;
    return f.name.toLowerCase().includes(q);
  });

  const openContextMenu = (
    e: React.MouseEvent,
    payload: { rowId?: string; columnId?: string }
  ) => {
    e.preventDefault();
    setCtxMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
      ...payload,
    });
  };

  if (loading) return <div className="rounded-lg border p-4 text-sm">Loading custom database...</div>;

  if (!activeFileId || !table) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama file…"
                value={explorerSearch}
                onChange={(e) => setExplorerSearch(e.target.value)}
                className="max-w-md bg-card pl-8"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => setNewFileDialogOpen(true)}>
              <Plus className="size-4" />
              + Add New
            </Button>
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={onImportFile}
            />
            <Button type="button" variant="outline" onClick={() => importRef.current?.click()}>
              Import Excel
            </Button>
            <Button type="button" variant="outline" disabled>
              Export Excel
            </Button>
          </div>
        </div>

        {filteredFiles.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="Belum ada custom database"
            description="Buat file baru atau import Excel untuk mulai input data."
            actionLabel="Add New File"
            onAction={() => setNewFileDialogOpen(true)}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="px-3 py-2 text-left">File Name</th>
                  <th className="px-3 py-2 text-left">Rows</th>
                  <th className="px-3 py-2 text-left">Columns</th>
                  <th className="px-3 py-2 text-left">Updated</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((f) => (
                  <tr key={f.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">{f.name}</td>
                    <td className="px-3 py-2">{f.rowsCount}</td>
                    <td className="px-3 py-2">{f.columnsCount}</td>
                    <td className="px-3 py-2">{new Date(f.updatedAt).toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right">
                      <Button type="button" variant="outline" onClick={() => void openFile(f.id)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={newFileDialogOpen} onOpenChange={setNewFileDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New File</DialogTitle>
              <DialogDescription>
                Tentukan nama file dan kategori kolom dinamis untuk custom database.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="file-name">File name</Label>
              <Input
                id="file-name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="contoh: PLAT SS 304"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Schema dynamic columns (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setNewColumns((prev) => [...prev, { header: "", kind: "text" }])
                  }
                >
                  <Plus className="size-4" />
                  Add schema column
                </Button>
              </div>
              <div className="space-y-2">
                {newColumns.map((col, idx) => (
                  <div key={`${idx}-${col.header}`} className="flex gap-2">
                    <Input
                      value={col.header}
                      onChange={(e) =>
                        setNewColumns((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, header: e.target.value } : c))
                        )
                      }
                      placeholder="Column name"
                    />
                    <Select
                      value={col.kind}
                      onValueChange={(v) =>
                        setNewColumns((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, kind: v } : c))
                        )
                      }
                    >
                      <SelectTrigger className="w-[190px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="currency">Finance/Forex</SelectItem>
                        <SelectItem value="uom">UOM</SelectItem>
                        <SelectItem value="formula">Formula</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewFileDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void createFile()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setActiveFileId(null);
              setTable(null);
            }}
          >
            Back to Files
          </Button>
          <span className="truncate text-sm text-muted-foreground">Editing: {table.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => importRef.current?.click()}>
            Import Excel
          </Button>
          <Button type="button" variant="outline" onClick={() => void exportActiveFile()}>
            Export Excel
          </Button>
        </div>
        <div className="flex items-center">
        <span className="text-xs text-muted-foreground">
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
              ? "Saved"
              : saveStatus === "failed"
                ? "Save failed"
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

      <div className="overflow-auto rounded-lg border border-border bg-card">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.id}
                  onMouseDownCapture={(e) => {
                    if (!focusedCell || !table) return;
                    const fr = table.rows.find((r) => r.id === focusedCell.rowId);
                    if (!fr) return;
                    const fc = getCell(fr, focusedCell.columnId);
                    const raw = fc?.rawValue ?? "";
                    if (!String(raw).trimStart().startsWith("=")) return;
                    const key = columnHeaderToVariableKey(col.header);
                    if (!key) return;
                    e.preventDefault();
                    e.stopPropagation();
                    insertVarKeyAtCursor(key);
                  }}
                  onContextMenu={(e) => openContextMenu(e, { columnId: col.id })}
                  className={`px-3 py-2 text-left font-medium ${
                    idx <= 1 ? "sticky left-0 z-20" : ""
                  } ${hasColumnKey(col.id, "col_price") ? "sticky right-0 z-30" : ""} ${
                    isLocked(col.id)
                      ? "bg-[#203351] text-white border-2 border-[#15233a]"
                      : "border-b border-r bg-muted"
                  }`}
                >
                  {isLocked(col.id) ? (
                    <span>{col.header}</span>
                  ) : (
                    <Input
                      value={col.header}
                      onChange={(e) =>
                        setTable((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            columns: prev.columns.map((c) =>
                              c.id === col.id ? { ...c, header: e.target.value } : c
                            ),
                          };
                        })
                      }
                      onBlur={(e) => void renameColumn(col.id, e.target.value)}
                      className="h-7 rounded-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, localRowIdx) => {
              const globalRowIndex = gridPage * PAGE_SIZE + localRowIdx;
              return (
                <tr
                  key={row.id}
                  data-custom-row-index={globalRowIndex}
                  onContextMenu={(e) => openContextMenu(e, { rowId: row.id })}
                >
                  {columns.map((col, colIdx) => {
                    const cell = getCell(row, col.id);
                    const focused =
                      focusedCell?.rowId === row.id && focusedCell?.columnId === col.id;
                    const display = cellInputDisplay(cell, col.id, focused);
                    const fp = fillPreview;
                    const inFill =
                      fp &&
                      globalRowIndex >= Math.min(fp.r0, fp.r1) &&
                      globalRowIndex <= Math.max(fp.r0, fp.r1) &&
                      colIdx >= Math.min(fp.c0, fp.c1) &&
                      colIdx <= Math.max(fp.c0, fp.c1);
                    const varKey = columnHeaderToVariableKey(col.header);
                    const refColorIndex =
                      activeFormulaRefs?.rowId === row.id
                        ? activeFormulaRefs.colorByKey.get(varKey.toLowerCase())
                        : undefined;
                    const refCellClass =
                      refColorIndex === undefined
                        ? ""
                        : getRefToneClasses(refColorIndex).cellClass;
                    const refCellBorderClass =
                      refColorIndex === undefined ? "" : getRefToneClasses(refColorIndex).borderClass;
                    const formulaTextColorClass =
                      refColorIndex === undefined
                        ? "text-violet-700 dark:text-violet-300"
                        : getRefToneClasses(refColorIndex).formulaTextClass;
                    const isFormulaCell =
                      activeFormulaRefs?.rowId === row.id &&
                      activeFormulaRefs.formulaColumnId === col.id;
                    const isCellSelected =
                      !focusedCell &&
                      selectedCell?.rowId === row.id &&
                      selectedCell?.columnId === col.id;
                    const formulaRaw = String(cell?.rawValue ?? "");
                    const showFormulaTokenColors =
                      isFormulaCell && focused && formulaRaw.trimStart().startsWith("=");
                    return (
                      <td
                        key={col.id}
                        data-custom-col-index={colIdx}
                        onMouseDownCapture={(e) => {
                          const t = e.target as HTMLElement;
                          if (t.closest("[data-fill-handle]")) return;
                          if (!focusedCell || focusedCell.rowId !== row.id) return;
                          if (focusedCell.columnId === col.id) return;
                          if (!table) return;
                          const fr = table.rows.find((r) => r.id === focusedCell.rowId);
                          if (!fr) return;
                          const fc = getCell(fr, focusedCell.columnId);
                          const raw = fc?.rawValue ?? "";
                          if (!String(raw).trimStart().startsWith("=")) return;
                          const key = columnHeaderToVariableKey(col.header);
                          if (!key) return;
                          e.preventDefault();
                          e.stopPropagation();
                          insertVarKeyAtCursor(key);
                        }}
                        onContextMenu={(e) => openContextMenu(e, { rowId: row.id, columnId: col.id })}
                        className={`relative border-b border-r px-2 py-1 ${
                          isCellSelected
                            ? "bg-green-50/60"
                            : inFill
                              ? "bg-primary/15"
                              : refCellClass || "bg-background"
                        } ${isCellSelected ? "" : refCellBorderClass} ${
                          refColorIndex !== undefined ? "z-20" : ""
                        } ${
                          isCellSelected
                            ? "ring-2 ring-green-300/90"
                            : formulaRefSelecting?.rowId === row.id &&
                                formulaRefSelecting?.columnId === col.id
                              ? `ring-2 ring-[#203351]/70`
                              : ""
                        } ${
                          colIdx <= 1 ? "sticky left-0 z-10" : ""
                        } ${
                          hasColumnKey(col.id, "col_price") ? "sticky right-0 z-10" : ""
                        }`}
                      >
                        <div className="relative">
                          {showFormulaTokenColors ? (
                            <div
                              aria-hidden
                              className="pointer-events-none absolute inset-0 z-10 overflow-hidden px-1 py-1 font-mono text-sm whitespace-pre"
                            >
                              <span className="text-muted-foreground">=</span>
                              {tokenizeFormulaBody(formulaRaw.trimStart().slice(1)).map((token, i) => {
                                const key = token.toLowerCase();
                                const tokenColorIndex = activeFormulaRefs?.colorByKey.get(key);
                                const tokenClass =
                                  tokenColorIndex === undefined
                                    ? "text-muted-foreground"
                                    : getRefToneClasses(tokenColorIndex).formulaTextClass;
                                return (
                                  <span key={`${token}-${i}`} className={tokenClass}>
                                    {token}
                                  </span>
                                );
                              })}
                            </div>
                          ) : null}
                          <Input
                            ref={focused ? formulaInputRef : undefined}
                          data-grid-row-id={row.id}
                          data-grid-col-id={col.id}
                            value={display}
                          onMouseDown={(e) => {
                            // Selection mode: when not typing, mouse click should select cell only.
                            if (focusedCell) return;
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedCell({ rowId: row.id, columnId: col.id });
                            setInsertRef(null);
                            setFormulaRefSelecting(null);
                          }}
                            onChange={(e) => {
                              const next = e.target.value;
                              setTable((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  rows: prev.rows.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          cells: r.cells.some((c) => c.columnId === col.id)
                                            ? r.cells.map((c) =>
                                                c.columnId === col.id ? { ...c, rawValue: next } : c
                                              )
                                            : [
                                                ...r.cells,
                                                {
                                                  rowId: row.id,
                                                  columnId: col.id,
                                                  rawValue: next,
                                                  computedValue: null,
                                                },
                                              ],
                                        }
                                      : r
                                  ),
                                };
                              });
                            }}
                            onFocus={() => {
                              setInsertRef({ rowId: row.id });
                              setSelectedCell({ rowId: row.id, columnId: col.id });
                              setFocusedCell({ rowId: row.id, columnId: col.id });
                              setFormulaRefSelecting(null);
                            }}
                            onKeyDown={(e) => {
                            const el = e.currentTarget;
                            const curValue = el.value;

                            if (e.key === "Escape") {
                              e.preventDefault();
                              skipBlurCommitRef.current = true;
                              setFocusedCell(null);
                              setInsertRef(null);
                              setFormulaRefSelecting(null);
                              el.blur();
                              return;
                            }

                            if (e.key === "Delete" || e.key === "Backspace") {
                              const len = el.value.length;
                              const ss = el.selectionStart ?? 0;
                              const se = el.selectionEnd ?? 0;
                              const allSelected = len > 0 && ss === 0 && se === len;
                              if (e.key === "Backspace" && len === 0) {
                                e.preventDefault();
                                void clearCell(row.id, col.id);
                                return;
                              }
                              if (e.key === "Delete" && (allSelected || len === 0)) {
                                e.preventDefault();
                                void clearCell(row.id, col.id);
                              }
                              return;
                            }

                            const isArrow =
                              e.key === "ArrowLeft" ||
                              e.key === "ArrowRight" ||
                              e.key === "ArrowUp" ||
                              e.key === "ArrowDown";
                            const isTab = e.key === "Tab";
                            const isEnter = e.key === "Enter";
                            const isCurrentFormulaCell = String(cell?.rawValue ?? "")
                              .trimStart()
                              .startsWith("=");

                            // Allow caret movement when user holds Ctrl/Meta with Arrow keys.
                            if (isArrow && (e.ctrlKey || e.metaKey)) return;
                            if ((isTab || isArrow) && (e.ctrlKey || e.metaKey || e.altKey)) return;

                            // Formula reference selecting mode:
                            // When caret is inside a formula cell, Arrow keys select a reference cell.
                            // Press Enter to insert the selected reference variable into the formula.
                            if (
                              isArrow &&
                              isCurrentFormulaCell &&
                              !e.ctrlKey &&
                              !e.metaKey &&
                              !e.altKey
                            ) {
                              e.preventDefault();
                              const pageStart = gridPage * PAGE_SIZE;
                              const pageEnd = Math.min(rows.length - 1, pageStart + PAGE_SIZE - 1);

                              const base = formulaRefSelecting ?? { rowId: row.id, columnId: col.id };
                              const baseRowIndex = rows.findIndex((r) => r.id === base.rowId);
                              const baseColIndex = columns.findIndex((c) => c.id === base.columnId);
                              if (baseRowIndex < 0 || baseColIndex < 0) return;

                              const dRow = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
                              const dCol = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;

                              let nextRowIndex = baseRowIndex + dRow;
                              let nextColIndex = baseColIndex + dCol;

                              // Keep formula caret safe by restricting selection to the currently visible page.
                              nextRowIndex = Math.max(pageStart, Math.min(pageEnd, nextRowIndex));
                              nextColIndex = Math.max(0, Math.min(columns.length - 1, nextColIndex));

                              const nextRow = rows[nextRowIndex];
                              const nextCol = columns[nextColIndex];
                              if (!nextRow || !nextCol) return;

                              setFormulaRefSelecting({ rowId: nextRow.id, columnId: nextCol.id });
                              return;
                            }

                            if (isEnter && isCurrentFormulaCell && formulaRefSelecting && !e.ctrlKey) {
                              e.preventDefault();
                              const refCol = columns.find((c) => c.id === formulaRefSelecting.columnId);
                              const varKey = refCol ? columnHeaderToVariableKey(refCol.header) : "";
                              setFormulaRefSelecting(null);
                              if (!varKey) return;
                              insertVarKeyAtCursor(varKey);
                              return;
                            }

                            if (isArrow) {
                              e.preventDefault();
                              const dRow = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
                              const dCol = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;

                              skipBlurCommitRef.current = true;
                              void (async () => {
                                await updateCell(row.id, col.id, curValue);
                                if (dCol !== 0) {
                                  const targetCol = columns[colIdx + dCol];
                                  if (!targetCol) return;
                                  focusCellInput(row.id, targetCol.id);
                                  return;
                                }
                                if (dRow !== 0) {
                                  const targetRowIndex = globalRowIndex + dRow;
                                  const targetRow = rows[targetRowIndex];
                                  if (!targetRow) return;
                                  focusCellInput(targetRow.id, col.id);
                                }
                              })();
                              return;
                            }

                            if (isTab) {
                              e.preventDefault();
                              const delta = e.shiftKey ? -1 : 1;
                              const targetCol = columns[colIdx + delta];
                              if (!targetCol) return;
                              skipBlurCommitRef.current = true;
                              void (async () => {
                                await updateCell(row.id, col.id, curValue);
                                focusCellInput(row.id, targetCol.id);
                              })();
                              return;
                            }

                            if (isEnter) {
                              e.preventDefault();
                              skipBlurCommitRef.current = true;
                              void (async () => {
                                await updateCell(row.id, col.id, curValue);
                                if (e.ctrlKey) {
                                  // Commit but stay in same cell.
                                  focusCellInput(row.id, col.id);
                                  return;
                                }

                                const delta = e.shiftKey ? -1 : 1;
                                const targetRowIndex = globalRowIndex + delta;
                                const targetRow = rows[targetRowIndex];
                                if (!targetRow) return;
                                focusCellInput(targetRow.id, col.id);
                              })();
                            }
                            }}
                            onBlur={(e) => {
                            if (skipBlurCommitRef.current) {
                              skipBlurCommitRef.current = false;
                              setFocusedCell(null);
                              setInsertRef(null);
                                setFormulaRefSelecting(null);
                              return;
                            }
                            setFocusedCell(null);
                            setInsertRef(null);
                              setFormulaRefSelecting(null);
                            void updateCell(row.id, col.id, e.target.value);
                            }}
                            className={`h-full min-w-[120px] rounded-none border-0 bg-transparent px-1 py-1 shadow-none focus-visible:ring-0 ${
                              showFormulaTokenColors
                                ? "relative z-20 font-mono text-transparent caret-foreground"
                                : isFormulaCell
                                  ? `font-mono ${formulaTextColorClass}`
                                  : refColorIndex !== undefined
                                    ? "font-medium"
                                    : ""
                            }`}
                          />
                        </div>
                        <div
                          data-fill-handle
                          role="presentation"
                          aria-hidden
                          title="Tarik untuk menyalin sel ke area yang dipilih"
                          className="absolute bottom-0 right-0 z-20 h-3 w-3 cursor-cell select-none hover:bg-primary/15 active:bg-primary/25"
                          onMouseDown={(e) =>
                            startFillDrag(e, globalRowIndex, colIdx, row.id, col.id)
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
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

      {insertRef ? (
        <p className="text-xs text-muted-foreground">
          Rumus: ketik `=` lalu klik sel lain atau header kolom pada baris yang sama untuk menyisipkan nama
          variabel (tanpa harus mengetik). Bisa juga mengetik manual; nama mengikuti header
          (mis. &quot;Panjang mm&quot; → <code className="rounded bg-muted px-1">panjang_mm</code>).
        </p>
      ) : null}
      {activeFormulaRefs ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeFormulaRefs.keys.map((key, i) => (
            <span
              key={key}
              className={`rounded px-2 py-1 font-mono ${
                FORMULA_REF_CELL_CLASSES[i % FORMULA_REF_CELL_CLASSES.length]
              }`}
            >
              {key}
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Kolom `Code`, `Name`, `UOM`, dan `Price` terkunci. Semua sel mendukung rumus dengan awalan `=`. Tarik dari
        pojok kanan bawah sel (cursor +) ke segala arah untuk menyalin nilai/rumus ke persegi yang dipilih (hanya
        baris di halaman ini). Lebih dari {PAGE_SIZE} baris: navigasi halaman.
      </p>

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
            Add Column
          </button>
          <button
            type="button"
            className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
            onClick={() => {
              setCtxMenu((s) => ({ ...s, open: false }));
              void addRow();
            }}
          >
            Add Row
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
              Delete Row
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
              Delete Column
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
              Delete Cell
            </button>
          ) : null}
        </div>
      ) : null}

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import mode</DialogTitle>
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
              Create New File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addColumnDialogOpen} onOpenChange={setAddColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>
              Tambah kolom dinamis di area antara Name dan UOM.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="add-column-name">Column name</Label>
            <Input
              id="add-column-name"
              value={addColumnName}
              onChange={(e) => setAddColumnName(e.target.value)}
              placeholder="contoh: panjang, raw_price, currency"
            />
            <Label htmlFor="add-column-kind">Kategori kolom</Label>
            <Select value={addColumnKind} onValueChange={setAddColumnKind}>
              <SelectTrigger id="add-column-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="currency">Finance/Forex</SelectItem>
                <SelectItem value="uom">UOM</SelectItem>
                <SelectItem value="formula">Formula</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddColumnDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const name = addColumnName.trim();
                if (!name) return;
                await addColumn(name, addColumnKind);
                setAddColumnName("");
                setAddColumnKind("text");
                setAddColumnDialogOpen(false);
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
