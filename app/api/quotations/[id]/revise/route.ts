import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { QUOTATION_STATUS } from "@/lib/o2c/status";
import { requireQuotationInOrg } from "@/lib/tenant-context";

type Ctx = { params: Promise<{ id: string }> };

/** Duplicate quotation as a new revision (draft); mark source superseded. */
export async function POST(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireQuotationInOrg(id, orgId);
    if (!check.ok) return check.response;

    const source = await prisma.quotation.findFirst({
      where: { id, organizationId: orgId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!source) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (source.status === QUOTATION_STATUS.SUPERSEDED) {
      return NextResponse.json(
        { error: "Quotation ini sudah digantikan" },
        { status: 400 }
      );
    }

    const newId = randomUUID();
    const revision = source.revision + 1;

    const created = await prisma.$transaction(async (tx) => {
      await tx.quotation.update({
        where: { id: source.id },
        data: { status: QUOTATION_STATUS.SUPERSEDED },
      });

      return tx.quotation.create({
        data: {
          id: newId,
          organizationId: orgId,
          projectId: source.projectId,
          customerId: source.customerId,
          status: QUOTATION_STATUS.DRAFT,
          noSurat: null,
          tanggal: new Date(),
          perihal: source.perihal,
          clientName: source.clientName,
          clientCompany: source.clientCompany,
          salesman: source.salesman,
          clientAddress: source.clientAddress,
          clientAttn: source.clientAttn,
          clientPhone: source.clientPhone,
          projectLocation: source.projectLocation,
          ourRef: source.ourRef,
          yourRef: source.yourRef,
          discount: source.discount,
          discountEnabled: source.discountEnabled,
          ppn: source.ppn,
          ppnEnabled: source.ppnEnabled,
          pphEnabled: source.pphEnabled,
          pphRate: source.pphRate,
          totalBeforeDisc: source.totalBeforeDisc,
          totalAfterDisc: source.totalAfterDisc,
          totalPPN: source.totalPPN,
          totalPPH: source.totalPPH,
          grandTotal: source.grandTotal,
          paymentTerms: source.paymentTerms,
          deliveryTerms: source.deliveryTerms,
          warrantyTerms: source.warrantyTerms,
          validityDays: source.validityDays,
          termsConditions: source.termsConditions,
          introText: source.introText,
          notes: source.notes,
          ttdPrepared: source.ttdPrepared,
          ttdReviewed: source.ttdReviewed,
          ttdApproved: source.ttdApproved,
          stampPath: source.stampPath,
          revision,
          revisionOfId: source.id,
          items: {
            create: source.items.map((it, idx) => ({
              id: randomUUID(),
              projectId: it.projectId,
              sortOrder: it.sortOrder ?? idx,
              description: it.description,
              spec: it.spec,
              qty: it.qty,
              uom: it.uom,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice,
            })),
          },
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal membuat revisi quotation" },
      { status: 500 }
    );
  }
}
