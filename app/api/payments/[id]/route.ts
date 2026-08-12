import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { invoiceStatusFromPaid } from "@/lib/o2c/invoice-totals";
import { PAYMENT_STATUS } from "@/lib/o2c/status";
import { prisma } from "@/lib/prisma";
import { requirePaymentInOrg } from "@/lib/tenant-context";
import { tenantWhere } from "@/lib/tenant-queries";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requirePaymentInOrg(id, orgId);
    if (!check.ok) return check.response;

    const row = await prisma.payment.findFirst({
      where: tenantWhere.payment(orgId, id),
      include: {
        customer: true,
        allocations: {
          include: {
            invoice: {
              select: {
                id: true,
                invNumber: true,
                grandTotal: true,
                paidTotal: true,
                status: true,
              },
            },
          },
        },
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal memuat pembayaran" },
      { status: 500 }
    );
  }
}

/** Void a payment and reverse invoice paidTotals. */
export async function PUT(request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "o2c:payment");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requirePaymentInOrg(id, orgId);
    if (!check.ok) return check.response;

    const body = (await request.json()) as { action?: string };
    if (body.action !== "void") {
      return NextResponse.json(
        { error: "Aksi tidak didukung" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: tenantWhere.payment(orgId, id),
      include: { allocations: true },
    });
    if (!payment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (payment.status === PAYMENT_STATUS.VOID) {
      return NextResponse.json(payment);
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const a of payment.allocations) {
        const inv = await tx.invoice.findUnique({ where: { id: a.invoiceId } });
        if (!inv) continue;
        const paidTotal = Math.max(
          0,
          Math.round((inv.paidTotal - a.amount) * 100) / 100
        );
        const status = invoiceStatusFromPaid(
          inv.grandTotal,
          paidTotal,
          inv.status === "void" ? "void" : "sent"
        );
        await tx.invoice.update({
          where: { id: inv.id },
          data: { paidTotal, status },
        });
      }
      return tx.payment.update({
        where: { id },
        data: { status: PAYMENT_STATUS.VOID },
        include: {
          allocations: true,
          customer: { select: { id: true, name: true, company: true } },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal void pembayaran" },
      { status: 500 }
    );
  }
}
