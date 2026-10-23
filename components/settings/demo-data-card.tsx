"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toastStore";

type Mode = "sample" | "empty";

/** Demo organizations only: switch between sample data and an empty start. */
export function DemoDataCard() {
  const [isTrial, setIsTrial] = useState(false);
  const [busy, setBusy] = useState<Mode | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/trial", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { trial?: boolean; expired?: boolean } | null) => {
        if (!cancelled && j?.trial && !j.expired) setIsTrial(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isTrial) return null;

  const run = async (mode: Mode) => {
    const ok = await confirm(
      mode === "sample"
        ? {
            title: "Isi dengan data contoh?",
            description:
              "Semua proyek, penawaran, pelanggan, dan katalog saat ini diganti dengan data contoh setahun.",
            confirmLabel: "Isi data contoh",
            destructive: true,
          }
        : {
            title: "Kosongkan semua data?",
            description:
              "Semua proyek, penawaran, pelanggan, dan katalog dihapus untuk mulai dari nol. Tidak bisa dibatalkan.",
            confirmLabel: "Kosongkan",
            destructive: true,
          }
    );
    if (!ok) return;
    setBusy(mode);
    try {
      const res = await fetch("/api/demo/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal mengubah data demo");
      }
      toastSuccess(mode === "sample" ? "Data contoh terisi" : "Data dikosongkan");
      window.location.assign("/");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal mengubah data demo");
      setBusy(null);
    }
  };

  return (
    <Card size="sm" className="shadow-sm">
      <CardHeader>
        <CardTitle>Data demo</CardTitle>
        <CardDescription>
          Isi dengan data contoh, atau kosongkan untuk mulai dari awal.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void run("sample")}>
          {busy === "sample" ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : null}
          Isi data contoh
        </Button>
        <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void run("empty")}>
          {busy === "empty" ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : null}
          Kosongkan data
        </Button>
      </CardContent>
      {confirmDialog}
    </Card>
  );
}
