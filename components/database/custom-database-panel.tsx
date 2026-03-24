"use client";

import { FileSpreadsheet, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { FIXED_UOMS, hasColumnKey } from "@/lib/custom-db";
import { exportDatabaseSheet, parseXlsxFirstSheet } from "@/lib/database-xlsx";
import { formatIDR } from "@/lib/utils/format";

type CustomCol = {
  id: string;
  header: string;
  sortOrder: number;
  locked: boolean;
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

  const openFile = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/custom-db/${id}`, { cache: "no-store" });
      if (!r.ok) throw new Error("Gagal membuka file");
      const data = (await r.json()) as CustomTable;
      data.columns.sort((a, b) => a.sortOrder - b.sortOrder);
      data.rows.sort((a, b) => a.sortOrder - b.sortOrder);
      setTable(data);
      setActiveFileId(id);
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal membuka file");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const rows = table?.rows ?? [];
  const columns = table?.columns ?? [];
  const getCell = (row: CustomRow, colId: string) =>
    row.cells.find((c) => c.columnId === colId);

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
    if (activeFileId) await openFile(activeFileId);
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
    if (activeFileId) await openFile(activeFileId);
  };

  const renameColumn = async (col: CustomCol) => {
    if (isLocked(col.id)) return;
    const next = window.prompt("Rename kolom", col.header);
    if (!next?.trim()) return;
    const r = await fetch(`/api/custom-db/columns/${col.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ header: next }),
    });
    if (!r.ok) {
      show("error", "Gagal rename kolom");
      return;
    }
    if (activeFileId) await openFile(activeFileId);
  };

  const deleteColumn = async (colId: string) => {
    if (isLocked(colId)) return;
    const r = await fetch(`/api/custom-db/columns/${colId}`, { method: "DELETE" });
    if (!r.ok) {
      show("error", "Gagal hapus kolom");
      return;
    }
    if (activeFileId) await openFile(activeFileId);
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
    if (activeFileId) await openFile(activeFileId);
  };

  const deleteRow = async (rowId: string) => {
    const r = await fetch(`/api/custom-db/rows/${rowId}`, { method: "DELETE" });
    if (!r.ok) {
      show("error", "Gagal hapus row");
      return;
    }
    if (activeFileId) await openFile(activeFileId);
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

  const fillDown = async (sourceRowId: string, columnId: string) => {
    if (!table) return;
    const idx = table.rows.findIndex((r) => r.id === sourceRowId);
    if (idx < 0 || idx === table.rows.length - 1) return;
    const targetRowIds = table.rows.slice(idx + 1).map((r) => r.id);
    const r = await fetch("/api/custom-db/fill", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceRowId, columnId, targetRowIds }),
    });
    if (!r.ok) {
      show("error", "Gagal fill down");
      return;
    }
    await Promise.all(targetRowIds.map((id) => updateCell(id, columnId, getCell(table.rows[idx]!, columnId)?.rawValue ?? "")));
    if (activeFileId) await openFile(activeFileId);
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
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => { setActiveFileId(null); setTable(null); }}>
          Back to Files
        </Button>
        <Button type="button" onClick={() => setAddColumnDialogOpen(true)}>
          <Plus className="size-4" />
          Add Column
        </Button>
        <Button type="button" variant="outline" onClick={addRow}>
          <Plus className="size-4" />
          Add Row
        </Button>
        <Button type="button" variant="outline" onClick={() => importRef.current?.click()}>
          Import Excel
        </Button>
        <Button type="button" variant="outline" onClick={() => void exportActiveFile()}>
          Export Excel
        </Button>
        <span className="text-sm text-muted-foreground">Editing: {table.name}</span>
        <span className="text-xs text-muted-foreground">
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
              ? "Saved"
              : saveStatus === "failed"
                ? "Save failed"
                : ""}
        </span>
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
                  className={`border-b border-r bg-muted px-3 py-2 text-left font-medium ${
                    idx <= 1 ? "sticky left-0 z-20" : ""
                  } ${hasColumnKey(col.id, "col_uom") ? "sticky right-[120px] z-20" : ""} ${
                    hasColumnKey(col.id, "col_price") ? "sticky right-0 z-20" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onDoubleClick={() => void renameColumn(col)}
                      onClick={() => {
                        if (!insertRef || !table) return;
                        const refToken = col.header
                          .trim()
                          .toLowerCase()
                          .replace(/[^a-z0-9_]+/g, "_");
                        setTable((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            rows: prev.rows.map((r) =>
                              r.id !== insertRef.rowId
                                ? r
                                : {
                                    ...r,
                                    cells: r.cells.some((c) => hasColumnKey(c.columnId, "col_formula"))
                                      ? r.cells.map((c) =>
                                          hasColumnKey(c.columnId, "col_formula")
                                            ? { ...c, rawValue: `${c.rawValue ?? "="}${refToken}` }
                                            : c
                                        )
                                      : [
                                          ...r.cells,
                                          {
                                            rowId: r.id,
                                            columnId:
                                              table.columns.find((x) => hasColumnKey(x.id, "col_formula"))?.id ??
                                              "col_formula",
                                            rawValue: `=${refToken}`,
                                            computedValue: null,
                                          },
                                        ],
                                  }
                            ),
                          };
                        });
                      }}
                      disabled={isLocked(col.id)}
                    >
                      {col.header}
                    </button>
                    {!isLocked(col.id) ? (
                      <button type="button" onClick={() => void deleteColumn(col.id)}>
                        <Trash2 className="size-3 text-destructive" />
                      </button>
                    ) : null}
                  </div>
                </th>
              ))}
              <th className="border-b bg-muted px-2 py-2">#</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((col, idx) => {
                  const cell = getCell(row, col.id);
                  const display =
                    hasColumnKey(col.id, "col_price") && cell?.computedValue != null
                      ? formatIDR(cell.computedValue)
                      : (cell?.rawValue ?? "");
                  return (
                    <td
                      key={col.id}
                      className={`border-b border-r bg-background px-2 py-1 ${
                        idx <= 1 ? "sticky left-0 z-10" : ""
                      } ${hasColumnKey(col.id, "col_uom") ? "sticky right-[120px] z-10" : ""} ${
                        hasColumnKey(col.id, "col_price") ? "sticky right-0 z-10" : ""
                      }`}
                    >
                      {hasColumnKey(col.id, "col_uom") ? (
                        <Select
                          value={display || "unit"}
                          onValueChange={(v) => void updateCell(row.id, col.id, v)}
                        >
                          <SelectTrigger className="h-8 min-w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIXED_UOMS.map((u) => (
                              <SelectItem key={u} value={u}>
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Input
                            value={display}
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
                            onFocus={() => setInsertRef({ rowId: row.id })}
                            onBlur={(e) => void updateCell(row.id, col.id, e.target.value)}
                            className="h-8 min-w-[120px] bg-background"
                          />
                          {!hasColumnKey(col.id, "col_price") ? (
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => void fillDown(row.id, col.id)}
                              title="Fill down"
                            >
                              ▣
                            </button>
                          ) : null}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="border-b px-2 py-1">
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => void deleteRow(row.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {insertRef ? (
        <p className="text-xs text-muted-foreground">
          Formula helper aktif pada row yang sama. Ketik `=` lalu klik nama kolom di header untuk menyisipkan referensi.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Kolom `Code`, `Name`, `UOM`, dan `Price` terkunci dan tidak bisa dihapus/rename.
      </p>

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
