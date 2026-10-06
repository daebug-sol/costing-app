"use client";

import { useI18n } from "@/components/i18n-provider";
import { Download, Package, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PaletteBadge } from "@/components/database/palette-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { TableLoadingSkeleton } from "@/components/table-loading-skeleton";
import { formatIDR, formatNumber } from "@/lib/utils/format";
import { useUiWorkflowStore } from "@/store/uiWorkflowStore";
import { DatabaseExplorer } from "./database-explorer";
import { readErr, DatabaseRowDeleteDialog, ALL, AHU_TABLE_SHELL_CLASS, Profile } from "./database-shared";

export function ProfilesPanel({ show }: { show: (t: "success" | "error", m: string) => void }) {
  const { t } = useI18n();
  const ahuFolderId = useUiWorkflowStore((s) => s.database.ahuFolderId);
  const ahuFileId = useUiWorkflowStore((s) => s.database.ahuFileId);
  const setDatabaseAhuNav = useUiWorkflowStore((s) => s.setDatabaseAhuNav);
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [fCode, setFCode] = useState("");
  const [fName, setFName] = useState("");
  const [fType, setFType] = useState("");
  const [fW, setFW] = useState("");
  const [fP, setFP] = useState("");
  const [fPanel, setFPanel] = useState("");
  const [fNotes, setFNotes] = useState("");

  const load = useCallback(async () => {
    if (!ahuFileId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/profiles?fileId=${encodeURIComponent(ahuFileId)}`);
      if (!r.ok) throw new Error(await readErr(r));
      setRows(await r.json());
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  }, [ahuFileId, show]);

  useEffect(() => {
    void load();
  }, [load]);

  const types = useMemo(() => {
    const s = new Set(rows.map((r) => r.type));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== ALL && r.type !== typeFilter) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
      );
    });
  }, [rows, search, typeFilter]);

  const openAdd = () => {
    setEditing(null);
    setFCode("");
    setFName("");
    setFType("");
    setFW("");
    setFP("");
    setFPanel("");
    setFNotes("");
    setDialogOpen(true);
  };

  const openEdit = (p: Profile) => {
    setEditing(p);
    setFCode(p.code);
    setFName(p.name);
    setFType(p.type);
    setFW(String(p.weightPerM));
    setFP(String(p.pricePerM));
    setFPanel(p.panelThick != null ? String(p.panelThick) : "");
    setFNotes(p.notes ?? "");
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!fCode.trim() || !fName.trim() || !fType.trim()) {
      show("error", "Kode, nama, dan tipe wajib diisi");
      return;
    }
    const weightPerM = Number(fW);
    const pricePerM = Number(fP);
    if (!Number.isFinite(weightPerM) || !Number.isFinite(pricePerM)) {
      show("error", "Berat/m dan harga/m harus angka valid");
      return;
    }
    let panelThick: number | null = null;
    if (fPanel.trim()) {
      const pt = Number(fPanel);
      if (!Number.isFinite(pt) || !Number.isInteger(pt)) {
        show("error", "Ketebalan panel harus bilangan bulat atau kosong");
        return;
      }
      panelThick = pt;
    }
    const body = {
      code: fCode.trim(),
      name: fName.trim(),
      type: fType.trim(),
      weightPerM,
      pricePerM,
      panelThick,
      notes: fNotes.trim() || null,
    };
    try {
      if (editing) {
        const r = await fetch(`/api/profiles/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(await readErr(r));
        show("success", "Profil diperbarui");
      } else {
        const r = await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, fileId: ahuFileId }),
        });
        if (!r.ok) throw new Error(await readErr(r));
        show("success", "Profil ditambahkan");
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal menyimpan");
    }
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const p = deleteTarget;
    try {
      const r = await fetch(`/api/profiles/${p.id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error(await readErr(r));
      setDeleteTarget(null);
      show("success", "Profil dihapus");
      await load();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal menghapus");
    }
  };

  const exportXlsx = async () => {
    const header = [
      "code",
      "name",
      "type",
      "weightPerM",
      "pricePerM",
      "panelThick",
      "notes",
    ];
    const data = rows.map((r) => [
      r.code,
      r.name,
      r.type,
      r.weightPerM,
      r.pricePerM,
      r.panelThick != null ? r.panelThick : "",
      r.notes ?? "",
    ]);
    const { exportDatabaseSheet } = await import("@/lib/database-xlsx");
    await exportDatabaseSheet("profiles_export.xlsx", header, data);
    show("success", "Excel diekspor");
  };

  const downloadTemplate = async () => {
    const header = [
      "code",
      "name",
      "type",
      "weightPerM",
      "pricePerM",
      "panelThick",
      "notes",
    ];
    const { exportTemplateSheet } = await import("@/lib/database-xlsx");
    await exportTemplateSheet("profiles_template.xlsx", header);
    show("success", "Template diunduh");
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      show("error", "Gunakan file Excel (.xlsx). File CSV tidak didukung.");
      return;
    }
    const REQUIRED = [
      "code",
      "name",
      "type",
      "weightPerM",
      "pricePerM",
      "panelThick",
    ] as const;
    try {
      const { parseXlsxFirstSheet, validateRequiredColumns } = await import(
        "@/lib/database-xlsx"
      );
      const { headers, rows: parsed } = await parseXlsxFirstSheet(file);
      const missing = validateRequiredColumns(new Set(headers), REQUIRED);
      if (missing.length) {
        show(
          "error",
          `Format file tidak sesuai. Pastikan kolom yang dibutuhkan ada: ${missing.join(", ")}`
        );
        return;
      }
      const codeToId = new Map(rows.map((m) => [m.code.toLowerCase(), m.id]));
      let ok = 0;
      for (const rec of parsed) {
        const code = (rec["code"] ?? "").trim();
        const name = (rec["name"] ?? "").trim();
        const type = (rec["type"] ?? "").trim();
        const weightPerM = Number(rec["weightPerM"]);
        const pricePerM = Number(rec["pricePerM"]);
        const ptRaw = (rec["panelThick"] ?? "").trim();
        const notes = (rec["notes"] ?? "").trim() || null;
        if (!code || !name || !type) continue;
        if (!Number.isFinite(weightPerM) || !Number.isFinite(pricePerM)) continue;
        let panelThick: number | null = null;
        if (ptRaw) {
          const pt = Number(ptRaw);
          if (Number.isFinite(pt) && Number.isInteger(pt)) panelThick = pt;
        }
        const body = {
          code,
          name,
          type,
          weightPerM,
          pricePerM,
          panelThick,
          notes,
        };
        const existingId = codeToId.get(code.toLowerCase());
        try {
          const r = await fetch(
            existingId ? `/api/profiles/${existingId}` : "/api/profiles",
            {
              method: existingId ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...body, fileId: ahuFileId }),
            }
          );
          if (r.ok) {
            ok++;
            if (!existingId) {
              const created = (await r.json()) as { id: string; code: string };
              codeToId.set(created.code.toLowerCase(), created.id);
            }
          }
        } catch {
          /* ignore */
        }
      }
      await load();
      if (ok === 0) show("error", "Tidak ada baris yang valid untuk diimpor");
      else show("success", `Berhasil import ${ok} data`);
    } catch (err) {
      show("error", err instanceof Error ? err.message : "Import gagal");
    }
  };

  if (!ahuFileId) {
    return (
      <DatabaseExplorer
        scope="ahu"
        ahuKind="profiles"
        activeFolderId={ahuFolderId}
        activeFileId={ahuFileId}
        onFolderSelect={(id) => setDatabaseAhuNav({ ahuFolderId: id || null, ahuFileId: null })}
        onFileOpen={(id) => setDatabaseAhuNav({ ahuFileId: id })}
        show={show}
        emptyFileTitle="Belum ada file profil"
        emptyFileDescription="Buat file dataset profil di folder ini."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDatabaseAhuNav({ ahuFileId: null })}
          >
            Kembali ke file
          </Button>
          <Input
            placeholder="Cari kode, nama, tipe…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-card"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full bg-card sm:w-[200px]">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={openAdd}>
            <Plus className="size-4" />
            Add New
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onImportFile}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            Import Excel
          </Button>
          <Button type="button" variant="outline" onClick={() => void downloadTemplate()}>
            <Download className="size-4" />
            Download Template
          </Button>
          <Button type="button" variant="outline" onClick={() => void exportXlsx()}>
            <Download className="size-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className={AHU_TABLE_SHELL_CLASS}>
        {loading ? (
          <div className="p-4">
            <TableLoadingSkeleton columns={7} rows={8} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Belum ada data profil"
            description="Tambahkan profil panel atau impor Excel (.xlsx)."
            actionLabel={t("common.addNew")}
            onAction={openAdd}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Tidak ada hasil"
            description="Sesuaikan pencarian atau tipe."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.code")}</TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.type")}</TableHead>
                <TableHead className="text-right">{t("database.weightPerM")}</TableHead>
                <TableHead className="text-right">{t("database.pricePerM")}</TableHead>
                <TableHead className="text-center">{t("database.panelThick")}</TableHead>
                <TableHead className="w-[100px] text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell className="font-mono text-xs">{p.code}</TableCell>
                  <TableCell className="max-w-[200px] whitespace-normal">
                    {p.name}
                  </TableCell>
                  <TableCell>
                    <PaletteBadge label={p.type} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(p.weightPerM, 3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatIDR(p.pricePerM)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {p.panelThick ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(p)}
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(p)}
                        aria-label={`Hapus ${p.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <DatabaseRowDeleteDialog
        open={deleteTarget != null}
        entityLabel="profil"
        code={deleteTarget?.code ?? ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmRemove}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit profil" : "Profil baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="p-code">Kode</Label>
              <Input
                id="p-code"
                value={fCode}
                onChange={(e) => setFCode(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-name">Nama</Label>
              <Input
                id="p-name"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-type">Tipe</Label>
              <Input
                id="p-type"
                value={fType}
                onChange={(e) => setFType(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="p-w">Berat / m (kg)</Label>
                <Input
                  id="p-w"
                  inputMode="decimal"
                  value={fW}
                  onChange={(e) => setFW(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-price">Harga / m</Label>
                <Input
                  id="p-price"
                  inputMode="decimal"
                  value={fP}
                  onChange={(e) => setFP(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-panel">Ketebalan panel (mm, opsional)</Label>
              <Input
                id="p-panel"
                inputMode="numeric"
                value={fPanel}
                onChange={(e) => setFPanel(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-notes">Catatan</Label>
              <Input
                id="p-notes"
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button type="button" onClick={submit}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
