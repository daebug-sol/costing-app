import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { nextDocumentNumber } from "@/lib/doc-numbering";
import { invoiceStatusFromPaid } from "@/lib/o2c/invoice-totals";
import {
  fifoAllocate,
  validateAllocations,
  type OpenInvoice,
} from "@/lib/o2c/payment-allocation";
import { DOC_TYPES, INVOICE_STATUS, PAYMENT_STATUS } from "@/lib/o2c/status";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "@/lib/tenant-queries";

export async function GET(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    const rows = await prisma.payment.findMany({
      where: {
        ...tenantWhere.payments(orgId),
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { tanggal: "desc" },
      include: {
        customer: { select: { id: true, name: true, company: true } },
        allocations: {
          include: {
            invoice: {
              select: { id: true, invNumber: true, grandTotal: true },
            },
          },
        },
      },
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal memuat pembayaran" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "o2c:payment");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const body = (await request.json()) as {
      customerId?: string;
      amount?: number;
      tanggal?: string;
      method?: string;
      reference?: string;
      notes?: string;
      allocations?: Array<{ invoiceId: string; amount: number }>;
      fifo?: boolean;
    };

    const customerId = String(body.customerId ?? "").trim();
    const amount = Number(body.amount);
    if (!customerId) {
      return NextResponse.json(
        { error: "customerId wajib" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Jumlah pembayaran harus lebih dari 0" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: orgId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Pelanggan tidak ditemukan" },
        { status: 404 }
      );
    }

    const openInvoices = (await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        customerId,
        status: {
          in: [
            INVOICE_STATUS.SENT,
            INVOICE_STATUS.PARTIALLY_PAID,
          ],
        },
      },
      select: {
        id: true,
        grandTotal: true,
        paidTotal: true,
        dueDate: true,
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    })) as OpenInvoice[];

    let allocations =
      body.allocations?.map((a) => ({
        invoiceId: String(a.invoiceId),
        amount: Number(a.amount),
      })) ?? [];

    if (allocations.length === 0 || body.fifo) {
      allocations = fifoAllocate(openInvoices, amount);
    }

    const validation = validateAllocations(amount, openInvoices, allocations);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const payNumber = await nextDocumentNumber(DOC_TYPES.PAY, orgId, tx);
      const paymentId = randomUUID();

      const payment = await tx.payment.create({
        data: {
          id: paymentId,
          organizationId: orgId,
          payNumber,
          customerId,
          tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
          method: (body.method ?? "transfer").trim() || "transfer",
          reference: body.reference?.trim() || null,
          amount,
          status: PAYMENT_STATUS.POSTED,
          notes: body.notes?.trim() || null,
          allocations: {
            create: allocations.map((a) => ({
              id: randomUUID(),
              invoiceId: a.invoiceId,
              amount: a.amount,
            })),
          },
        },
        include: {
          allocations: true,
          customer: { select: { id: true, name: true, company: true } },
        },
      });

      for (const a of allocations) {
        const inv = await tx.invoice.findUnique({ where: { id: a.invoiceId } });
        if (!inv) continue;
        const paidTotal = Math.round((inv.paidTotal + a.amount) * 100) / 100;
        const status = invoiceStatusFromPaid(inv.grandTotal, paidTotal, inv.status);
        await tx.invoice.update({
          where: { id: inv.id },
          data: { paidTotal, status },
        });
      }

      return payment;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal mencatat pembayaran" },
      { status: 500 }
    );
  }
}
