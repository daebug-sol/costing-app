import { NextResponse } from "next/server";
import { mergeRecalcParams, parseAhuRecalcParams } from "@/lib/ahu-recalc-params";
import { validateAhuRecalculateContext } from "@/lib/ahu-recalc-validation";
import { computeAhuSegmentCostingBlocks } from "@/lib/ahu-segment-costing";
import { costingProjectDetailInclude } from "@/lib/costing-project-include";
import { finite } from "@/lib/calculations";
import { normalizeCostingScope } from "@/lib/costing-scope";
import { prisma } from "@/lib/prisma";
import { rollupProjectFinancials } from "@/lib/project-rollup";

type Ctx = { params: Promise<{ id: string; segmentId: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const { id: projectId, segmentId } = await context.params;
    const body =
      (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const segment = await prisma.costingSegment.findFirst({
      where: { id: segmentId, projectId },
    });
    if (!segment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (segment.type !== "ahu") {
      return NextResponse.json(
        {
          error:
            "Recalculate AHU hanya untuk segmen tipe AHU. Segmen manual memakai item dari database.",
        },
        { status: 400 }
      );
    }

    const [materials, profiles, components] = await Promise.all([
      prisma.materialPrice.findMany(),
      prisma.profileData.findMany(),
      prisma.componentCatalog.findMany(),
    ]);

    const storedParams = parseAhuRecalcParams(segment.ahuRecalcParams);
    const merged = mergeRecalcParams(storedParams, body);

    const validation = validateAhuRecalculateContext({
      dimH: segment.dimH,
      dimW: segment.dimW,
      dimD: segment.dimD,
      merged,
    });
    if (!validation.ok) {
      return NextResponse.json(
        { error: "Validasi gagal", detail: validation.message },
        { status: 400 }
      );
    }

    const H = finite(segment.dimH, 0);
    const W = finite(segment.dimW, 0);
    const D = finite(segment.dimD, 0);

    const nSections = Math.max(1, Math.floor(finite(merged.nSections, 1)));
    const profileType =
      segment.profileType?.trim() ||
      profiles.find((p) => p.type === "Pentapost")?.code ||
      "";

    const scope = normalizeCostingScope(merged.costingScope);

    const rawBlocks = computeAhuSegmentCostingBlocks({
      dimH: H,
      dimW: W,
      dimD: D,
      profileType,
      segmentQty: segment.qty,
      nSections,
      scope,
      mergedParams: merged,
      materials,
      profiles,
      components,
    });

    const blocks = rawBlocks
      .filter((b) => b.items.length > 0)
      .map((b, idx) => ({ ...b, sortOrder: idx }));

    await prisma.$transaction(async (tx) => {
      await tx.costingSection.deleteMany({ where: { segmentId } });

      let segmentSub = 0;
      for (const block of blocks) {
        const subtotal = block.items.reduce(
          (s, it) => s + finite(it.subtotal, 0),
          0
        );
        segmentSub += subtotal;

        await tx.costingSection.create({
          data: {
            segmentId,
            category: block.category,
            sortOrder: block.sortOrder,
            subtotal,
            lineItems: {
              create: block.items.map((it, idx) => {
                const q = finite(it.qty, 0);
                const expr = it.qtyFormula?.trim();
                const noteParts = [it.notes, expr ? `expr: ${expr}` : ""].filter(
                  Boolean
                );
                return {
                  sortOrder: idx,
                  description: it.description,
                  uom: it.uom,
                  qty: q,
                  qtyFormula: String(q),
                  isOverride: false,
                  unitPrice: finite(it.unitPrice, 0),
                  currency: it.currency,
                  wasteFactor: finite(it.wasteFactor, 1),
                  subtotal: finite(it.subtotal, 0),
                  componentRef: it.componentRef ?? null,
                  notes: noteParts.length ? noteParts.join(" | ") : null,
                };
              }),
            },
          },
        });
      }

      await tx.costingSegment.update({
        where: { id: segmentId },
        data: { subtotal: segmentSub },
      });
    });

    await rollupProjectFinancials(projectId);

    const refreshed = await prisma.costingProject.findUnique({
      where: { id: projectId },
      include: costingProjectDetailInclude,
    });
    return NextResponse.json(refreshed);
  } catch (e) {
    console.error(e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Recalculate failed", detail },
      { status: 500 }
    );
  }
}
