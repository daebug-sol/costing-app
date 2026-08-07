"use client";

import { ArrowLeft, ClipboardList, FileText, Loader2, Truck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { soStatusLabel } from "@/lib/o2c/status";
import { remainingQty } from "@/lib/o2c/so-status";
import { formatIDR } from "@/lib/utils/format";
import { toastError, toastSuccess } from "@/store/toastStore";

type SoListRow = {
  id: string;
  soNumber: string;
  tanggal: string;
  status: string;
  grandTotal: number;
  customer: { name: string; company: string };
};

type SoDetail = SoListRow & {
  poNumber: string | null;
  paymentTerms: string | null;
  notes: string | null;
  clientAddress: string | null;
  items: Array<{
    id: string;
    description: string;
    qty: number;
    uom: string;
    unitPrice: number;
    totalPrice: number;
    deliveredQty: number;
  }>;
  deliveries: Array<{
    id: string;
    doNumber: string;
    tanggal: string;
    status: string;
  }>;
  invoices: Array<{
    id: string;
    invNumber: string | null;
    status: string;
    grandTotal: number;
    kind: string;
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

export function SalesOrdersModule() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  const [list, setList] = useState<SoListRow[]>([]);
  const [detail, setDetail] = useState<SoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [deliverQty, setDeliverQty] = useState<Record<string, string>>({});

  const loadList = useCallback(async () => {
    const qs =
      statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : "";
    const r = await fetch(`/api/sales-orders${qs}`);
    if (!r.ok) throw new Error(await readErr(r));
    setList((await r.json()) as SoListRow[]);
  }, [statusFilter]);

  const loadDetail = useCallback(async (id: string) => {
    const r = await fetch(`/api/sales-orders/${id}`);
    if (!r.ok) throw new Error(await readErr(r));
    const row = (await r.json()) as SoDetail;
    setDetail(row);
    const init: Record<string, string> = {};
    for (const it of row.items) {
      const rem = remainingQty(it.qty, it.deliveredQty);
      init[it.id] = rem > 0 ? String(rem) : "";
    }
    setDeliverQty(init);
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

  const openAmountHint = useMemo(() => {
    if (!detail) return 0;
    return detail.items.reduce(
      (s, it) => s + remainingQty(it.qty, it.deliveredQty),
      0
    );
  }, [detail]);

  const createDelivery = async () => {
    if (!detail) return;
    const items = detail.items
      .map((it) => ({
        soItemId: it.id,
        qtyDelivered: Number(deliverQty[it.id]),
      }))
      .filter((it) => Number.isFinite(it.qtyDelivered) && it.qtyDelivered > 0);
    if (items.length === 0) {
      toastError("Isi qty kirim untuk minimal satu item");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/sales-orders/${detail.id}/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: detail.clientAddress,
          items,
        }),
      });
      if (!r.ok) throw new Error(await readErr(r));
      const created = (await r.json()) as { id: string; doNumber: string };
      toastSuccess(`Surat jalan ${created.doNumber} dibuat`);
      await loadDetail(detail.id);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal membuat SJ");
    } finally {
      setBusy(false);
    }
  };

  const createInvoice = async (kind: "dp" | "final") => {
    if (!detail) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        salesOrderId: detail.id,
        kind,
      };
      if (kind === "dp") body.dpPercent = 50;
      const r = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await readErr(r));
      const inv = (await r.json()) as { id: string };
      toastSuccess("Invoice draft dibuat");
      router.push(`/invoices?id=${inv.id}`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal membuat invoice");
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
    return (
      <PageShell
        width="wide"
        eyebrow="Order-to-Cash"
        title={detail.soNumber}
        description={`${detail.customer.company || detail.customer.name} · ${soStatusLabel(detail.status)}`}
        contentClassName="space-y-6"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/sales-orders")}
          >
            <ArrowLeft className="size-4" />
            Daftar
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{soStatusLabel(detail.status)}</Badge>
          <span className="text-sm text-muted-foreground tabular-money">
            {formatIDR(detail.grandTotal)}
          </span>
          {detail.poNumber ? (
            <span className="text-sm text-muted-foreground">PO {detail.poNumber}</span>
          ) : null}
        </div>

        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Item</TabsTrigger>
            <TabsTrigger value="deliveries">Pengiriman</TabsTrigger>
            <TabsTrigger value="invoices">Invoice</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Uraian</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Terkirim</TableHead>
                      <TableHead>Sisa</TableHead>
                      <TableHead>Kirim</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((it) => {
                      const rem = remainingQty(it.qty, it.deliveredQty);
                      return (
                        <TableRow key={it.id}>
                          <TableCell>{it.description}</TableCell>
                          <TableCell>
                            {it.qty} {it.uom}
                          </TableCell>
                          <TableCell>{it.deliveredQty}</TableCell>
                          <TableCell>{rem}</TableCell>
                          <TableCell>
                            <Input
                              className="w-24"
                              type="number"
                              min={0}
                              max={rem}
                              value={deliverQty[it.id] ?? ""}
                              disabled={rem <= 0}
                              onChange={(e) =>
                                setDeliverQty((m) => ({
                                  ...m,
                                  [it.id]: e.target.value,
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right tabular-money">
                            {formatIDR(it.totalPrice)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || openAmountHint <= 0}
                onClick={() => void createDelivery()}
              >
                Buat surat jalan
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void createInvoice("dp")}
              >
                Invoice DP 50%
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void createInvoice("final")}
              >
                Invoice final
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="deliveries">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Surat jalan</CardTitle>
              </CardHeader>
              <CardContent>
                {detail.deliveries.length === 0 ? (
                  <EmptyState
                    icon={Truck}
                    title="Belum ada pengiriman"
                    description="Buat surat jalan dari tab Item."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nomor</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.deliveries.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.doNumber}</TableCell>
                          <TableCell>
                            {new Date(d.tanggal).toLocaleDateString("id-ID")}
                          </TableCell>
                          <TableCell>{d.status}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                window.open(
                                  `/api/delivery-orders/${d.id}/pdf`,
                                  "_blank"
                                );
                              }}
                            >
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice terkait</CardTitle>
              </CardHeader>
              <CardContent>
                {detail.invoices.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="Belum ada invoice"
                    description="Buat invoice DP atau final dari tab Item."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nomor</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.invoices.map((inv) => (
                        <TableRow
                          key={inv.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/invoices?id=${inv.id}`)}
                        >
                          <TableCell>{inv.invNumber ?? "Draft"}</TableCell>
                          <TableCell>{inv.kind}</TableCell>
                          <TableCell>{inv.status}</TableCell>
                          <TableCell className="text-right tabular-money">
                            {formatIDR(inv.grandTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageShell>
    );
  }

  return (
    <PageShell
      width="wide"
      eyebrow="Order-to-Cash"
      title="Sales Order"
      description="Pesanan dari quotation yang menang — pengiriman dan invoice"
      contentClassName="space-y-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="open">Terbuka</SelectItem>
              <SelectItem value="partially_delivered">Sebagian dikirim</SelectItem>
              <SelectItem value="delivered">Terkirim</SelectItem>
              <SelectItem value="closed">Ditutup</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada sales order"
          description="Konversi quotation menang dari halaman Documentation."
        />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/sales-orders?id=${row.id}`)}
                  >
                    <TableCell className="font-medium">{row.soNumber}</TableCell>
                    <TableCell>
                      {row.customer.company || row.customer.name}
                    </TableCell>
                    <TableCell>
                      {new Date(row.tanggal).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>{soStatusLabel(row.status)}</TableCell>
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
