"use client";

import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasColumnKey } from "@/lib/custom-db";
import { MANDATORY_DB_HEADER, matchMandatoryExcelHeaders } from "@/lib/excel-column-match";
import { useUiWorkflowStore } from "@/store/uiWorkflowStore";
import { SchemaCol, ContextMenuState, CustomRow, CustomTable, UpdateCellResponse, PAGE_SIZE, FORMULA_REF_TONES, extractFormulaVarKeys, isLocked, readErr, encodeDropdownKind } from "./custom-database-shared";

export function useCustomDatabase({
  show,
}: {
  show: (t: "success" | "error", m: string) => void;
}) {
  const [table, setTable] = useState<CustomTable | null>(null);
  const customFolderId = useUiWorkflowStore((s) => s.database.customFolderId);
  const customFileId = useUiWorkflowStore((s) => s.database.customFileId);
  const setDatabaseCustomNav = useUiWorkflowStore((s) => s.setDatabaseCustomNav);
  const activeFileId = customFileId;
  const [loading, setLoading] = useState(false);
  const [newColumns, setNewColumns] = useState<SchemaCol[]>([]);
  const [insertRef, setInsertRef] = useState<{ rowId: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);
  const [addColumnName, setAddColumnName] = useState("");
  const [addColumnKind, setAddColumnKind] = useState("text");
  const [addColumnDropdownOptions, setAddColumnDropdownOptions] = useState("");
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

  const openFile = useCallback(async (id: string, resetPage = true) => {
    if (!id) {
      setDatabaseCustomNav({ customFileId: null });
      setTable(null);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/custom-db/${id}`, { cache: "no-store" });
      if (!r.ok) throw new Error("Gagal membuka file");
      const data = (await r.json()) as CustomTable;
      data.columns.sort((a, b) => a.sortOrder - b.sortOrder);
      data.rows.sort((a, b) => a.sortOrder - b.sortOrder);
      setTable(data);
      setDatabaseCustomNav({ customFileId: id });
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
  }, [setDatabaseCustomNav, show]);

  useEffect(() => {
    if (customFileId) void openFile(customFileId, false);
  }, [customFileId, openFile]);

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

  const rows = useMemo(() => table?.rows ?? [], [table]);
  const columns = useMemo(() => table?.columns ?? [], [table]);

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
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
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
    if (el) {
      // Force horizontal sync for keyboard selection (especially back to Code on ArrowLeft).
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
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
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
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
    keys.forEach((k, i) => colorByKey.set(k, i % FORMULA_REF_TONES.length));
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
    const payload = (await r.json()) as UpdateCellResponse;
    setTable((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((row) =>
          row.id === payload.rowId ? { ...row, cells: payload.cells } : row
        ),
      };
    });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus((prev) => (prev === "saved" ? "idle" : prev)), 1200);
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

  const createCustomFile = async (name: string): Promise<boolean> => {
    if (!customFolderId) {
      show("error", "Pilih folder terlebih dahulu");
      return false;
    }
    const r = await fetch("/api/database/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "custom",
        folderId: customFolderId,
        name,
        columns: newColumns.map(({ header, kind, dropdownOptions }) => ({
          header,
          kind: kind === "dropdown" ? encodeDropdownKind(dropdownOptions ?? "") : kind,
        })),
      }),
    });
    if (!r.ok) {
      show("error", await readErr(r));
      return false;
    }
    const created = (await r.json()) as CustomTable;
    setNewColumns([]);
    await openFile(created.id);
    return true;
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
    const { exportDatabaseSheet } = await import("@/lib/database-xlsx");
    await exportDatabaseSheet(`${table.name}.xlsx`, header, data);
    show("success", "Export Excel berhasil");
  };

  const downloadTemplate = async () => {
    if (!table) return;
    const header = table.columns.map((c) => c.header);
    const { exportTemplateSheet } = await import("@/lib/database-xlsx");
    await exportTemplateSheet(`${table.name}_template.xlsx`, header);
    show("success", "Template diunduh");
  };

  const importIntoTable = async (file: File, mode: "new" | "append") => {
    setSaveStatus("saving");
    const { parseXlsxFirstSheet } = await import("@/lib/database-xlsx");
    const parsed = await parseXlsxFirstSheet(file);
    const headers = parsed.headers.map((h) => h.trim()).filter(Boolean);
    if (headers.length === 0) {
      show("error", "Header Excel kosong");
      setSaveStatus("failed");
      return;
    }
    const mandatory = matchMandatoryExcelHeaders(headers);
    if (!mandatory.ok) {
      const labels = mandatory.missing.map((k) => MANDATORY_DB_HEADER[k]);
      show(
        "error",
        `Kolom wajib tidak terdeteksi (mirip Code, Name, UOM, Price): ${labels.join(", ")}`
      );
      setSaveStatus("failed");
      return;
    }
    const { excelToDbHeader } = mandatory;
    const matchedExcelTitles = new Set(excelToDbHeader.keys());
    const remappedHeaders = headers.map((h) => excelToDbHeader.get(h) ?? h);
    const remappedRows = parsed.rows.map((row) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        const dbKey = excelToDbHeader.get(k) ?? k;
        out[dbKey] = v;
      }
      return out;
    });

    let target: CustomTable | null = table;
    if (mode === "new") {
      const dynamicHeaders = headers.filter((h) => !matchedExcelTitles.has(h));
      const createRes = await fetch("/api/database/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "custom",
          folderId: customFolderId,
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
    const importRes = await fetch("/api/custom-db/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId: target.id,
        headers: remappedHeaders,
        rows: remappedRows,
      }),
    });
    if (!importRes.ok) {
      show("error", await readErr(importRes));
      setSaveStatus("failed");
      return;
    }
    await openFile(target.id);
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

  const customColumnSchema = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Skema kolom dinamis (opsional)</Label>
        <Button
          type="button"
          variant="outline"
          onClick={() => setNewColumns((prev) => [...prev, { header: "", kind: "text" }])}
        >
          <Plus className="size-4" />
          Tambah kolom skema
        </Button>
      </div>
      <div className="space-y-2">
        {newColumns.map((col, idx) => (
          <div key={`${idx}-${col.header}`} className="space-y-2 rounded-md border border-border p-2">
            <div className="flex gap-2">
              <Input
                value={col.header}
                onChange={(e) =>
                  setNewColumns((prev) =>
                    prev.map((c, i) => (i === idx ? { ...c, header: e.target.value } : c))
                  )
                }
                placeholder="Nama kolom"
              />
              <Select
                value={col.kind === "dropdown" || col.kind.startsWith("dropdown:") ? "dropdown" : col.kind}
                onValueChange={(v) =>
                  setNewColumns((prev) =>
                    prev.map((c, i) =>
                      i === idx
                        ? {
                            ...c,
                            kind: v,
                            dropdownOptions: v === "dropdown" ? c.dropdownOptions ?? "" : undefined,
                          }
                        : c
                    )
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
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                  <SelectItem value="formula">Formula</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(col.kind === "dropdown" || col.kind.startsWith("dropdown:")) ? (
              <div className="grid gap-1.5">
                <Label>Opsi (satu per baris)</Label>
                <Textarea
                  className="border-input bg-background focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-2.5 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
                  value={col.dropdownOptions ?? ""}
                  onChange={(e) =>
                    setNewColumns((prev) =>
                      prev.map((c, i) =>
                        i === idx ? { ...c, dropdownOptions: e.target.value } : c
                      )
                    )
                  }
                  placeholder={"Vendor A\nVendor B\nVendor C"}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );

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


  return {
    show,
    table,
    setTable,
    customFolderId,
    customFileId,
    setDatabaseCustomNav,
    activeFileId,
    loading,
    setLoading,
    newColumns,
    setNewColumns,
    insertRef,
    setInsertRef,
    importRef,
    importDialogOpen,
    setImportDialogOpen,
    pendingImportFile,
    setPendingImportFile,
    saveStatus,
    setSaveStatus,
    addColumnDialogOpen,
    setAddColumnDialogOpen,
    addColumnName,
    setAddColumnName,
    addColumnKind,
    setAddColumnKind,
    addColumnDropdownOptions,
    setAddColumnDropdownOptions,
    ctxMenu,
    setCtxMenu,
    selectedCell,
    setSelectedCell,
    gridPage,
    setGridPage,
    fillPreview,
    setFillPreview,
    focusedCell,
    setFocusedCell,
    formulaRefSelecting,
    setFormulaRefSelecting,
    formulaInputRef,
    openFile,
    pendingFocusRef,
    skipBlurCommitRef,
    rows,
    columns,
    focusCellInput,
    tryFocusPending,
    activeFormulaRefs,
    visibleRows,
    getCell,
    insertVarKeyAtCursor,
    updateCell,
    addColumn,
    renameColumn,
    deleteColumn,
    addRow,
    deleteRow,
    clearCell,
    applyRectFill,
    startFillDrag,
    createCustomFile,
    exportActiveFile,
    downloadTemplate,
    importIntoTable,
    onImportFile,
    customColumnSchema,
    openContextMenu,
  };
}

export type CustomDatabase = ReturnType<typeof useCustomDatabase>;

/** Panel state once a file is open (table and activeFileId narrowed non-null). */
export type PanelCtx = Omit<CustomDatabase, "table" | "activeFileId"> & {
  table: NonNullable<CustomDatabase["table"]>;
  activeFileId: string;
};
