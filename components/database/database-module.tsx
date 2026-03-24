"use client";

import {
  Download,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { TableLoadingSkeleton } from "@/components/table-loading-skeleton";
import {
  exportDatabaseSheet,
  parseXlsxFirstSheet,
  validateRequiredColumns,
} from "@/lib/database-xlsx";
import { downloadTextFile, parseCsv, toCsv } from "@/lib/csv";
import { formatIDR, formatNumber } from "@/lib/utils/format";

type ToastState = { type: "success" | "error"; message: string } | null;

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Permintaan gagal";
}

function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const show = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
  }, []);
  return { toast, show };
}

/* ——— Types ——— */

type Material = {
  id: string;
  code: string;
  name: string;
  category: string;
  density: number;
  pricePerKg: number;
  currency: string;
  unit: string;
  notes: string | null;
};

type Profile = {
  id: string;
  code: string;
  name: string;
  type: string;
  weightPerM: number;
  pricePerM: number;
  panelThick: number | null;
  notes: string | null;
};

type ComponentRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  spec: string | null;
  unitPrice: number;
  currency: string;
  unit: string;
  moq: number | null;
  leadTimeDays: number | null;
  supplier: string | null;
  notes: string | null;
};

type AppSettings = {
  id: string;
  forexUSD: number;
  forexEUR: number;
  forexRM: number;
  forexSGD: number;
  updatedAt: string;
};

const ALL = "__all__";

/* ——— Materials ——— */

