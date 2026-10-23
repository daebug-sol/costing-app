"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/store/toastStore";

async function readErr(res: Response, fallback: string): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return fallback;
}

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** Hook is only called when Clerk is mounted; the page renders one of two shells. */
function useActivateOrg() {
  const list = useOrganizationList();
  return list.setActive;
}

function CodeCard({
  setActive,
}: {
  setActive?: (args: { organization: string }) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error(await readErr(res, "Aktivasi gagal"));
      const data = (await res.json()) as { clerkOrgId: string };
      if (setActive) await setActive({ organization: data.clerkOrgId });
      toastSuccess("Demo aktif. Selamat mencoba.");
      window.location.assign("/");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Aktivasi gagal");
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Masukkan kode aktivasi</CardTitle>
        <CardDescription>
          Kode dikirim lewat email setelah permintaan demo disetujui. Gunakan
          akun dengan email yang sama.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="activation-code">Kode aktivasi</Label>
            <Input
              id="activation-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              className="font-mono uppercase"
            />
          </div>
          <Button type="submit" disabled={busy || !code.trim()}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : null}
            Aktifkan demo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RequestCard() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/demo/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, phone }),
      });
      if (!res.ok) throw new Error(await readErr(res, "Permintaan gagal dikirim"));
      setSent(true);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Permintaan gagal dikirim");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permintaan terkirim</CardTitle>
          <CardDescription>
            Kode aktivasi akan dikirim ke email akun ini setelah disetujui.
            Setelah menerimanya, masukkan di kolom kode.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Belum punya kode?</CardTitle>
        <CardDescription>
          Minta demo 30 hari. Kami kirim kode aktivasi ke email akun ini.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="demo-name">Nama</Label>
            <Input
              id="demo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="demo-company">Perusahaan</Label>
            <Input
              id="demo-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="demo-phone">Nomor WhatsApp (opsional)</Label>
            <Input
              id="demo-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
            />
          </div>
          <Button type="submit" variant="outline" disabled={busy || !name.trim() || !company.trim()}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : null}
            Minta demo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ClerkActivation() {
  const setActive = useActivateOrg();
  return (
    <CodeCard
      setActive={
        setActive
          ? async (args) => {
              await setActive(args);
            }
          : undefined
      }
    />
  );
}

export function ActivationPage() {
  return (
    <PageShell
      width="narrow"
      title="Aktivasi demo"
      contentClassName="flex flex-col gap-6 lg:py-8"
    >
      {/* Onboarding instructions, so they live in the body rather than as a page subtitle. */}
      <p className="text-sm text-muted-foreground">
        Akun Anda belum terhubung ke organisasi. Masukkan kode aktivasi atau minta demo. Sudah punya
        organisasi? Pilih lewat pemilih organisasi di bilah atas.
      </p>
      {HAS_CLERK ? <ClerkActivation /> : <CodeCard />}
      <RequestCard />
    </PageShell>
  );
}
