"use client";

import { Loader2, Plus, Search, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toastError, toastSuccess } from "@/store/toastStore";

type Customer = {
  id: string;
  name: string;
  company: string;
  address: string;
  attn: string;
  phone: string;
  email: string | null;
  npwp: string | null;
  notes: string | null;
};

const emptyForm = {
  name: "",
  company: "",
  address: "",
  attn: "",
  phone: "",
  email: "",
  npwp: "",
  notes: "",
};

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

export function CustomersModule() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const qs = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const r = await fetch(`/api/customers${qs}`);
      if (!r.ok) throw new Error(await readErr(r));
      setRows((await r.json()) as Customer[]);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal memuat pelanggan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      company: c.company,
      address: c.address,
      attn: c.attn,
      phone: c.phone,
      email: c.email ?? "",
      npwp: c.npwp ?? "",
      notes: c.notes ?? "",
    });
  };

  const save = async () => {
    if (!form.name.trim()) {
      toastError("Nama pelanggan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        company: form.company.trim(),
        address: form.address.trim(),
        attn: form.attn.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        npwp: form.npwp.trim() || null,
        notes: form.notes.trim() || null,
      };
      const r = await fetch(
        editingId ? `/api/customers/${editingId}` : "/api/customers",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!r.ok) throw new Error(await readErr(r));
      toastSuccess(editingId ? "Pelanggan diperbarui" : "Pelanggan ditambahkan");
      setForm(emptyForm);
      setEditingId(null);
      await load(q);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus pelanggan ini?")) return;
    try {
      const r = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await readErr(r));
      toastSuccess("Pelanggan dihapus");
      if (editingId === id) startCreate();
      await load(q);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal menghapus");
    }
  };

  return (
    <PageShell
      width="wide"
      eyebrow="Master data"
      title="Pelanggan"
      description="Data master pelanggan untuk penawaran, sales order, invoice, dan pembayaran"
      contentClassName="space-y-6"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Daftar pelanggan</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-48 pl-8 sm:w-56"
                  placeholder="Cari nama / perusahaan"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void load(q);
                  }}
                />
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => void load(q)}>
                Cari
              </Button>
              <Button type="button" size="sm" onClick={startCreate}>
                <Plus className="size-4" />
                Baru
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Memuat…
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Belum ada pelanggan"
                description="Tambah pelanggan dari formulir di samping, atau jalankan backfill dari quotation lama."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Perusahaan</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.company || "—"}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell className="space-x-1 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(c)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void remove(c.id)}
                        >
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Edit pelanggan" : "Pelanggan baru"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">Nama</Label>
              <Input
                id="cust-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-company">Perusahaan</Label>
              <Input
                id="cust-company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-attn">Up. / Attn</Label>
              <Input
                id="cust-attn"
                value={form.attn}
                onChange={(e) => setForm((f) => ({ ...f, attn: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone">Telepon</Label>
              <Input
                id="cust-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-email">Email</Label>
              <Input
                id="cust-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-npwp">NPWP</Label>
              <Input
                id="cust-npwp"
                value={form.npwp}
                onChange={(e) => setForm((f) => ({ ...f, npwp: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-address">Alamat</Label>
              <textarea
                id="cust-address"
                rows={2}
                className="border-input bg-background focus-visible:ring-ring flex min-h-[64px] w-full rounded-md border px-2.5 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-notes">Catatan</Label>
              <textarea
                id="cust-notes"
                rows={2}
                className="border-input bg-background focus-visible:ring-ring flex min-h-[64px] w-full rounded-md border px-2.5 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Simpan
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={startCreate}>
                  Batal
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
