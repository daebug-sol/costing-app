import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { computeQuotationTotals } from "@/lib/quotation-financials";
import { getOrCreateSettings, tenantWhere } from "@/lib/tenant-queries";

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

/** Same shape as POST response (draft quotation, often no linked header project). */
const quotationPostInclude = {
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

const listInclude = {
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

/** O2C chain for Documentation progress folders (`?view=documents`). */
const documentsInclude = {
  customer: {
    select: { id: true, name: true, company: true },
  },
  convertedSo: {
    select: {
      id: true,
      soNumber: true,
      status: true,
      grandTotal: true,
      deliveries: {
        select: { id: true, doNumber: true, status: true },
      },
      invoices: {
        select: {
          id: true,
          invNumber: true,
          status: true,
          grandTotal: true,
          paidTotal: true,
          dueDate: true,
        },
      },
    },
  },
} as const;

export async function GET(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const view = new URL(request.url).searchParams.get("view");
    const include =
      view === "documents" ? documentsInclude : listInclude;

    const rows = await prisma.quotation.findMany({
      where: tenantWhere.quotations(orgId),
      orderBy: { updatedAt: "desc" },
      include,
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to list quotations" },
      { status: 500 }
    );
  }
}

export async function POST() {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const settings = await getOrCreateSettings(orgId);
    const ppnRate =
      typeof settings.ppnRate === "number" && Number.isFinite(settings.ppnRate)
        ? settings.ppnRate
        : 11;
    const validityDays =
      typeof settings.validityDays === "number" &&
      Number.isFinite(settings.validityDays)
        ? settings.validityDays
        : 14;
    const totals = computeQuotationTotals([], 0, ppnRate, {
      pphEnabled: false,
      pphPercent: 0,
    });

    const paymentTerms = settings.paymentTerms ?? "DP 50%, balance CBD";
    const deliveryTerms = settings.deliveryTerms ?? "Ex-work Cikarang";
    const warrantyTerms = settings.warrantyTerms ?? "12 months since delivery";
    const termsConditions = settings.termsConditions ?? "";

    const quotation = await prisma.quotation.create({
      data: {
        id: randomUUID(),
        organizationId: orgId,
        status: "draft",
        tanggal: new Date(),
        perihal: "Penawaran Harga AHU",
        discount: 0,
        discountEnabled: true,
        ppn: ppnRate,
        ppnEnabled: true,
        pphEnabled: false,
        pphRate: 0,
        totalBeforeDisc: totals.totalBeforeDisc,
        totalAfterDisc: totals.totalAfterDisc,
        totalPPN: totals.totalPPN,
        totalPPH: totals.totalPPH,
        grandTotal: totals.grandTotal,
        paymentTerms,
        deliveryTerms,
        warrantyTerms,
        validityDays,
        termsConditions,
      },
      include: quotationPostInclude,
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to create quotation", message },
      { status: 500 }
    );
  }
}
