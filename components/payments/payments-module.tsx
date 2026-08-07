"use client";

import { Loader2, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
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
import { formatIDR } from "@/lib/utils/format";
import { toastError, toastSuccess } from "@/store/toastStore";

type Customer = { id: string; name: string; company: string };
type OpenInv = {
  id: string;
  invNumber: string | null;
  grandTotal: number;
  paidTotal: number;
  dueDate: string | null;
  status: string;
};
type PaymentRow = {
  id: string;
  payNumber: string;
  tanggal: string;
  amount: number;
  method: string;
  status: string;
  customer: Customer;
  allocations: Array<{ amount: number; invoice: { invNumber: string | null } }>;
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

export function PaymentsModule() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInv[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("transfer");
  const [reference, setReference] = useState("");
  const [alloc, setAlloc] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/payments"),
      ]);
      if (!cRes.ok) throw new Error(await readErr(cRes));
      if (!pRes.ok) throw new Error(await readErr(pRes));
      setCustomers((await cRes.json()) as Customer[]);
      setPayments((await pRes.json()) as PaymentRow[]);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!customerId) {
      setOpenInvoices([]);
      return;
    }
    void (async () => {
      const r = await fetch(`/api/invoices?status=sent`);
      if (!r.ok) return;
      const all = (await r.json()) as Array<OpenInv & { customer: Customer }>;
      const r2 = await fetch(`/api/invoices?status=partially_paid`);
      const partial = r2.ok
        ? ((await r2.json()) as Array<OpenInv & { customer: Customer }>)
        : [];
      const rows = [...all, ...partial].filter((i) => {
        // customer id is nested — list API includes customer object
        const cid = (i as unknown as { customerId?: string; customer?: { id: string } })
          .customerId ??
          (i as unknown as { customer?: { id: string } }).customer?.id;
        return cid === customerId;
      });
      setOpenInvoices(rows);
      const init: Record<string, string> = {};
      for (const inv of rows) {
        init[inv.id] = "";
      }
      setAlloc(init);
    })();
  }, [customerId]);

  const openBalance = useMemo(
    () =>
      openInvoices.reduce(
        (s, i) => s + Math.max(0, i.grandTotal - i.paidTotal),
        0
      ),
    [openInvoices]
  );

  const submit = async (useFifo: boolean) => {
    const amt = Number(amount);
    if (!customerId || !Number.isFinite(amt) || amt <= 0) {
      toastError("Pilih pelanggan dan isi jumlah");
      return;
    }
    setBusy(true);
    try {
      const allocations = useFifo
        ? undefined
        : Object.entries(alloc)
            .map(([invoiceId, v]) => ({
              invoiceId,
              amount: Number(v),
            }))
            .filter((a) => Number.isFinite(a.amount) && a.amount > 0);

      const r = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          amount: amt,
          method,
          reference: reference || null,
          fifo: useFifo,
          allocations,
        }),
      });
      if (!r.ok) throw new Error(await readErr(r));
      toastSuccess("Pembayaran dicatat");
      setAmount("");
      setReference("");
      await load();
      // refresh open invoices
      setCustomerId((c) => c);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };

  const voidPayment = async (id: string) => {
    if (!confirm("Void pembayaran ini? Alokasi invoice akan dibalik.")) return;
    try {
      const r = await fetch(`/api/payments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void" }),
      });
      if (!r.ok) throw new Error(await readErr(r));
      toastSuccess("Pembayaran di-void");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal void");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <PageShell
      width="wide"
      eyebrow="Order-to-Cash"
      title="Pembayaran"
      description="Penerimaan kas dan alokasi ke invoice terbuka"
      contentClassName="space-y-6"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Penerimaan baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Pelanggan</Label>
              <Select value={customerId || "__none__"} onValueChange={(v) => setCustomerId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pelanggan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` · ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="amt">Jumlah</Label>
                <Input
                  id="amt"
                  type="number"
                  className="tabular-nums"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Metode</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="giro">Giro</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref">Referensi</Label>
              <Input
                id="ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="No. transfer / bukti"
              />
            </div>

            {customerId ? (
              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Invoice terbuka · sisa {formatIDR(openBalance)}
                </p>
                {openInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Tidak ada invoice terbuka (kirim invoice dulu).
                  </p>
                ) : (
                  openInvoices.map((inv) => {
                    const open = Math.max(0, inv.grandTotal - inv.paidTotal);
                    return (
                      <div
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          {inv.invNumber ?? "—"} · sisa {formatIDR(open)}
                        </span>
                        <Input
                          className="w-32"
                          type="number"
                          placeholder="Alokasi"
                          value={alloc[inv.id] ?? ""}
                          onChange={(e) =>
                            setAlloc((m) => ({
                              ...m,
                              [inv.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                disabled={busy}
                onClick={() => void submit(true)}
              >
                Simpan (FIFO)
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void submit(false)}
              >
                Simpan (alokasi manual)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Belum ada pembayaran"
                description="Catat penerimaan dari formulir di samping."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.payNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(p.tanggal).toLocaleDateString("id-ID")} ·{" "}
                          {p.status}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.customer.company || p.customer.name}
                      </TableCell>
                      <TableCell className="text-right tabular-money">
                        {formatIDR(p.amount)}
                      </TableCell>
                      <TableCell>
                        {p.status === "posted" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void voidPayment(p.id)}
                          >
                            Void
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
