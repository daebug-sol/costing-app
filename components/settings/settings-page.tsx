"use client";

import { Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneDash } from "@/lib/phone-format";
import { formatNumber } from "@/lib/utils/format";
import { PageShell } from "@/components/page-shell";
import { OrgMembersCard } from "@/components/settings/org-members-card";
import { ThemeSettingsCard } from "@/components/settings/theme-settings-card";
import type { OrgRole } from "@/lib/org-roles";
import type { Permission } from "@/lib/permissions";
import { toastError, toastSuccess } from "@/store/toastStore";
import { useCostingStore } from "@/store/costingStore";

type Settings = {
  id: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo: string | null;
  presetSignedByName: string;
  presetCheckedByName: string;
  presetApprovedByName: string;
  presetTtdPrepared: string | null;
  presetTtdReviewed: string | null;
  presetTtdApproved: string | null;
  forexUSD: number;
  forexEUR: number;
  forexRM: number;
  forexSGD: number;
  defaultOverhead: number;
  defaultContingency: number;
  defaultMargin: number;
  defaultEskalasi: number;
  defaultAsuransi: number;
  ppnRate: number;
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  validityDays: number;
  termsConditions: string;
  onboardingComplete?: boolean;
  quoPrefix?: string;
  soPrefix?: string;
  doPrefix?: string;
  invPrefix?: string;
  payPrefix?: string;
  /** Read-only product modules; ignored on PUT. */
  modules?: { ahu: boolean };
  role?: OrgRole;
  permissions?: Permission[];
  updatedAt: string;
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

export function SettingsPage() {
  const [row, setRow] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const syncOrgCaps = useCostingStore((s) => s.loadOrgModules);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/settings");
      if (!r.ok) throw new Error(await readErr(r));
      const data = (await r.json()) as Settings;
      setRow({
        ...data,
        companyPhone: formatPhoneDash(data.companyPhone ?? ""),
        presetSignedByName: data.presetSignedByName ?? "",
        presetCheckedByName: data.presetCheckedByName ?? "",
        presetApprovedByName: data.presetApprovedByName ?? "",
      });
      void syncOrgCaps().catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, [syncOrgCaps]);

  useEffect(() => {
    void load();
  }, [load]);

  const canWrite = (row?.permissions ?? []).includes("settings:write");
  const canManageMembers = (row?.permissions ?? []).includes("members:manage");
  const actorRole: OrgRole = row?.role ?? "member";

  const put = async (partial: Record<string, unknown>, card: string) => {
    if (!canWrite) {
      toastError("Anda tidak punya izin mengubah pengaturan");
      return;
    }
    setSaving(card);
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (!r.ok) throw new Error(await readErr(r));
      setRow(await r.json());
      void syncOrgCaps().catch(() => undefined);
      toastSuccess("Pengaturan disimpan");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(null);
    }
  };

  if (error && !row) {
    return (
      <PageShell
        width="narrow"
        eyebrow="Konfigurasi"
        title="Pengaturan"
        description="Profil perusahaan, default costing, forex, dan syarat penawaran"
        contentClassName="flex flex-col gap-6 lg:py-8"
      >
        <ThemeSettingsCard />
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-foreground">{error}</p>
          <Button type="button" className="mt-4 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            Coba lagi
          </Button>
        </div>
      </PageShell>
    );
  }

  if (loading && !row) {
    return (
      <PageShell
        width="narrow"
        eyebrow="Konfigurasi"
        title="Pengaturan"
        description="Profil perusahaan, default costing, forex, dan syarat penawaran"
        contentClassName="flex flex-col gap-6 lg:py-8"
      >
        <ThemeSettingsCard />
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!row) return null;

  const readFileB64 = (file: File | null, cb: (s: string) => void) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => cb(String(r.result ?? ""));
    r.readAsDataURL(file);
  };

  return (
    <PageShell
      width="narrow"
      eyebrow="Konfigurasi"
      title="Pengaturan"
      description="Profil perusahaan, default costing, forex, dan syarat penawaran"
      contentClassName="flex flex-col gap-6 lg:py-8"
    >
      {!row.onboardingComplete ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Selamat datang — setup organisasi</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              Lengkapi nama perusahaan dan kurs forex default di bawah. Data ini
              dipakai untuk quotation dan database harga organisasi Anda.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void put({ onboardingComplete: true }, "onboarding")}
                disabled={saving === "onboarding" || !canWrite}
              >
                {saving === "onboarding" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Tandai setup selesai"
                )}
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href="/help/mulai-cepat/orientasi-aplikasi">
                  Buka panduan Help
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ThemeSettingsCard />

      {!canWrite ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Peran Anda ({actorRole}) hanya dapat melihat pengaturan. Hubungi owner
          atau admin untuk mengubah data organisasi.
        </p>
      ) : null}

      {canManageMembers ? <OrgMembersCard actorRole={actorRole} /> : null}

      <Card size="sm" className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Profil perusahaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="co-name">Nama perusahaan</Label>
            <Input
              id="co-name"
              value={row.companyName}
              onChange={(e) => setRow({ ...row, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="co-addr">Alamat</Label>
            <textarea
              id="co-addr"
              className="border-input bg-background focus-visible:ring-ring flex min-h-[88px] w-full rounded-md border px-2.5 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
              value={row.companyAddress}
              onChange={(e) =>
                setRow({ ...row, companyAddress: e.target.value })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="co-phone">Telepon</Label>
              <Input
                id="co-phone"
                placeholder="+62-812-3456-7890"
                value={row.companyPhone}
                onChange={(e) =>
                  setRow({
                    ...row,
                    companyPhone: formatPhoneDash(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-email">Email</Label>
              <Input
                id="co-email"
                type="email"
                value={row.companyEmail}
                onChange={(e) =>
                  setRow({ ...row, companyEmail: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <Input
              type="file"
              accept="image/*"
              className="cursor-pointer"
              onChange={(e) =>
                readFileB64(e.target.files?.[0] ?? null, (s) =>
                  setRow({ ...row, companyLogo: s })
                )
              }
            />
            {row.companyLogo?.startsWith("data:") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.companyLogo}
                alt="Logo"
                className="mt-2 h-16 w-auto max-w-full object-contain"
              />
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t bg-muted/40">
          <Button
            type="button"
            disabled={saving !== null || !canWrite}
            onClick={() =>
              void put(
                {
                  companyName: row.companyName,
                  companyAddress: row.companyAddress,
                  companyPhone: row.companyPhone,
                  companyEmail: row.companyEmail,
                  companyLogo: row.companyLogo,
                },
                "company"
              )
            }
          >
            {saving === "company" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Simpan"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card size="sm" className="border-border ">
        <CardHeader>
          <CardTitle className="text-lg">Penanggung jawab &amp; TTD preset</CardTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Nama dan TTD default untuk dokumen penawaran (Documentation).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="pj-signed">Dibuat oleh</Label>
              <Input
                id="pj-signed"
                value={row.presetSignedByName}
                onChange={(e) =>
                  setRow({ ...row, presetSignedByName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pj-checked">Diperiksa</Label>
              <Input
                id="pj-checked"
                value={row.presetCheckedByName}
                onChange={(e) =>
                  setRow({ ...row, presetCheckedByName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pj-approved">Disetujui</Label>
              <Input
                id="pj-approved"
                value={row.presetApprovedByName}
                onChange={(e) =>
                  setRow({ ...row, presetApprovedByName: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>TTD preset — Dibuat</Label>
              <Input
                type="file"
                accept="image/*"
                className="cursor-pointer"
                onChange={(e) =>
                  readFileB64(e.target.files?.[0] ?? null, (s) =>
                    setRow({ ...row, presetTtdPrepared: s })
                  )
                }
              />
              {row.presetTtdPrepared?.startsWith("data:") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.presetTtdPrepared}
                  alt=""
                  className="mt-2 max-h-16 border bg-white object-contain p-1"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>TTD preset — Diperiksa</Label>
              <Input
                type="file"
                accept="image/*"
                className="cursor-pointer"
                onChange={(e) =>
                  readFileB64(e.target.files?.[0] ?? null, (s) =>
                    setRow({ ...row, presetTtdReviewed: s })
                  )
                }
              />
              {row.presetTtdReviewed?.startsWith("data:") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.presetTtdReviewed}
                  alt=""
                  className="mt-2 max-h-16 border bg-white object-contain p-1"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>TTD preset — Disetujui</Label>
              <Input
                type="file"
                accept="image/*"
                className="cursor-pointer"
                onChange={(e) =>
                  readFileB64(e.target.files?.[0] ?? null, (s) =>
                    setRow({ ...row, presetTtdApproved: s })
                  )
                }
              />
              {row.presetTtdApproved?.startsWith("data:") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.presetTtdApproved}
                  alt=""
                  className="mt-2 max-h-16 border bg-white object-contain p-1"
                />
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t bg-muted/40">
          <Button
            type="button"
            disabled={saving !== null || !canWrite}
            onClick={() =>
              void put(
                {
                  presetSignedByName: row.presetSignedByName,
                  presetCheckedByName: row.presetCheckedByName,
                  presetApprovedByName: row.presetApprovedByName,
                  presetTtdPrepared: row.presetTtdPrepared,
                  presetTtdReviewed: row.presetTtdReviewed,
                  presetTtdApproved: row.presetTtdApproved,
                },
                "pj"
              )
            }
          >
            {saving === "pj" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Simpan"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card size="sm" className="border-border ">
        <CardHeader>
          <CardTitle className="text-lg">Rate default costing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["defaultOverhead", "Overhead", "%"],
                ["defaultContingency", "Contingency", "%"],
                ["defaultMargin", "Margin", "%"],
                ["ppnRate", "PPN", "%"],
                ["defaultEskalasi", "Eskalasi", "%"],
                ["defaultAsuransi", "Asuransi", "%"],
              ] as const
            ).map(([key, label, suf]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={key}
                    type="number"
                    step="0.1"
                    className="tabular-nums"
                    value={row[key]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v))
                        setRow({ ...row, [key]: v } as Settings);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{suf}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t bg-muted/40">
          <Button
            type="button"
            disabled={saving !== null || !canWrite}
            onClick={() =>
              void put(
                {
                  defaultOverhead: row.defaultOverhead,
                  defaultContingency: row.defaultContingency,
                  defaultMargin: row.defaultMargin,
                  ppnRate: row.ppnRate,
                  defaultEskalasi: row.defaultEskalasi,
                  defaultAsuransi: row.defaultAsuransi,
                },
                "rates"
              )
            }
          >
            {saving === "rates" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Simpan"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card size="sm" className="border-border ">
        <CardHeader>
          <CardTitle className="text-lg">Kurs forex</CardTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Last updated:{" "}
            {new Date(row.updatedAt).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Kurs referensi (IDR per unit valas): USD{" "}
            {formatNumber(row.forexUSD, 0)} · EUR {formatNumber(row.forexEUR, 0)}{" "}
            · RM {formatNumber(row.forexRM, 0)} · SGD{" "}
            {formatNumber(row.forexSGD, 0)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["forexUSD", "USD → IDR"],
                ["forexEUR", "EUR → IDR"],
                ["forexRM", "RM → IDR"],
                ["forexSGD", "SGD → IDR"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  step="1"
                  className="tabular-nums"
                  value={row[key]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v))
                      setRow({ ...row, [key]: v } as Settings);
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t bg-muted/40">
          <Button
            type="button"
            disabled={saving !== null || !canWrite}
            onClick={() =>
              void put(
                {
                  forexUSD: row.forexUSD,
                  forexEUR: row.forexEUR,
                  forexRM: row.forexRM,
                  forexSGD: row.forexSGD,
                },
                "forex"
              )
            }
          >
            {saving === "forex" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Simpan"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card size="sm" className="border-border ">
        <CardHeader>
          <CardTitle className="text-lg">Prefix penomoran dokumen</CardTitle>
          <p className="text-xs text-muted-foreground">
            Format nomor: PREFIX-YYYYMM-0001 (contoh QT-202608-0001)
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["quoPrefix", "Quotation"],
              ["soPrefix", "Sales Order"],
              ["doPrefix", "Surat Jalan"],
              ["invPrefix", "Invoice"],
              ["payPrefix", "Pembayaran"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={row[key] ?? ""}
                maxLength={8}
                onChange={(e) =>
                  setRow({
                    ...row,
                    [key]: e.target.value.toUpperCase(),
                  } as Settings)
                }
              />
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-end border-t bg-muted/40">
          <Button
            type="button"
            disabled={saving !== null || !canWrite}
            onClick={() =>
              void put(
                {
                  quoPrefix: row.quoPrefix ?? "QT",
                  soPrefix: row.soPrefix ?? "SO",
                  doPrefix: row.doPrefix ?? "SJ",
                  invPrefix: row.invPrefix ?? "INV",
                  payPrefix: row.payPrefix ?? "PAY",
                },
                "prefixes"
              )
            }
          >
            {saving === "prefixes" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Simpan"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card size="sm" className="border-border ">
        <CardHeader>
          <CardTitle className="text-lg">Syarat default penawaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pay">Syarat pembayaran</Label>
            <Input
              id="pay"
              value={row.paymentTerms}
              onChange={(e) =>
                setRow({ ...row, paymentTerms: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="del">Syarat pengiriman</Label>
            <Input
              id="del"
              value={row.deliveryTerms}
              onChange={(e) =>
                setRow({ ...row, deliveryTerms: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="war">Syarat garansi</Label>
            <Input
              id="war"
              value={row.warrantyTerms}
              onChange={(e) =>
                setRow({ ...row, warrantyTerms: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="val">Masa berlaku (hari)</Label>
            <Input
              id="val"
              type="number"
              min={0}
              value={row.validityDays}
              onChange={(e) => {
                const v = Math.round(Number(e.target.value));
                if (Number.isFinite(v)) setRow({ ...row, validityDays: v });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tc">Syarat &amp; ketentuan default</Label>
            <textarea
              id="tc"
              className="border-input bg-background focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-2.5 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
              value={row.termsConditions}
              onChange={(e) =>
                setRow({ ...row, termsConditions: e.target.value })
              }
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t bg-muted/40">
          <Button
            type="button"
            disabled={saving !== null || !canWrite}
            onClick={() =>
              void put(
                {
                  paymentTerms: row.paymentTerms,
                  deliveryTerms: row.deliveryTerms,
                  warrantyTerms: row.warrantyTerms,
                  validityDays: row.validityDays,
                  termsConditions: row.termsConditions,
                },
                "terms"
              )
            }
          >
            {saving === "terms" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Simpan"
            )}
          </Button>
        </CardFooter>
      </Card>

      <footer className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
        <Link
          href="/legal/privacy"
          className="hover:text-foreground transition-colors"
        >
          Kebijakan Privasi
        </Link>
        <span aria-hidden className="mx-2 text-border">
          ·
        </span>
        <Link
          href="/legal/terms"
          className="hover:text-foreground transition-colors"
        >
          Syarat &amp; Ketentuan
        </Link>
      </footer>
    </PageShell>
  );
}
