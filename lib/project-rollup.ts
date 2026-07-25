import { prisma } from "@/lib/prisma";
import { finite } from "@/lib/calculations";
import {
  computeCostSummary,
  marginTogglesFromProject,
} from "@/lib/cost-summary";
import { effectiveSectionSubtotal } from "@/lib/section-subtotal";
import { syncQuotationItemsFromProject } from "@/lib/sync-quotation-items-from-project";

/** Sum line subtotals → section.subtotal → segment.subtotal → project HPP + selling.
 * Segment / project money uses `overrideSubtotal ?? calculated subtotal`. */
export async function rollupSectionAndProject(
  sectionId: string,
  projectId: string
): Promise<void> {
  const section = await prisma.costingSection.findFirst({
    where: {
      id: sectionId,
      segment: { projectId },
    },
    include: { lineItems: true },
  });
  if (!section) return;

  const subtotal = section.lineItems.reduce(
    (s, it) => s + finite(it.subtotal, 0),
    0
  );
  await prisma.costingSection.update({
    where: { id: sectionId },
    data: { subtotal },
  });
  await rollupAhuSegmentFinancials(section.segmentId);
  await rollupProjectFinancials(projectId);
}

/** Recompute segment.subtotal from AHU sections (after section line changes). */
export async function rollupAhuSegmentFinancials(segmentId: string): Promise<void> {
  const seg = await prisma.costingSegment.findUnique({
    where: { id: segmentId },
    include: {
      sections: { include: { lineItems: true } },
    },
  });
  if (!seg || seg.type !== "ahu") return;

  let segmentSub = 0;
  for (const sec of seg.sections) {
    const calculated = sec.lineItems.reduce(
      (s, it) => s + finite(it.subtotal, 0),
      0
    );
    if (finite(sec.subtotal, 0) !== calculated) {
      await prisma.costingSection.update({
        where: { id: sec.id },
        data: { subtotal: calculated },
      });
    }
    segmentSub += effectiveSectionSubtotal({
      subtotal: calculated,
      overrideSubtotal: sec.overrideSubtotal,
    });
  }
  await prisma.costingSegment.update({
    where: { id: segmentId },
    data: { subtotal: segmentSub },
  });
}

/** Clear all category price overrides on an AHU segment, then roll up. */
export async function clearAhuSectionOverrides(
  segmentId: string,
  projectId: string
): Promise<void> {
  await prisma.costingSection.updateMany({
    where: { segmentId, segment: { projectId } },
    data: { overrideSubtotal: null },
  });
  await rollupAhuSegmentFinancials(segmentId);
  await rollupProjectFinancials(projectId);
}

/** Sum all segment subtotals → project totalHPP + totalSelling. */
export async function rollupProjectFinancials(projectId: string): Promise<void> {
  const project = await prisma.costingProject.findUnique({
    where: { id: projectId },
    include: {
      segments: true,
    },
  });
  if (!project) return;

  const totalHPP = project.segments.reduce(
    (s, seg) => s + finite(seg.subtotal, 0),
    0
  );

  const { selling } = computeCostSummary(
    totalHPP,
    project.qty,
    {
      overhead: project.overhead,
      contingency: project.contingency,
      eskalasi: project.eskalasi,
      asuransi: project.asuransi,
      mobilisasi: project.mobilisasi,
      margin: project.margin,
      priceAdjustmentPct: project.priceAdjustmentPct,
      priceAdjustmentAmt: project.priceAdjustmentAmt,
    },
    marginTogglesFromProject(project)
  );

  await prisma.costingProject.update({
    where: { id: projectId },
    data: {
      totalHPP,
      totalSelling: selling,
    },
  });

  try {
    await syncQuotationItemsFromProject(projectId);
  } catch (e) {
    console.error("syncQuotationItemsFromProject", e);
  }
}
