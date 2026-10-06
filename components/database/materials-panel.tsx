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
import { FIXED_UOMS } from "@/lib/custom-db";
import { formatIDR, formatNumber } from "@/lib/utils/format";
import { useUiWorkflowStore } from "@/store/uiWorkflowStore";
import { DatabaseExplorer } from "./database-explorer";
import { readErr, DatabaseRowDeleteDialog, ALL, AHU_TABLE_SHELL_CLASS, Material } from "./database-shared";

export function MaterialsPanel({ show }: { show: (t: "success" | "error", m: string) => void }) {
  const { t } = useI18n();
  const ahuFolderId = useUiWorkflowStore((s) => s.database.ahuFolderId);
  const ahuFileId = useUiWorkflowStore((s) => s.database.ahuFileId);
  const setDatabaseAhuNav = useUiWorkflowStore((s) => s.setDatabaseAhuNav);
  const [rows, setRows] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [fCode, setFCode] = useState("");
  const [fName, setFName] = useState("");
  const [fCat, setFCat] = useState("");
  const [fDensity, setFDensity] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [fCur, setFCur] = useState("IDR");
  const [fUnit, setFUnit] = useState("kg");
  const [fNotes, setFNotes] = useState("");

  const load = useCallback(async () => {
    if (!ahuFileId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/materials?fileId=${encodeURIComponent(ahuFileId)}`);
      if (!r.ok) throw new Error(await readErr(r));
      setRows(await r.json());
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal memuat material");
    } finally {
      setLoading(false);
    }
  }, [ahuFileId, show]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const s = new Set(rows.map((r) => r.category));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (cat !== ALL && r.category !== cat) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.notes?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, cat]);

  const openAdd = () => {
    setEditing(null);
    setFCode("");
    setFName("");
    setFCat("");
    setFDensity("");
    setFPrice("");
    setFCur("IDR");
    setFUnit("kg");
    setFNotes("");
    setDialogOpen(true);
  };

  const openEdit = (m: Material) => {
    setEditing(m);
    setFCode(m.code);
    setFName(m.name);
    setFCat(m.category);
    setFDensity(String(m.density));
    setFPrice(String(m.pricePerKg));
    setFCur(m.currency);
    setFUnit(m.unit);
    setFNotes(m.notes ?? "");
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!fCode.trim() || !fName.trim() || !fCat.trim()) {
      show("error", "Kode, nama, dan kategori wajib diisi");
      return;
    }
    const density = Number(fDensity);
    const pricePerKg = Number(fPrice);
    if (!Number.isFinite(density) || !Number.isFinite(pricePerKg)) {
      show("error", "Density dan harga/kg harus angka valid");
      return;
    }
    const body = {
      code: fCode.trim(),
      name: fName.trim(),
      category: fCat.trim(),
      density,
      pricePerKg,
      currency: fCur.trim() || "IDR",
      unit: fUnit.trim() || "kg",
      notes: fNotes.trim() || null,
    };
    try {
      if (editing) {
        const r = await fetch(`/api/materials/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(await readErr(r));
        show("success", "Material diperbarui");
      } else {
        const r = await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, fileId: ahuFileId }),
        });
        if (!r.ok) throw new Error(await readErr(r));
        show("success", "Material ditambahkan");
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal menyimpan");
    }
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const m = deleteTarget;
    try {
      const r = await fetch(`/api/materials/${m.id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error(await readErr(r));
      setDeleteTarget(null);
      show("success", "Material dihapus");
      await load();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal menghapus");
    }
  };

  const exportXlsx = async () => {
    const header = [
      "code",
      "name",
      "category",
      "density",
      "pricePerKg",
      "currency",
      "unit",
      "notes",
    ];
    const data = rows.map((r) => [
      r.code,
      r.name,
      r.category,
      r.density,
      r.pricePerKg,
      r.currency,
      r.unit,
      r.notes ?? "",
    ]);
    const { exportDatabaseSheet } = await import("@/lib/database-xlsx");
    await exportDatabaseSheet("materials_export.xlsx", header, data);
    show("success", "Excel diekspor");
  };

  const downloadTemplate = async () => {
    const header = [
      "code",
      "name",
      "category",
      "density",
      "pricePerKg",
      "currency",
      "unit",
      "notes",
    ];
    const { exportTemplateSheet } = await import("@/lib/database-xlsx");
    await exportTemplateSheet("materials_template.xlsx", header);
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
      "category",
      "density",
      "pricePerKg",
      "currency",
      "unit",
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
        const category = (rec["category"] ?? "").trim();
        const density = Number(rec["density"]);
        const pricePerKg = Number(rec["pricePerKg"]);
        const currency = (rec["currency"] ?? "IDR").trim() || "IDR";
        const unit = (rec["unit"] ?? "kg").trim() || "kg";
        const notes = (rec["notes"] ?? "").trim() || null;
        if (!code || !name || !category) continue;
        if (!Number.isFinite(density) || !Number.isFinite(pricePerKg)) continue;
        const body = {
          code,
          name,
          category,
          density,
          pricePerKg,
          currency,
          unit,
          notes,
        };
        const existingId = codeToId.get(code.toLowerCase());
        try {
          const r = await fetch(
            existingId ? `/api/materials/${existingId}` : "/api/materials",
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
        ahuKind="materials"
        activeFolderId={ahuFolderId}
        activeFileId={ahuFileId}
        onFolderSelect={(id) => setDatabaseAhuNav({ ahuFolderId: id || null, ahuFileId: null })}
        onFileOpen={(id) => setDatabaseAhuNav({ ahuFileId: id })}
        show={show}
        emptyFileTitle="Belum ada file material"
        emptyFileDescription="Buat file dataset material di folder ini."
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
            placeholder="Cari kode, nama, kategori…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-card"
          />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-full bg-card sm:w-[200px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={openAdd}>
            <Plus className="size-4" />
            Tambah
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
            title="Belum ada material"
            description="Tambahkan material atau impor dari Excel (.xlsx)."
            actionLabel={t("common.addNew")}
            onAction={openAdd}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Tidak ada hasil"
            description="Sesuaikan pencarian atau kategori."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.code")}</TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.category")}</TableHead>
                <TableHead className="text-right">{t("database.density")}</TableHead>
                <TableHead className="text-right">{t("database.pricePerKg")}</TableHead>
                <TableHead>{t("common.unit")}</TableHead>
                <TableHead className="w-[100px] text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} className="group">
                  <TableCell className="font-mono text-xs">{m.code}</TableCell>
                  <TableCell className="max-w-[200px] whitespace-normal">
                    {m.name}
                  </TableCell>
                  <TableCell>
                    <PaletteBadge label={m.category} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(m.density, 3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatIDR(m.pricePerKg)}
                  </TableCell>
                  <TableCell>{m.unit}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        aria-label={`Edit ${m.name}`}
                        onClick={() => openEdit(m)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive"
                        aria-label={`Hapus ${m.name}`}
                        onClick={() => setDeleteTarget(m)}
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
        entityLabel="material"
        code={deleteTarget?.code ?? ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmRemove}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit material" : "Material baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="m-code">Kode</Label>
              <Input
                id="m-code"
                value={fCode}
                onChange={(e) => setFCode(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="m-name">Nama</Label>
              <Input
                id="m-name"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="m-cat">Kategori</Label>
              <Input
                id="m-cat"
                value={fCat}
                onChange={(e) => setFCat(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="m-den">{t("database.density")}</Label>
                <Input
                  id="m-den"
                  inputMode="decimal"
                  value={fDensity}
                  onChange={(e) => setFDensity(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="m-price">Harga / kg (IDR)</Label>
                <Input
                  id="m-price"
                  inputMode="decimal"
                  value={fPrice}
                  onChange={(e) => setFPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="m-cur">Mata uang</Label>
                <Input
                  id="m-cur"
                  value={fCur}
                  onChange={(e) => setFCur(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="m-unit">Satuan</Label>
                <Select value={fUnit} onValueChange={setFUnit}>
                  <SelectTrigger id="m-unit" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIXED_UOMS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                    {fUnit && !(FIXED_UOMS as readonly string[]).includes(fUnit) ? (
                      <SelectItem value={fUnit}>{fUnit}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="m-notes">Catatan</Label>
              <Input
                id="m-notes"
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
