"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChartInsightBlock } from "@/components/dashboard/chart-insight-block";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canSeeNavHref } from "@/lib/permissions";
import { useCostingStore } from "@/store/costingStore";

type ClientRow = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string | null;
};

const PREVIEW_ROWS = 5;

function ClientTable({
  rows,
  showEmail = false,
}: {
  rows: ClientRow[];
  showEmail?: boolean;
}) {
  return (
    <div className="rounded-none border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Perusahaan</TableHead>
            <TableHead>Telepon</TableHead>
            {showEmail ? <TableHead>Email</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="max-w-[12rem] truncate font-medium">
                {c.name}
              </TableCell>
              <TableCell className="max-w-[12rem] truncate">
                {c.company || "—"}
              </TableCell>
              <TableCell>{c.phone || "—"}</TableCell>
              {showEmail ? (
                <TableCell className="max-w-[14rem] truncate">
                  {c.email || "—"}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ClientListWidget() {
  const router = useRouter();
  const role = useCostingStore((s) => s.role);
  const permissions = useCostingStore((s) => s.permissions);
  const allowed = canSeeNavHref("/customers", role, permissions);

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/customers", { signal });
        if (!r.ok) throw new Error("Gagal memuat pelanggan");
        setRows((await r.json()) as ClientRow[]);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Gagal memuat pelanggan");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [allowed, load]);

  if (!allowed) return null;

  const visibleRows = rows.slice(0, PREVIEW_ROWS);
  const hiddenCount = Math.max(0, rows.length - PREVIEW_ROWS);

  return (
    <section aria-label="Daftar pelanggan" data-testid="dashboard-clients">
      <ChartInsightBlock
        title="Pelanggan"
        loading={loading}
        detailTitle="Daftar pelanggan"
        detailDescription="Daftar lengkap pelanggan beserta kontak."
        detailContent={<ClientTable rows={rows} showEmail />}
      >
        {error ? (
          <EmptyState
            icon={Users}
            title="Gagal memuat pelanggan"
            description={error}
            actionLabel="Coba lagi"
            onAction={() => void load(new AbortController().signal)}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Belum ada pelanggan"
            description="Tambahkan pelanggan untuk dipakai di penawaran, sales order, dan invoice."
            actionLabel="Kelola pelanggan"
            onAction={() => router.push("/customers")}
          />
        ) : (
          <div className="space-y-3">
            <ClientTable rows={visibleRows} />
            {hiddenCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                +{hiddenCount} lainnya — buka &quot;Lihat detail&quot; untuk daftar lengkap.
              </p>
            ) : null}
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/customers">Kelola pelanggan</Link>
            </Button>
          </div>
        )}
      </ChartInsightBlock>
    </section>
  );
}
