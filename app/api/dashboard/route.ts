import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDashboardAnalyticsPayload } from "@/lib/dashboard-analytics";
import type { DashboardRange } from "@/lib/dashboard-contract";

function parseDashboardRange(value: string | null): DashboardRange {
  return value === "mtd" || value === "ytd" || value === "12m" || value === "all" ? value : "all";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get("projectId");
    const selectedProjectId = projectIdParam && projectIdParam.trim() ? projectIdParam.trim() : null;
    const range = parseDashboardRange(searchParams.get("range"));

    const projectWhere = selectedProjectId ? { id: selectedProjectId } : undefined;
    const quotationWhere = selectedProjectId ? { projectId: selectedProjectId } : undefined;

    const [projects, quotations, settings] = await Promise.all([
      prisma.costingProject.findMany({
        where: projectWhere,
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
        where: quotationWhere,
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

    if (selectedProjectId && projects.length === 0) {
      return NextResponse.json(
        { error: "Project not found", projectId: selectedProjectId },
        { status: 404 }
      );
    }

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
    return NextResponse.json({ error: "Failed to load dashboard analytics" }, { status: 500 });
  }
}
