import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeQuotationTotals } from "@/lib/quotation-financials";

function isSqliteBusyError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /locked|SQLITE_BUSY|busy/i.test(msg);
}

async function withSqliteRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i < attempts - 1 && isSqliteBusyError(e)) {
        await new Promise((r) => setTimeout(r, 50 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error("withSqliteRetry: exhausted retries");
}

async function getOrCreateSettings() {
  let settings = await prisma.appSettings.findUnique({
    where: { id: "default" },
  });
  if (!settings) {
    settings = await prisma.appSettings.findFirst();
  }
  if (!settings) {
    settings = await prisma.appSettings.create({
      data: { id: "default", companyName: "PT Thermal True Indonesia" },
    });
  }
  return settings;
}

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

export async function GET() {
  try {
    const rows = await prisma.quotation.findMany({
      orderBy: { updatedAt: "desc" },
      include: listInclude,
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
  try {
    const settings = await getOrCreateSettings();
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

    const quotation = await withSqliteRetry(async () => {
      const newId = randomUUID();
      const tanggal = new Date();
      await prisma.$executeRaw`
        INSERT INTO "Quotation" (
          "id", "projectId", "status", "tanggal", "perihal",
          "discount", "discountEnabled", "ppn", "ppnEnabled", "pphEnabled", "pphRate",
          "totalBeforeDisc", "totalAfterDisc", "totalPPN", "totalPPH", "grandTotal",
          "paymentTerms", "deliveryTerms", "warrantyTerms", "validityDays", "termsConditions",
          "createdAt", "updatedAt"
        ) VALUES (
          ${newId},
          NULL,
          ${"draft"},
          ${tanggal},
          ${"Penawaran Harga AHU"},
          ${0},
          ${true},
          ${ppnRate},
          ${true},
          ${false},
          ${0},
          ${totals.totalBeforeDisc},
          ${totals.totalAfterDisc},
          ${totals.totalPPN},
          ${totals.totalPPH},
          ${totals.grandTotal},
          ${paymentTerms},
          ${deliveryTerms},
          ${warrantyTerms},
          ${validityDays},
          ${termsConditions},
          ${tanggal},
          ${tanggal}
        )
      `;
      return prisma.quotation.findUniqueOrThrow({
        where: { id: newId },
        include: quotationPostInclude,
      });
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
