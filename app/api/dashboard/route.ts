import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { getDisplayName } from "@/lib/auth";
import { revenueTrendFromData } from "@/lib/dashboard-analytics";
import { buildPersonalSummary } from "@/lib/dashboard-personal";
import { applySalesmanScope, listSalesmen, matchesSalesman, resolveSalesmanScope } from "@/lib/dashboard-scope";
import { prisma } from "@/lib/prisma";
import { buildDashboardAnalyticsPayload } from "@/lib/dashboard-analytics";
import type { DashboardRange } from "@/lib/dashboard-contract";
import { getOrCreateSettings } from "@/lib/tenant-queries";

function parseDashboardRange(value: string | null): DashboardRange {
  return value === "mtd" || value === "ytd" || value === "12m" || value === "all" ? value : "all";
}

export async function GET(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId, role, userId } = guard;

  try {
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get("projectId");
    const selectedProjectId = projectIdParam && projectIdParam.trim() ? projectIdParam.trim() : null;
    const range = parseDashboardRange(searchParams.get("range"));

    const projectWhere = selectedProjectId
      ? { id: selectedProjectId, organizationId: orgId }
      : { organizationId: orgId };
    const quotationWhere = selectedProjectId
      ? { projectId: selectedProjectId, organizationId: orgId }
      : { organizationId: orgId };

    const [allProjects, allQuotations, settings, allSalesOrders, allInvoices] =
      await Promise.all([
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
          priceAdjustmentPct: true,
          priceAdjustmentAmt: true,
          updatedAt: true,
          segments: {
            select: {
              type: true,
              sections: {
                select: {
                  category: true,
                  subtotal: true,
                  overrideSubtotal: true,
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
          noSurat: true,
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
      getOrCreateSettings(orgId),
      prisma.salesOrder.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          status: true,
          tanggal: true,
          grandTotal: true,
          quotationId: true,
          soNumber: true,
          clientName: true,
          clientCompany: true,
        },
      }),
      prisma.invoice.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          invNumber: true,
          customerId: true,
          salesOrderId: true,
          status: true,
          dueDate: true,
          tanggal: true,
          grandTotal: true,
          paidTotal: true,
          customer: { select: { name: true, company: true } },
        },
      }),
    ]);

    const displayName = await getDisplayName();
    const scope = resolveSalesmanScope({
      role,
      requested: searchParams.get("salesman"),
      displayName,
    });
    const scoped = applySalesmanScope(scope, {
      quotations: allQuotations,
      salesOrders: allSalesOrders,
      invoices: allInvoices,
      projects: allProjects,
    });
    const { quotations, salesOrders, invoices, projects } = scoped;
    const canPick = scope.mode !== "own";

    if (selectedProjectId && projects.length === 0) {
      return NextResponse.json(
        { error: "Project not found", projectId: selectedProjectId },
        { status: 404 }
      );
    }

    const payload = buildDashboardAnalyticsPayload({
      projects,
      quotations,
      defaultPaymentTerms: settings.paymentTerms ?? "DP 50%, balance CBD",
      selectedProjectId,
      range,
      salesOrders,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invNumber: inv.invNumber,
        customerId: inv.customerId,
        customerName: inv.customer.company || inv.customer.name,
        status: inv.status,
        dueDate: inv.dueDate,
        tanggal: inv.tanggal,
        grandTotal: inv.grandTotal,
        paidTotal: inv.paidTotal,
      })),
    });
    // The target is personal: only shown when the dashboard is about the caller.
    const isSelf = !!scope.salesman && !!displayName && matchesSalesman(scope.salesman, displayName);
    const member = isSelf
      ? await prisma.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: orgId, userId } },
          select: { monthlyTarget: true },
        })
      : null;
    const now = new Date();
    const personal = buildPersonalSummary({
      now,
      monthlyTarget: member?.monthlyTarget ?? null,
      revenueSeries: revenueTrendFromData(
        { projects, quotations, defaultPaymentTerms: settings.paymentTerms ?? "", selectedProjectId: null, range: "all" },
        now,
        "all"
      ).series,
      quotations: quotations.map((q) => ({
        id: q.id,
        ref: q.noSurat ?? "",
        status: q.status,
        tanggal: q.tanggal,
        validityDays: q.validityDays,
        clientLabel: q.clientCompany || q.clientName || "",
      })),
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invNumber: inv.invNumber,
        customerName: inv.customer.company || inv.customer.name,
        dueDate: inv.dueDate,
        grandTotal: inv.grandTotal,
        paidTotal: inv.paidTotal,
        status: inv.status,
      })),
      salesOrders: salesOrders.map((so) => ({
        id: so.id,
        soNumber: so.soNumber,
        clientLabel: so.clientCompany || so.clientName || "",
        status: so.status,
        tanggal: so.tanggal,
      })),
    });
    return NextResponse.json({
      ...payload,
      personal,
      scope: {
        mode: scope.mode,
        salesman: scope.salesman,
        viewerName: displayName ?? "",
        options: canPick ? listSalesmen(allQuotations) : [],
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load dashboard analytics" }, { status: 500 });
  }
}
