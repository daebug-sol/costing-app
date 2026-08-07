import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { generateInvoicePdf } from "@/lib/generators/invoicePdf";
import { prisma } from "@/lib/prisma";
import { requireInvoiceInOrg } from "@/lib/tenant-context";
import { getOrCreateSettings } from "@/lib/tenant-queries";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireInvoiceInOrg(id, orgId);
    if (!check.ok) return check.response;

    const [settings, inv] = await Promise.all([
      getOrCreateSettings(orgId),
      prisma.invoice.findFirst({
        where: { id, organizationId: orgId },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
    ]);

    if (!inv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const bytes = generateInvoicePdf({
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      companyPhone: settings.companyPhone,
      invNumber: inv.invNumber ?? "DRAFT",
      tanggal: inv.tanggal,
      dueDate: inv.dueDate,
      kind: inv.kind,
      clientName: inv.clientName ?? "",
      clientCompany: inv.clientCompany ?? "",
      clientAddress: inv.clientAddress ?? "",
      items: inv.items.map((it) => ({
        description: it.description,
        qty: it.qty,
        uom: it.uom,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
      subtotal: inv.subtotal,
      discountAmt: inv.discountAmt,
      dpp: inv.dpp,
      ppn: inv.ppn,
      pph: inv.pph,
      grandTotal: inv.grandTotal,
      notes: inv.notes,
    });

    const filename = inv.invNumber ?? `invoice-${inv.id.slice(0, 8)}`;
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal membuat PDF invoice" },
      { status: 500 }
    );
  }
}