function MaterialsPanel({ show }: { show: (t: "success" | "error", m: string) => void }) {
  const [rows, setRows] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
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
    setLoading(true);
    try {
      const r = await fetch("/api/materials");
      if (!r.ok) throw new Error(await readErr(r));
      setRows(await r.json());
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal memuat material");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
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
          body: JSON.stringify(body),
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

  const remove = async (m: Material) => {
    if (!window.confirm(`Hapus material ${m.code}?`)) return;
    try {
      const r = await fetch(`/api/materials/${m.id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error(await readErr(r));
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
    await exportDatabaseSheet("materials_export.xlsx", header, data);
    show("success", "Excel diekspor");
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
              body: JSON.stringify(body),
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
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
            + Add New
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
          <Button type="button" variant="outline" onClick={() => void exportXlsx()}>
            <Download className="size-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-4">
            <TableLoadingSkeleton columns={7} rows={6} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Belum ada material"
            description="Tambahkan material atau impor dari Excel (.xlsx)."
            actionLabel="+ Add New"
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
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Density</TableHead>
                <TableHead className="text-right">Price/kg</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
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
                        aria-label="Edit"
                        onClick={() => openEdit(m)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive"
                        aria-label="Hapus"
                        onClick={() => remove(m)}
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
                <Label htmlFor="m-den">Density</Label>
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
                <Input
                  id="m-unit"
                  value={fUnit}
                  onChange={(e) => setFUnit(e.target.value)}
                />
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

/* ——— Profiles ——— */

function ProfilesPanel({ show }: { show: (t: "success" | "error", m: string) => void }) {
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [fCode, setFCode] = useState("");
  const [fName, setFName] = useState("");
  const [fType, setFType] = useState("");
  const [fW, setFW] = useState("");
  const [fP, setFP] = useState("");
  const [fPanel, setFPanel] = useState("");
  const [fNotes, setFNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/profiles");
      if (!r.ok) throw new Error(await readErr(r));
      setRows(await r.json());
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
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
          body: JSON.stringify(body),
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

  const remove = async (p: Profile) => {
    if (!window.confirm(`Hapus profil ${p.code}?`)) return;
    try {
      const r = await fetch(`/api/profiles/${p.id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error(await readErr(r));
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
    await exportDatabaseSheet("profiles_export.xlsx", header, data);
    show("success", "Excel diekspor");
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
              body: JSON.stringify(body),
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
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
            + Add New
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
          <Button type="button" variant="outline" onClick={() => void exportXlsx()}>
            <Download className="size-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-4">
            <TableLoadingSkeleton columns={7} rows={6} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Belum ada data profil"
            description="Tambahkan profil panel atau impor Excel (.xlsx)."
            actionLabel="+ Add New"
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
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Weight/m</TableHead>
                <TableHead className="text-right">Price/m</TableHead>
                <TableHead className="text-center">Panel thick</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
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
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => remove(p)}
                        aria-label="Hapus"
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

/* ——— Components catalog ——— */

function ComponentsPanel({
  show,
}: {
  show: (t: "success" | "error", m: string) => void;
}) {
  const [rows, setRows] = useState<ComponentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ComponentRow | null>(null);
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
    setLoading(true);
    try {
      const r = await fetch("/api/components");
      if (!r.ok) throw new Error(await readErr(r));
      setRows(await r.json());
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal memuat komponen");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
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
          body: JSON.stringify(body),
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

  const remove = async (c: ComponentRow) => {
    if (!window.confirm(`Hapus komponen ${c.code}?`)) return;
    try {
      const r = await fetch(`/api/components/${c.id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error(await readErr(r));
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
    await exportDatabaseSheet("components_export.xlsx", header, data);
    show("success", "Excel diekspor");
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
              body: JSON.stringify(body),
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
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
            + Add New
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
          <Button type="button" variant="outline" onClick={() => void exportXlsx()}>
            <Download className="size-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-4">
            <TableLoadingSkeleton columns={8} rows={6} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Belum ada komponen"
            description="Tambahkan katalog komponen atau impor Excel (.xlsx)."
            actionLabel="+ Add New"
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
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="max-w-[180px]">Spec</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
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
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => remove(c)}
                        aria-label="Hapus"
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
                <Input
                  id="c-unit"
                  value={fUnit}
                  onChange={(e) => setFUnit(e.target.value)}
                />
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

/* ——— Forex ——— */

function ForexPanel({ show }: { show: (t: "success" | "error", m: string) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [usd, setUsd] = useState("");
  const [eur, setEur] = useState("");
  const [rm, setRm] = useState("");
  const [sgd, setSgd] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/settings");
      if (!r.ok) throw new Error(await readErr(r));
      const s = (await r.json()) as AppSettings;
      setSettings(s);
      setUsd(String(s.forexUSD));
      setEur(String(s.forexEUR));
      setRm(String(s.forexRM));
      setSgd(String(s.forexSGD));
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const forexUSD = Number(usd);
    const forexEUR = Number(eur);
    const forexRM = Number(rm);
    const forexSGD = Number(sgd);
    if (
      !Number.isFinite(forexUSD) ||
      !Number.isFinite(forexEUR) ||
      !Number.isFinite(forexRM) ||
      !Number.isFinite(forexSGD)
    ) {
      show("error", "Semua kurs harus angka valid");
      return;
    }
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forexUSD, forexEUR, forexRM, forexSGD }),
      });
      if (!r.ok) throw new Error(await readErr(r));
      const s = (await r.json()) as AppSettings;
      setSettings(s);
      show("success", "Rates saved");
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Failed to save");
    }
  };

  const exportCsv = () => {
    if (!settings) return;
    const rows = [
      ["pair", "rateIdr"],
      ["USD", String(settings.forexUSD)],
      ["EUR", String(settings.forexEUR)],
      ["RM", String(settings.forexRM)],
      ["SGD", String(settings.forexSGD)],
    ];
    downloadTextFile("forex-rates.csv", toCsv(rows));
    show("success", "CSV exported");
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const table = parseCsv(text);
    const map: Record<string, number> = {};
    for (const row of table) {
      if (row.length < 2) continue;
      const key = row[0]!.trim().toUpperCase();
      const val = Number(row[1]);
      if (!Number.isFinite(val)) continue;
      if (key === "USD" || key === "EUR" || key === "RM" || key === "SGD")
        map[key] = val;
    }
    if (Object.keys(map).length === 0) {
      show("error", "CSV must contain valid USD, EUR, RM, or SGD rows");
      return;
    }
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(map.USD !== undefined && { forexUSD: map.USD }),
          ...(map.EUR !== undefined && { forexEUR: map.EUR }),
          ...(map.RM !== undefined && { forexRM: map.RM }),
          ...(map.SGD !== undefined && { forexSGD: map.SGD }),
        }),
      });
      if (!r.ok) throw new Error(await readErr(r));
      const s = (await r.json()) as AppSettings;
      setSettings(s);
      setUsd(String(s.forexUSD));
      setEur(String(s.forexEUR));
      setRm(String(s.forexRM));
      setSgd(String(s.forexSGD));
      show("success", "Rates imported from CSV");
    } catch (err) {
      show("error", err instanceof Error ? err.message : "Import failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            disabled
            placeholder="Search (not used for rates)"
            className="max-w-md cursor-not-allowed bg-muted"
            title="Search applies to master tables only"
          />
          <div
            className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground shadow-xs sm:w-[200px]"
            title="Category filter applies to master tables only"
          >
            All categories
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled
            title="Edit rates in the form below"
            className="cursor-not-allowed opacity-60"
          >
            <Plus className="size-4" />
            Add New
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onImportFile}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            Import CSV
          </Button>
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-cardp-6">
        {loading ? (
          <div className="mx-auto max-w-md space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-9 w-full animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-6">
            <div>
              <h2 className="text-lg font-medium text-foreground">
                Reference rates to IDR
              </h2>
              {settings && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Last updated:{" "}
                  <time dateTime={settings.updatedAt}>
                    {new Date(settings.updatedAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="fx-usd">USD → IDR</Label>
                <Input
                  id="fx-usd"
                  inputMode="decimal"
                  value={usd}
                  onChange={(e) => setUsd(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tampilan: {usd && Number.isFinite(Number(usd)) ? formatIDR(Number(usd)) : "—"}
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fx-eur">EUR → IDR</Label>
                <Input
                  id="fx-eur"
                  inputMode="decimal"
                  value={eur}
                  onChange={(e) => setEur(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {eur && Number.isFinite(Number(eur)) ? formatIDR(Number(eur)) : "—"}
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fx-rm">RM → IDR</Label>
                <Input
                  id="fx-rm"
                  inputMode="decimal"
                  value={rm}
                  onChange={(e) => setRm(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {rm && Number.isFinite(Number(rm)) ? formatIDR(Number(rm)) : "—"}
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fx-sgd">SGD → IDR</Label>
                <Input
                  id="fx-sgd"
                  inputMode="decimal"
                  value={sgd}
                  onChange={(e) => setSgd(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {sgd && Number.isFinite(Number(sgd)) ? formatIDR(Number(sgd)) : "—"}
                </p>
              </div>
            </div>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ——— Root ——— */

export function DatabaseModule() {
  const { toast, show } = useToast();

  return (
    <div className="relative">
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[100] max-w-md -translate-x-1/2 px-4"
          role="status"
        >
          <div
            className={
              toast.type === "success"
                ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg"
                : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-lg"
            }
          >
            {toast.message}
          </div>
        </div>
      )}

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="mb-6 h-auto w-full flex-wrap justify-start gap-1 bg-muted/80 p-1">
          <TabsTrigger value="materials">Material Prices</TabsTrigger>
          <TabsTrigger value="profiles">Profile Data</TabsTrigger>
          <TabsTrigger value="components">Component Catalog</TabsTrigger>
          <TabsTrigger value="forex">Forex Rates</TabsTrigger>
        </TabsList>
        <TabsContent value="materials" className="mt-0">
          <MaterialsPanel show={show} />
        </TabsContent>
        <TabsContent value="profiles" className="mt-0">
          <ProfilesPanel show={show} />
        </TabsContent>
        <TabsContent value="components" className="mt-0">
          <ComponentsPanel show={show} />
        </TabsContent>
        <TabsContent value="forex" className="mt-0">
          <ForexPanel show={show} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
