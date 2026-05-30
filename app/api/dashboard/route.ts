import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDashboardAnalyticsPayload } from "@/lib/dashboard-analytics";
import { EMPTY_DASHBOARD_RESPONSE, type DashboardRange } from "@/lib/dashboard-contract";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get("projectId");
    const selectedProjectId = projectIdParam && projectIdParam.trim() ? projectIdParam.trim() : null;
    const rangeParam = searchParams.get("range");
    const range: DashboardRange =
      rangeParam === "mtd" || rangeParam === "ytd" || rangeParam === "12m" || rangeParam === "all"
        ? rangeParam
        : "all";

    const [projects, quotations, settings] = await Promise.all([
      prisma.costingProject.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          qty: true,
          totalHPP: true,
          totalSelling: true,
          overhead: true,
          contingency: true,
          eskalasi: true,
          asuransi: true,
          mobilisasi: true,
          margin: true,
          updatedAt: true,
          segments: {
            select: {
              id: true,
              type: true,
              title: true,
              subtotal: true,
              sections: {
                select: {
                  category: true,
                  subtotal: true,
                  lineItems: {
                    select: {
                      description: true,
                      subtotal: true,
                    },
                  },
                },
              },
              manualGroups: {
                select: {
                  name: true,
                  subtotal: true,
                  items: {
                    select: {
                      name: true,
                      category: true,
                      subtotal: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.quotation.findMany({
        orderBy: { tanggal: "asc" },
        select: {
          id: true,
          status: true,
          salesman: true,
          tanggal: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          clientName: true,
          clientCompany: true,
          validityDays: true,
          discount: true,
          discountEnabled: true,
          totalBeforeDisc: true,
          totalAfterDisc: true,
          totalPPN: true,
          totalPPH: true,
          grandTotal: true,
          paymentTerms: true,
          project: {
            select: {
              id: true,
              name: true,
              totalHPP: true,
              totalSelling: true,
            },
          },
        },
      }),
      prisma.appSettings.findUnique({
        where: { id: "default" },
        select: { paymentTerms: true },
      }),
    ]);

    const payload = buildDashboardAnalyticsPayload({
      projects,
      quotations,
      defaultPaymentTerms: settings?.paymentTerms ?? "DP 50%, balance CBD",
      selectedProjectId,
      range,
    });
    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json(EMPTY_DASHBOARD_RESPONSE);
  }
}
