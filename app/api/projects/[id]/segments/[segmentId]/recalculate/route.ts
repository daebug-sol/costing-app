import { NextResponse } from "next/server";
import { costingProjectDetailInclude } from "@/lib/costing-project-include";
import {
  calculateCoil,
  calculateDamper,
  calculateFanMotor,
  calculateFramePanel,
  calculateSkid,
  calculateStructure,
  finite,
} from "@/lib/calculations";
import { prisma } from "@/lib/prisma";
import { rollupProjectFinancials } from "@/lib/project-rollup";

type Ctx = { params: Promise<{ id: string; segmentId: string }> };

const SECTIONS = [
  { category: "Frame & Panel", sortOrder: 0 },
  { category: "Skid", sortOrder: 1 },
  { category: "Structure", sortOrder: 2 },
  { category: "Coil", sortOrder: 3 },
  { category: "Damper", sortOrder: 4 },
  { category: "Fan & Motor", sortOrder: 5 },
] as const;

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

    const H = finite(segment.dimH, 0);
    const W = finite(segment.dimW, 0);
    const D = finite(segment.dimD, 0);
    const nSections = Math.max(1, Math.floor(finite(body.nSections, 1)));
    const profileType =
      segment.profileType?.trim() ||
      profiles.find((p) => p.type === "Pentapost")?.code ||
      "";

    const frameItems = calculateFramePanel({
      H,
      W,
      D,
      profileType,
      nSections,
      profiles,
      materials,
    });

    const skidItems = calculateSkid({ W, D, materials });
    const structureItems = calculateStructure({ H, W, D, materials });

    const coilBody = (body.coil ?? {}) as Record<string, unknown>;
    const coilItems = calculateCoil({
      FH: finite(coilBody.FH, H),
      FL: finite(coilBody.FL, W),
      rows: finite(coilBody.rows, 4),
      FPI: finite(coilBody.FPI, 10),
      circuits: finite(coilBody.circuits, 2),
      materials,
    });

    const damperBody = (body.damper ?? {}) as Record<string, unknown>;
    const damperItems = calculateDamper({
      W: finite(damperBody.W, W),
      H: finite(damperBody.H, H),
      type: damperBody.type === "FA" ? "FA" : "RA",
      profiles,
      materials,
      components,
    });

    const fmBody = (body.fanMotor ?? {}) as Record<string, unknown>;
    const fanItems = calculateFanMotor({
      fanModel: String(fmBody.fanModel ?? ""),
      motorKW: finite(fmBody.motorKW, 0),
      motorPoles: Math.floor(finite(fmBody.motorPoles, 4)),
      qty: Math.max(1, Math.floor(finite(fmBody.qty, segment.qty))),
      components,
    });

    const blocks = [
      { ...SECTIONS[0], items: frameItems },
      { ...SECTIONS[1], items: skidItems },
      { ...SECTIONS[2], items: structureItems },
      { ...SECTIONS[3], items: coilItems },
      { ...SECTIONS[4], items: damperItems },
      { ...SECTIONS[5], items: fanItems },
    ];

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
    return NextResponse.json(
      { error: "Recalculate failed" },
      { status: 500 }
    );
  }
}
