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
import { formatIDR } from "@/lib/utils/format";
import { useUiWorkflowStore } from "@/store/uiWorkflowStore";
import { DatabaseExplorer } from "./database-explorer";
import { readErr, DatabaseRowDeleteDialog, ALL, AHU_TABLE_SHELL_CLASS, ComponentRow } from "./database-shared";

export function ComponentsPanel({
  show,
}: {
  show: (t: "success" | "error", m: string) => void;
}) {
  const { t } = useI18n();
  const ahuFolderId = useUiWorkflowStore((s) => s.database.ahuFolderId);
  const ahuFileId = useUiWorkflowStore((s) => s.database.ahuFileId);
  const setDatabaseAhuNav = useUiWorkflowStore((s) => s.setDatabaseAhuNav);
  const [rows, setRows] = useState<ComponentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ComponentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ComponentRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [fCode, setFCode] = useState("");
  const [fName, setFName] = useState("");
  const [fCat, setFCat] = useState("");
  const [fSub, setFSub] = useState("");
  const [fBrand, setFBrand] = useState("");
  const [fModel, setFModel] = useState("");
  const [fSpec, setFSpec] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [fCur, setFCur] = useState("IDR");
  const [fUnit, setFUnit] = useState("pcs");
  const [fMoq, setFMoq] = useState("");
  const [fLead, setFLead] = useState("");
  const [fSup, setFSup] = useState("");
  const [fNotes, setFNotes] = useState("");

  const load = useCallback(async () => {
    if (!ahuFileId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/components?fileId=${encodeURIComponent(ahuFileId)}`);
      if (!r.ok) throw new Error(await readErr(r));
      setRows(await r.json());
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal memuat komponen");
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
        (r.brand?.toLowerCase().includes(q) ?? false) ||
        (r.spec?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, cat]);

  const openAdd = () => {
    setEditing(null);
    setFCode("");
    setFName("");
    setFCat("");
    setFSub("");
    setFBrand("");
    setFModel("");
    setFSpec("");
    setFPrice("");
    setFCur("IDR");
    setFUnit("pcs");
    setFMoq("");
    setFLead("");
    setFSup("");
    setFNotes("");
    setDialogOpen(true);
  };

  const openEdit = (c: ComponentRow) => {
    setEditing(c);
    setFCode(c.code);
    setFName(c.name);
    setFCat(c.category);
    setFSub(c.subcategory ?? "");
    setFBrand(c.brand ?? "");
    setFModel(c.model ?? "");
    setFSpec(c.spec ?? "");
    setFPrice(String(c.unitPrice));
    setFCur(c.currency);
    setFUnit(c.unit);
    setFMoq(c.moq != null ? String(c.moq) : "");
    setFLead(c.leadTimeDays != null ? String(c.leadTimeDays) : "");
    setFSup(c.supplier ?? "");
    setFNotes(c.notes ?? "");
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!fCode.trim() || !fName.trim() || !fCat.trim()) {
      show("error", "Kode, nama, dan kategori wajib diisi");
      return;
    }
    const unitPrice = Number(fPrice);
    if (!Number.isFinite(unitPrice)) {
      show("error", "Harga satuan harus angka valid");
      return;
    }
    const body = {
      code: fCode.trim(),
      name: fName.trim(),
      category: fCat.trim(),
      subcategory: fSub.trim() || null,
      brand: fBrand.trim() || null,
      model: fModel.trim() || null,
      spec: fSpec.trim() || null,
      unitPrice,
      currency: fCur.trim() || "IDR",
      unit: fUnit.trim() || "pcs",
      moq: fMoq.trim() ? Number(fMoq) : null,
      leadTimeDays: fLead.trim() ? Number(fLead) : null,
      supplier: fSup.trim() || null,
      notes: fNotes.trim() || null,
    };
    if (body.moq != null && (!Number.isInteger(body.moq) || !Number.isFinite(body.moq))) {
      show("error", "MOQ harus bilangan bulat");
      return;
    }
    if (
      body.leadTimeDays != null &&
      (!Number.isInteger(body.leadTimeDays) || !Number.isFinite(body.leadTimeDays))
    ) {
      show("error", "Lead time harus bilangan bulat hari");
      return;
    }
    try {
      if (editing) {
        const r = await fetch(`/api/components/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(await readErr(r));
        show("success", "Komponen diperbarui");
      } else {
        const r = await fetch("/api/components", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, fileId: ahuFileId }),
        });
        if (!r.ok) throw new Error(await readErr(r));
        show("success", "Komponen ditambahkan");
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal menyimpan");
    }
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const c = deleteTarget;
    try {
      const r = await fetch(`/api/components/${c.id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error(await readErr(r));
      setDeleteTarget(null);
      show("success", "Komponen dihapus");
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
      "subcategory",
      "brand",
      "model",
      "spec",
      "unitPrice",
      "currency",
      "unit",
      "moq",
      "leadTimeDays",
      "supplier",
      "notes",
    ];
    const data = rows.map((r) => [
      r.code,
      r.name,
      r.category,
      r.subcategory ?? "",
      r.brand ?? "",
      r.model ?? "",
      r.spec ?? "",
      r.unitPrice,
      r.currency,
      r.unit,
      r.moq != null ? r.moq : "",
      r.leadTimeDays != null ? r.leadTimeDays : "",
      r.supplier ?? "",
      r.notes ?? "",
    ]);
    const { exportDatabaseSheet } = await import("@/lib/database-xlsx");
    await exportDatabaseSheet("components_export.xlsx", header, data);
    show("success", "Excel diekspor");
  };

  const downloadTemplate = async () => {
    const header = [
      "code",
      "name",
      "category",
      "subcategory",
      "brand",
      "model",
      "spec",
      "unitPrice",
      "currency",
      "unit",
      "moq",
      "leadTimeDays",
      "supplier",
      "notes",
    ];
    const { exportTemplateSheet } = await import("@/lib/database-xlsx");
    await exportTemplateSheet("components_template.xlsx", header);
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
      "unitPrice",
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
        const unitPrice = Number(rec["unitPrice"]);
        const currency = (rec["currency"] ?? "IDR").trim() || "IDR";
        const unit = (rec["unit"] ?? "pcs").trim() || "pcs";
        const subcategory = (rec["subcategory"] ?? "").trim() || null;
        const brand = (rec["brand"] ?? "").trim() || null;
        const model = (rec["model"] ?? "").trim() || null;
        const spec = (rec["spec"] ?? "").trim() || null;
        const moqRaw = (rec["moq"] ?? "").trim();
        const leadRaw = (rec["leadTimeDays"] ?? "").trim();
        const supplier = (rec["supplier"] ?? "").trim() || null;
        const notes = (rec["notes"] ?? "").trim() || null;
        if (!code || !name || !category) continue;
        if (!Number.isFinite(unitPrice)) continue;
        const moq = moqRaw ? Number(moqRaw) : null;
        const leadTimeDays = leadRaw ? Number(leadRaw) : null;
        const body = {
          code,
          name,
          category,
          subcategory,
          brand,
          model,
          spec,
          unitPrice,
          currency,
          unit,
          moq:
            moq != null && Number.isInteger(moq) && Number.isFinite(moq)
              ? moq
              : null,
          leadTimeDays:
            leadTimeDays != null &&
            Number.isInteger(leadTimeDays) &&
            Number.isFinite(leadTimeDays)
              ? leadTimeDays
              : null,
          supplier,
          notes,
        };
        const existingId = codeToId.get(code.toLowerCase());
        try {
          const r = await fetch(
            existingId ? `/api/components/${existingId}` : "/api/components",
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
        ahuKind="components"
        activeFolderId={ahuFolderId}
        activeFileId={ahuFileId}
        onFolderSelect={(id) => setDatabaseAhuNav({ ahuFolderId: id || null, ahuFileId: null })}
        onFileOpen={(id) => setDatabaseAhuNav({ ahuFileId: id })}
        show={show}
        emptyFileTitle="Belum ada file komponen"
        emptyFileDescription="Buat file dataset komponen di folder ini."
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
            placeholder="Cari kode, nama, merek, spesifikasi…"
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
            <TableLoadingSkeleton columns={8} rows={8} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Belum ada komponen"
            description="Tambahkan katalog komponen atau impor Excel (.xlsx)."
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
                <TableHead>{t("database.brand")}</TableHead>
                <TableHead className="max-w-[180px]">{t("database.spec")}</TableHead>
                <TableHead className="text-right">{t("database.unitPrice")}</TableHead>
                <TableHead>{t("common.unit")}</TableHead>
                <TableHead className="w-[100px] text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell className="max-w-[160px] whitespace-normal">
                    {c.name}
                  </TableCell>
                  <TableCell>
                    <PaletteBadge label={c.category} />
                  </TableCell>
                  <TableCell className="text-foreground">
                    {c.brand ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[180px] whitespace-normal text-muted-foreground">
                    {c.spec ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatIDR(c.unitPrice)}
                  </TableCell>
                  <TableCell>{c.unit}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(c)}
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(c)}
                        aria-label={`Hapus ${c.name}`}
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
        entityLabel="komponen"
        code={deleteTarget?.code ?? ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmRemove}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit komponen" : "Komponen baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto py-2 pr-1">
            <div className="grid gap-1.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="c-code">Kode</Label>
                <Input
                  id="c-code"
                  value={fCode}
                  onChange={(e) => setFCode(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-name">Nama</Label>
                <Input
                  id="c-name"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="c-cat">Kategori</Label>
                <Input
                  id="c-cat"
                  value={fCat}
                  onChange={(e) => setFCat(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-sub">Subkategori</Label>
                <Input
                  id="c-sub"
                  value={fSub}
                  onChange={(e) => setFSub(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="c-brand">Merek</Label>
                <Input
                  id="c-brand"
                  value={fBrand}
                  onChange={(e) => setFBrand(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-model">Model</Label>
                <Input
                  id="c-model"
                  value={fModel}
                  onChange={(e) => setFModel(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-spec">Spesifikasi</Label>
              <Input
                id="c-spec"
                value={fSpec}
                onChange={(e) => setFSpec(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="c-price">Harga satuan</Label>
                <Input
                  id="c-price"
                  inputMode="decimal"
                  value={fPrice}
                  onChange={(e) => setFPrice(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-cur">Mata uang</Label>
                <Input
                  id="c-cur"
                  value={fCur}
                  onChange={(e) => setFCur(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-unit">Satuan</Label>
                <Select value={fUnit} onValueChange={setFUnit}>
                  <SelectTrigger id="c-unit" className="w-full">
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
            <div className="grid gap-1.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="c-moq">MOQ</Label>
                <Input
                  id="c-moq"
                  inputMode="numeric"
                  value={fMoq}
                  onChange={(e) => setFMoq(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-lead">Lead time (hari)</Label>
                <Input
                  id="c-lead"
                  inputMode="numeric"
                  value={fLead}
                  onChange={(e) => setFLead(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-sup">Supplier</Label>
              <Input
                id="c-sup"
                value={fSup}
                onChange={(e) => setFSup(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-notes">Catatan</Label>
              <Input
                id="c-notes"
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
