"use client";

import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_QUOTATION_INTRO } from "@/lib/merge-quotation-doc";
import { formatIDR } from "@/lib/utils/format";
import { toastError, toastSuccess } from "@/store/toastStore";
import { SPEC_MAX_CHARS, readErr, CustomerOption } from "./documentation-shared";
import type { EditorCtx } from "./use-documentation-editor";

export function DocumentationForm({ ed }: { ed: EditorCtx }) {
  const {
    quotation,
    available,
    projectQuery,
    setProjectQuery,
    pickerOpen,
    setPickerOpen,
    customers,
    form,
    setForm,
    loadCustomers,
    previewTotals,
    effectiveTtdPrepared,
    effectiveTtdReviewed,
    effectiveTtdApproved,
    addProject,
    updateLine,
    removeLine,
    filteredAvailable,
    compressImageFile,
    presetSigned,
    presetChecked,
    presetApproved,
  } = ed;

  return (
    <>
        <Card className="border-border flex min-h-0 flex-col overflow-hidden">
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <Tabs
              defaultValue="identitas"
              className="flex min-h-0 w-full flex-1 flex-col"
            >
              <TabsList className="grid w-full shrink-0 grid-cols-5 rounded-none border-b bg-muted/40 px-3 py-1.5">
                <TabsTrigger value="identitas" className="text-xs">
                  Identitas
                </TabsTrigger>
                <TabsTrigger value="klien" className="text-xs">
                  Klien
                </TabsTrigger>
                <TabsTrigger value="items" className="text-xs">
                  Item
                </TabsTrigger>
                <TabsTrigger value="syarat" className="text-xs">
                  S&K
                </TabsTrigger>
                <TabsTrigger value="ttd" className="text-xs">
                  TTD
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="identitas"
                className="mt-0 min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
              >
                <div className="grid gap-2">
                  <Label>No. Surat</Label>
                  <Input
                    value={form.noSurat}
                    onChange={(e) => setForm((f) => ({ ...f, noSurat: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Perihal</Label>
                  <Input
                    value={form.perihal}
                    onChange={(e) => setForm((f) => ({ ...f, perihal: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Sambutan (sebelum tabel)</Label>
                  <p className="text-muted-foreground text-xs leading-snug">
                    Teks pembuka surat. Tekan Enter untuk baris baru; baris kosong untuk jeda antar
                    paragraf.
                  </p>
                  <Textarea
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    value={form.introText}
                    placeholder={DEFAULT_QUOTATION_INTRO}
                    onChange={(e) => setForm((f) => ({ ...f, introText: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Our Ref</Label>
                  <Input
                    value={form.ourRef}
                    onChange={(e) => setForm((f) => ({ ...f, ourRef: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Your Ref</Label>
                  <Input
                    value={form.yourRef}
                    onChange={(e) => setForm((f) => ({ ...f, yourRef: e.target.value }))}
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="klien"
                className="mt-0 min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
              >
                <div className="grid gap-2">
                  <Label>Pelanggan (master)</Label>
                  <Select
                    value={form.customerId || "__none__"}
                    onValueChange={(v) => {
                      if (v === "__none__") {
                        setForm((f) => ({ ...f, customerId: "" }));
                        return;
                      }
                      const c = customers.find((x) => x.id === v);
                      setForm((f) => ({
                        ...f,
                        customerId: v,
                        clientName: c?.name ?? f.clientName,
                        clientCompany: c?.company ?? f.clientCompany,
                        clientAddress: c?.address ?? f.clientAddress,
                        clientAttn: c?.attn ?? f.clientAttn,
                        clientPhone: c?.phone ?? f.clientPhone,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pelanggan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Manual —</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.company ? ` · ${c.company}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-fit"
                    onClick={() => {
                      void (async () => {
                        if (!form.clientName.trim() && !form.clientCompany.trim()) {
                          toastError("Isi nama atau perusahaan dulu");
                          return;
                        }
                        try {
                          const r = await fetch("/api/customers", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              name:
                                form.clientName.trim() ||
                                form.clientCompany.trim(),
                              company: form.clientCompany.trim(),
                              address: form.clientAddress.trim(),
                              attn: form.clientAttn.trim(),
                              phone: form.clientPhone.trim(),
                            }),
                          });
                          if (!r.ok) throw new Error(await readErr(r));
                          const created = (await r.json()) as CustomerOption;
                          await loadCustomers();
                          setForm((f) => ({ ...f, customerId: created.id }));
                          toastSuccess("Pelanggan disimpan ke master");
                        } catch (e) {
                          toastError(
                            e instanceof Error
                              ? e.message
                              : "Gagal menyimpan pelanggan"
                          );
                        }
                      })();
                    }}
                  >
                    Simpan sebagai pelanggan baru
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label>Salesman</Label>
                  <Input
                    value={form.salesman}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, salesman: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nama Klien</Label>
                  <Input
                    value={form.clientName}
                    onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Perusahaan</Label>
                  <Input
                    value={form.clientCompany}
                    onChange={(e) => setForm((f) => ({ ...f, clientCompany: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Alamat</Label>
                  <Textarea
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    value={form.clientAddress}
                    onChange={(e) => setForm((f) => ({ ...f, clientAddress: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Attn</Label>
                  <Input
                    value={form.clientAttn}
                    onChange={(e) => setForm((f) => ({ ...f, clientAttn: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>No. Telp</Label>
                  <Input
                    value={form.clientPhone}
                    onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Lokasi Proyek</Label>
                  <Input
                    value={form.projectLocation}
                    onChange={(e) => setForm((f) => ({ ...f, projectLocation: e.target.value }))}
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="items"
                className="mt-0 min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
              >
                <div className="relative">
                  <Label className="mb-1 block">Tambah item dari Costing...</Label>
                  <Input
                    placeholder="Cari nama / model..."
                    value={projectQuery}
                    onChange={(e) => {
                      setProjectQuery(e.target.value);
                      setPickerOpen(true);
                    }}
                    onFocus={() => setPickerOpen(true)}
                  />
                  {pickerOpen && (
                    <div className="border-input absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover shadow-md">
                      {filteredAvailable.length === 0 ? (
                        <div className="text-muted-foreground p-3 text-sm">
                          Tidak ada proyek final/approved dengan harga jual &gt; 0.
                        </div>
                      ) : (
                        filteredAvailable.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="hover:bg-muted/40 flex w-full items-start gap-2 px-3 py-2 text-left text-sm"
                            onClick={() => addProject(p)}
                          >
                            <Plus className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <span>
                              <span className="font-medium">{p.name}</span>
                              {p.ahuModel ? (
                                <span className="text-muted-foreground"> · {p.ahuModel}</span>
                              ) : null}
                              <span className="block text-xs text-emerald-700">
                                {formatIDR(p.totalSelling)}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-2 py-2">No</th>
                        <th className="px-2 py-2">Deskripsi</th>
                        <th className="px-2 py-2">Spesifikasi</th>
                        <th className="px-2 py-2">Qty</th>
                        <th className="px-2 py-2">UOM</th>
                        <th className="px-2 py-2">Harga Sat.</th>
                        <th className="px-2 py-2">Total</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it, idx) => {
                        const apiItem = quotation?.items?.find((x) => x.id === it.id);
                        const live =
                          apiItem?.project?.totalSelling ??
                          available.find((p) => p.id === it.projectId)?.totalSelling;
                        const stale =
                          live != null && Math.abs(live - it.unitPrice) > 0.5;
                        return (
                          <tr key={it.localId} className="border-t">
                            <td className="px-2 py-2 align-top">{idx + 1}</td>
                            <td className="px-2 py-2 align-top">
                              <Input
                                value={it.description}
                                onChange={(e) =>
                                  updateLine(it.localId, { description: e.target.value })
                                }
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Textarea
                                className="border-input field-sizing-content min-h-[72px] w-full min-w-[12rem] max-w-[min(100%,22rem)] rounded border px-2 py-1.5 text-xs leading-snug"
                                value={it.spec}
                                maxLength={SPEC_MAX_CHARS}
                                rows={4}
                                placeholder="Judul segmen dari costing (urut). Enter = baris baru. Maks. 4000 karakter."
                                onChange={(e) =>
                                  updateLine(it.localId, {
                                    spec: e.target.value.slice(0, SPEC_MAX_CHARS),
                                  })
                                }
                              />
                              <p className="text-muted-foreground mt-0.5 text-2xs">
                                {it.spec.length}/{SPEC_MAX_CHARS}
                              </p>
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Input
                                type="number"
                                min={1}
                                className="w-20"
                                value={it.qty}
                                onChange={(e) =>
                                  updateLine(it.localId, {
                                    qty: Math.max(1, Math.floor(Number(e.target.value)) || 1),
                                  })
                                }
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Input
                                className="w-20"
                                value={it.uom}
                                onChange={(e) =>
                                  updateLine(it.localId, { uom: e.target.value })
                                }
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <div className="flex items-center gap-1">
                                <span className="text-xs whitespace-nowrap">
                                  {formatIDR(it.unitPrice)}
                                </span>
                                {stale ? (
                                  <span title="Harga costing di engine sudah berubah; harga penawaran tidak diubah otomatis.">
                                    <AlertTriangle className="size-4 text-amber-500" />
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-2 py-2 align-top text-xs">
                                  {formatIDR(it.qty * it.unitPrice)}
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label="Hapus baris"
                                onClick={() => removeLine(it.localId)}
                              >
                                <X className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 rounded-lg border bg-card p-4 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatIDR(previewTotals.totalBeforeDisc)}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.discountEnabled}
                        onCheckedChange={(v) =>
                          setForm((f) => ({ ...f, discountEnabled: v }))
                        }
                      />
                      <span>Diskon (%)</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      disabled={!form.discountEnabled}
                      value={form.discount}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          discount: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                    />
                    <span className="text-right">
                      {form.discountEnabled ? (
                        <>
                          -
                          {formatIDR(
                            Math.max(
                              0,
                              previewTotals.totalBeforeDisc -
                                previewTotals.totalAfterDisc
                            )
                          )}
                        </>
                      ) : (
                        formatIDR(0)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.pphEnabled}
                        onCheckedChange={(v) =>
                          setForm((f) => ({ ...f, pphEnabled: v }))
                        }
                      />
                      <span>PPH / PPh (%)</span>
                    </div>
                    {form.pphEnabled ? (
                      <Input
                        type="number"
                        min={0}
                        className="w-24"
                        value={form.pphRate}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            pphRate: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    ) : (
                      <span />
                    )}
                    <span>
                      {form.pphEnabled
                        ? formatIDR(previewTotals.totalPPH)
                        : formatIDR(0)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.ppnEnabled}
                        onCheckedChange={(v) =>
                          setForm((f) => ({ ...f, ppnEnabled: v }))
                        }
                      />
                      <span>PPN (%)</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      disabled={!form.ppnEnabled}
                      value={form.ppn}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          ppn: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                    />
                    <span>
                      {form.ppnEnabled
                        ? formatIDR(previewTotals.totalPPN)
                        : formatIDR(0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold text-emerald-800">
                    <span>Grand Total</span>
                    <span>{formatIDR(previewTotals.grandTotal)}</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="syarat"
                className="mt-0 min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
              >
                <div className="grid gap-2">
                  <Label>Pembayaran</Label>
                  <Input
                    value={form.paymentTerms}
                    onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Pengiriman</Label>
                  <Input
                    value={form.deliveryTerms}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryTerms: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Garansi</Label>
                  <Input
                    value={form.warrantyTerms}
                    onChange={(e) => setForm((f) => ({ ...f, warrantyTerms: e.target.value }))}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="grid flex-1 gap-2">
                    <Label>Validitas (hari)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.validityDays}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          validityDays: Math.max(0, Math.round(Number(e.target.value)) || 0),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>T&amp;C</Label>
                  <Textarea
                    className="border-input bg-background min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
                    value={form.termsConditions}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, termsConditions: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Catatan</Label>
                  <Textarea
                    className="border-input bg-background min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="ttd"
                className="mt-0 min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
              >
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Nama PJ diisi di{" "}
                  <span className="font-medium text-foreground">Settings → Penanggung jawab</span>.
                  Logo perusahaan di{" "}
                  <span className="font-medium text-foreground">Settings → Company Profile → Logo</span>.
                </p>
                {(
                  [
                    {
                      label: "Dibuat oleh",
                      name: presetSigned,
                      formKey: "ttdPrepared" as const,
                    },
                    {
                      label: "Diperiksa",
                      name: presetChecked,
                      formKey: "ttdReviewed" as const,
                    },
                    {
                      label: "Disetujui",
                      name: presetApproved,
                      formKey: "ttdApproved" as const,
                    },
                  ] as const
                ).map((row) => (
                  <div key={row.formKey} className="flex items-end gap-2">
                    <div className="grid min-w-0 flex-1 gap-1">
                      <Label>{row.label}</Label>
                      <Input readOnly value={row.name} className="bg-muted/40" />
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 pb-0.5">
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`ttd-${row.formKey}`}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const b64 = await compressImageFile(f);
                          setForm((prev) => ({ ...prev, [row.formKey]: b64 }));
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" asChild>
                        <label htmlFor={`ttd-${row.formKey}`} className="cursor-pointer">
                          Upload TTD
                        </label>
                      </Button>
                      {(() => {
                        const eff =
                          row.formKey === "ttdPrepared"
                            ? effectiveTtdPrepared
                            : row.formKey === "ttdReviewed"
                              ? effectiveTtdReviewed
                              : effectiveTtdApproved;
                        return eff?.startsWith("data:") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={eff}
                            alt=""
                            className="mt-1 max-h-14 border bg-white object-contain p-0.5"
                          />
                        ) : null;
                      })()}
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <Label>Upload stamp (cap)</Label>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Ditampilkan di PDF jika status{" "}
                    <span className="font-medium">Approved</span>, di depan tanda tangan
                    kolom Disetujui (seperti stempel basah).
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    className="mt-2 max-w-xs"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const b64 = await compressImageFile(f);
                      setForm((prev) => ({ ...prev, stampPath: b64 }));
                    }}
                  />
                  {form.stampPath?.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.stampPath}
                      alt="Stamp"
                      className="mt-2 max-h-24 rotate-[-8deg] border bg-white object-contain p-1 opacity-50"
                    />
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
    </>
  );
}
