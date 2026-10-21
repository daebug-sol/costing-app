"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type DemoRequestRow = {
  id: string;
  email: string;
  name: string;
  company: string;
  phone: string;
  createdAt: string;
};

type CodeRow = {
  id: string;
  email: string;
  trialDays: number;
  expiresAt: string;
  redeemedAt: string | null;
};

type Created = { code: string; emailed: boolean; email: string };

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID");
}

export function DemoPanel() {
  const [requests, setRequests] = useState<DemoRequestRow[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [email, setEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetch("/api/operator/demo-requests", { cache: "no-store" }),
        fetch("/api/operator/activation-codes", { cache: "no-store" }),
      ]);
      if (a.ok) setRequests(((await a.json()) as { requests: DemoRequestRow[] }).requests);
      if (b.ok) setCodes(((await b.json()) as { codes: CodeRow[] }).codes);
    } catch {
      /* the org table shows the load error */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (target: string) => {
    setBusy(true);
    setCreated(null);
    setCopied(false);
    try {
      const res = await fetch("/api/operator/activation-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, sendEmail }),
      });
      const j = (await res.json()) as { code?: string; emailed?: boolean; error?: string };
      if (!res.ok || !j.code) throw new Error(j.error ?? "Gagal membuat kode");
      setCreated({ code: j.code, emailed: j.emailed === true, email: target });
      setEmail("");
      toastSuccess("Kode dibuat");
      void load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal membuat kode");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.code);
      setCopied(true);
    } catch {
      toastError("Tidak bisa menyalin. Salin manual.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo klien</CardTitle>
        <CardDescription>
          Buat kode aktivasi untuk email akun klien. Kode hanya tampil sekali.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) void create(email.trim());
          }}
        >
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="demo-code-email">Email akun klien</Label>
            <Input
              id="demo-code-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="klien@perusahaan.com"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="demo-send-email"
              checked={sendEmail}
              onCheckedChange={(v) => setSendEmail(v === true)}
            />
            <Label htmlFor="demo-send-email">Kirim lewat email</Label>
          </div>
          <Button type="submit" disabled={busy || !email.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : null}
            Buat kode
          </Button>
        </form>

        {created ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted p-3">
            <span className="font-mono text-base font-semibold">{created.code}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Tersalin" : "Salin"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Untuk {created.email}.{" "}
              {created.emailed
                ? "Email terkirim."
                : "Email tidak terkirim, kirim kode secara manual."}
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Permintaan demo ({requests.length})</h3>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada permintaan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium whitespace-normal">{r.company}</TableCell>
                    <TableCell className="whitespace-normal">
                      {r.name}
                      {r.phone ? ` · ${r.phone}` : ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.email}</TableCell>
                    <TableCell className="text-muted-foreground">{dateLabel(r.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => void create(r.email)}
                      >
                        Buat kode
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {codes.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Kode terbaru</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Masa demo</TableHead>
                  <TableHead>Berlaku s/d</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.trialDays} hari</TableCell>
                    <TableCell className="text-muted-foreground">{dateLabel(c.expiresAt)}</TableCell>
                    <TableCell>
                      {c.redeemedAt
                        ? `Dipakai ${dateLabel(c.redeemedAt)}`
                        : new Date(c.expiresAt) < new Date()
                          ? "Kedaluwarsa"
                          : "Belum dipakai"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
