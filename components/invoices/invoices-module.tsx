"use client";

import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { invoiceStatusLabel } from "@/lib/o2c/status";
import { formatIDR } from "@/lib/utils/format";
import { toastError, toastSuccess } from "@/store/toastStore";

type InvRow = {
  id: string;
  invNumber: string | null;
  tanggal: string;
  dueDate: string | null;
  status: string;
  kind: string;
  grandTotal: number;
  paidTotal: number;
  customer: { name: string; company: string };
};

type InvDetail = InvRow & {
  notes: string | null;
  subtotal: number;
  discountAmt: number;
  dpp: number;
  ppn: number;
  pph: number;
  items: Array<{
    id: string;
    description: string;
    qty: number;
    uom: string;
    unitPrice: number;
    totalPrice: number;
  }>;
};

async function readErr(res: Response) {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

function isOverdue(inv: { dueDate: string | null; status: string; paidTotal: number; grandTotal: number }) {
  if (!inv.dueDate) return false;
  if (["paid", "void", "draft"].includes(inv.status)) return false;
  if (inv.paidTotal + 0.01 >= inv.grandTotal) return false;
  return new Date(inv.dueDate).getTime() < Date.now();
}

export function InvoicesModule() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  const [list, setList] = useState<InvRow[]>([]);
  const [detail, setDetail] = useState<InvDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const loadList = useCallback(async () => {
    const qs =
      statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : "";
    const r = await fetch(`/api/invoices${qs}`);
    if (!r.ok) throw new Error(await readErr(r));
    setList((await r.json()) as InvRow[]);
  }, [statusFilter]);

  const loadDetail = useCallback(async (id: string) => {
    const r = await fetch(`/api/invoices/${id}`);
    if (!r.ok) throw new Error(await readErr(r));
    const row = (await r.json()) as InvDetail;
    setDetail(row);
    setDueDate(row.dueDate ? row.dueDate.slice(0, 10) : "");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (idParam) await loadDetail(idParam);
        else {
          setDetail(null);
          await loadList();
        }
      } catch (e) {
        if (!cancelled) {
          toastError(e instanceof Error ? e.message : "Gagal memuat");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idParam, loadDetail, loadList]);

  const action = async (payload: Record<string, unknown>, okMsg: string) => {
    if (!detail) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/invoices/${detail.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await readErr(r));
      setDetail((await r.json()) as InvDetail);
      toastSuccess(okMsg);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (detail) {
    const overdue = isOverdue(detail);
    return (
      <PageShell
        width="wide"
        eyebrow="Order-to-Cash"
        title={detail.invNumber ?? "Invoice draft"}
        description={`${detail.customer.company || detail.customer.name} · ${invoiceStatusLabel(detail.status)}`}
        contentClassName="space-y-6"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/invoices")}
          >
            <ArrowLeft className="size-4" />
            Daftar
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={overdue ? "destructive" : "secondary"}>
            {overdue ? "Jatuh tempo" : invoiceStatusLabel(detail.status)}
          </Badge>
          <Badge variant="outline">{detail.kind.toUpperCase()}</Badge>
          <span className="tabular-money text-sm">{formatIDR(detail.grandTotal)}</span>
          <span className="text-sm text-muted-foreground">
            Dibayar {formatIDR(detail.paidTotal)}
          </span>
        </div>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Detail</CardTitle>
            <div className="flex flex-wrap gap-2">
              {detail.status === "draft" ? (
                <>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="due">Jatuh tempo</Label>
                    <Input
                      id="due"
                      type="date"
                      className="w-40"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void action(
                          { dueDate: dueDate || null },
                          "Jatuh tempo disimpan"
                        )
                      }
                    >
                      Simpan
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => void action({ action: "send" }, "Invoice dikirim")}
                  >
                    Kirim (terbitkan nomor)
                  </Button>
                </>
              ) : null}
              {detail.status !== "void" && detail.paidTotal <= 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() =>
                    void action(
                      { action: "void", voidReason: "Dibatalkan pengguna" },
                      "Invoice di-void"
                    )
                  }
                >
                  Void
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  window.open(`/api/invoices/${detail.id}/pdf`, "_blank")
                }
              >
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uraian</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.description}</TableCell>
                    <TableCell>
                      {it.qty} {it.uom}
                    </TableCell>
                    <TableCell className="text-right tabular-money">
                      {formatIDR(it.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-money">
                      {formatIDR(it.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-money">{formatIDR(detail.subtotal)}</span>
              </div>
              {detail.discountAmt > 0 ? (
                <div className="flex justify-between">
                  <span>Diskon</span>
                  <span className="tabular-money">
                    -{formatIDR(detail.discountAmt)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span>DPP</span>
                <span className="tabular-money">{formatIDR(detail.dpp)}</span>
              </div>
              <div className="flex justify-between">
                <span>PPN</span>
                <span className="tabular-money">{formatIDR(detail.ppn)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Grand total</span>
                <span className="tabular-money">{formatIDR(detail.grandTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      width="wide"
      eyebrow="Order-to-Cash"
      title="Invoice"
      description="Tagihan pelanggan — status, jatuh tempo, dan PDF"
      contentClassName="space-y-4"
    >
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Terkirim</SelectItem>
            <SelectItem value="partially_paid">Sebagian dibayar</SelectItem>
            <SelectItem value="paid">Lunas</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada invoice"
          description="Buat invoice dari detail Sales Order."
        />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Jatuh tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/invoices?id=${row.id}`)}
                  >
                    <TableCell className="font-medium">
                      {row.invNumber ?? "Draft"}
                    </TableCell>
                    <TableCell>
                      {row.customer.company || row.customer.name}
                    </TableCell>
                    <TableCell>
                      {row.dueDate
                        ? new Date(row.dueDate).toLocaleDateString("id-ID")
                        : "—"}
                      {isOverdue(row) ? (
                        <Badge variant="destructive" className="ml-2">
                          Overdue
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{invoiceStatusLabel(row.status)}</TableCell>
                    <TableCell className="text-right tabular-money">
                      {formatIDR(row.grandTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
