import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseQuotationItemsFromBody } from "@/lib/quotation-items-parse";
import { computeQuotationTotals } from "@/lib/quotation-financials";
import { replaceQuotationItems } from "@/lib/replace-quotation-items";

type Ctx = { params: Promise<{ id: string }> };

const quotationProjectSelect = {
  id: true,
  name: true,
  totalSelling: true,
  qty: true,
  segments: {
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: {
      ahuModel: true,
      ahuRef: true,
      flowCMH: true,
    },
  },
} as const;

const fullInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      project: {
        select: quotationProjectSelect,
      },
    },
  },
  project: {
    select: quotationProjectSelect,
  },
} as const;

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const row = await prisma.quotation.findUnique({
      where: { id },
      include: fullInclude,
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load quotation" },
      { status: 500 }
    );
  }
}

function recalcTotalsFromItems(
  items: { totalPrice: number }[],
  discount: number,
  ppn: number,
  pphEnabled: boolean,
  pphRate: number
) {
  const lineTotals = items.map((it) => it.totalPrice);
  return computeQuotationTotals(lineTotals, discount, ppn, {
    pphEnabled,
    pphPercent: pphRate,
  });
}

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const existing = await prisma.quotation.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    /** Unchecked update avoids Prisma XOR issues (relational `project` vs scalar `projectId`). */
    const data: Prisma.QuotationUncheckedUpdateInput = {};

    if (body.status !== undefined) {
      data.status = String(body.status).trim().toLowerCase();
    }
    if (body.noSurat !== undefined) {
      data.noSurat =
        body.noSurat === null || body.noSurat === ""
          ? null
          : String(body.noSurat);
    }
    if (body.tanggal !== undefined) {
      if (body.tanggal === null || body.tanggal === "") {
        data.tanggal = new Date();
      } else {
        data.tanggal = new Date(String(body.tanggal));
      }
    }
    if (body.perihal !== undefined) {
      data.perihal =
        body.perihal === null || body.perihal === ""
          ? null
          : String(body.perihal);
    }
    if (body.ourRef !== undefined) {
      data.ourRef =
        body.ourRef === null || body.ourRef === ""
          ? null
          : String(body.ourRef);
    }
    if (body.yourRef !== undefined) {
      data.yourRef =
        body.yourRef === null || body.yourRef === ""
          ? null
          : String(body.yourRef);
    }
    if (body.clientName !== undefined) {
      data.clientName =
        body.clientName === null || body.clientName === ""
          ? null
          : String(body.clientName);
    }
    if (body.clientCompany !== undefined) {
      data.clientCompany =
        body.clientCompany === null || body.clientCompany === ""
          ? null
          : String(body.clientCompany);
    }
    if (body.clientAddress !== undefined) {
      data.clientAddress =
        body.clientAddress === null || body.clientAddress === ""
          ? null
          : String(body.clientAddress);
    }
    if (body.clientAttn !== undefined) {
      data.clientAttn =
        body.clientAttn === null || body.clientAttn === ""
          ? null
          : String(body.clientAttn);
    }
    if (body.clientPhone !== undefined) {
      data.clientPhone =
        body.clientPhone === null || body.clientPhone === ""
          ? null
          : String(body.clientPhone);
    }
    if (body.projectLocation !== undefined) {
      data.projectLocation =
        body.projectLocation === null || body.projectLocation === ""
          ? null
          : String(body.projectLocation);
    }
    if (body.discount !== undefined) {
      const d = Number(body.discount);
      data.discount = Number.isFinite(d) ? Math.max(0, d) : existing.discount;
    }
    if (body.discountEnabled !== undefined) {
      data.discountEnabled = Boolean(body.discountEnabled);
    }
    if (body.ppn !== undefined) {
      const p = Number(body.ppn);
      data.ppn = Number.isFinite(p) ? p : existing.ppn;
    }
    if (body.ppnEnabled !== undefined) {
      data.ppnEnabled = Boolean(body.ppnEnabled);
    }
    if (body.pphEnabled !== undefined) {
      data.pphEnabled = Boolean(body.pphEnabled);
    }
    if (body.pphRate !== undefined) {
      const r = Number(body.pphRate);
      data.pphRate = Number.isFinite(r) ? Math.max(0, r) : existing.pphRate;
    }
    if (body.paymentTerms !== undefined) {
      data.paymentTerms = String(body.paymentTerms);
    }
    if (body.deliveryTerms !== undefined) {
      data.deliveryTerms = String(body.deliveryTerms);
    }
    if (body.warrantyTerms !== undefined) {
      data.warrantyTerms = String(body.warrantyTerms);
    }
    if (body.validityDays !== undefined) {
      const v = Math.round(Number(body.validityDays));
      data.validityDays = Number.isFinite(v) ? Math.max(0, v) : existing.validityDays;
    }
    if (body.termsConditions !== undefined) {
      data.termsConditions =
        body.termsConditions === null || body.termsConditions === ""
          ? null
          : String(body.termsConditions);
    }
    if (body.introText !== undefined) {
      data.introText =
        body.introText === null || body.introText === ""
          ? null
          : String(body.introText);
    }
    if (body.notes !== undefined) {
      data.notes =
        body.notes === null || body.notes === "" ? null : String(body.notes);
    }
    if (body.ttdPrepared !== undefined) {
      data.ttdPrepared =
        body.ttdPrepared === null || body.ttdPrepared === ""
          ? null
          : String(body.ttdPrepared);
    }
    if (body.ttdReviewed !== undefined) {
      data.ttdReviewed =
        body.ttdReviewed === null || body.ttdReviewed === ""
          ? null
          : String(body.ttdReviewed);
    }
    if (body.ttdApproved !== undefined) {
      data.ttdApproved =
        body.ttdApproved === null || body.ttdApproved === ""
          ? null
          : String(body.ttdApproved);
    }
    if (body.stampPath !== undefined) {
      data.stampPath =
        body.stampPath === null || body.stampPath === ""
          ? null
          : String(body.stampPath);
    }

    if (Array.isArray(body.items)) {
      try {
        const parsed = parseQuotationItemsFromBody(body.items);
        await replaceQuotationItems(id, parsed);
      } catch (e) {
        if (
          e &&
          typeof e === "object" &&
          "code" in e &&
          (e as { code?: string }).code === "INVALID_PROJECT"
        ) {
          return NextResponse.json(
            { error: "Satu atau lebih proyek costing tidak ditemukan" },
            { status: 404 }
          );
        }
        throw e;
      }
    }

    const discountNext =
      data.discount !== undefined
        ? (data.discount as number)
        : existing.discount;
    const ppnNext = data.ppn !== undefined ? (data.ppn as number) : existing.ppn;
    const discountEnabledNext =
      data.discountEnabled !== undefined
        ? (data.discountEnabled as boolean)
        : (existing.discountEnabled ?? true);
    const ppnEnabledNext =
      data.ppnEnabled !== undefined
        ? (data.ppnEnabled as boolean)
        : (existing.ppnEnabled ?? true);
    const pphEnabledNext =
      data.pphEnabled !== undefined
        ? (data.pphEnabled as boolean)
        : existing.pphEnabled;
    const pphRateNext =
      data.pphRate !== undefined ? (data.pphRate as number) : existing.pphRate;

    const itemsRows = await prisma.quotationItem.findMany({
      where: { quotationId: id },
      orderBy: { sortOrder: "asc" },
    });

    const discountEff = discountEnabledNext ? discountNext : 0;
    const ppnEff = ppnEnabledNext ? ppnNext : 0;

    const totals = recalcTotalsFromItems(
      itemsRows,
      discountEff,
      ppnEff,
      pphEnabledNext,
      pphRateNext
    );

    data.totalBeforeDisc = totals.totalBeforeDisc;
    data.totalAfterDisc = totals.totalAfterDisc;
    data.totalPPN = totals.totalPPN;
    data.totalPPH = totals.totalPPH;
    data.grandTotal = totals.grandTotal;

    const firstPid = itemsRows[0]?.projectId;
    data.projectId = firstPid ?? null;

    await prisma.quotation.update({
      where: { id },
      data,
    });

    const refreshed = await prisma.quotation.findUnique({
      where: { id },
      include: fullInclude,
    });
    return NextResponse.json(refreshed);
  } catch (e: unknown) {
    console.error(e);
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to update quotation", message },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    await prisma.quotation.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    console.error(e);
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete quotation" },
      { status: 500 }
    );
  }
}
