import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { generateDeliveryOrderPdf } from "@/lib/generators/deliveryOrderPdf";
import { prisma } from "@/lib/prisma";
import { requireDeliveryOrderInOrg } from "@/lib/tenant-context";
import { getOrCreateSettings } from "@/lib/tenant-queries";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireDeliveryOrderInOrg(id, orgId);
    if (!check.ok) return check.response;

    const [settings, dorder] = await Promise.all([
      getOrCreateSettings(orgId),
      prisma.deliveryOrder.findFirst({
        where: { id, organizationId: orgId },
        include: {
          items: { include: { soItem: true } },
          salesOrder: true,
        },
      }),
    ]);

    if (!dorder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const bytes = generateDeliveryOrderPdf({
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      companyPhone: settings.companyPhone,
      doNumber: dorder.doNumber,
      tanggal: dorder.tanggal,
      soNumber: dorder.salesOrder.soNumber,
      clientName: dorder.salesOrder.clientName ?? "",
      clientCompany: dorder.salesOrder.clientCompany ?? "",
      clientAddress: dorder.salesOrder.clientAddress ?? "",
      shippingAddress: dorder.shippingAddress ?? "",
      items: dorder.items.map((it) => ({
        description: it.soItem.description,
        qty: it.qtyDelivered,
        uom: it.soItem.uom,
      })),
      notes: dorder.notes,
    });

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${dorder.doNumber}.pdf"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal membuat PDF surat jalan" },
      { status: 500 }
    );
  }
}
