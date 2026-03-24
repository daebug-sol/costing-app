import { prisma } from "@/lib/prisma";
import { finite } from "@/lib/calculations";
import {
  computeCostSummary,
  marginTogglesFromProject,
} from "@/lib/cost-summary";
import { syncQuotationItemsFromProject } from "@/lib/sync-quotation-items-from-project";

/** Sum line subtotals → section.subtotal → segment.subtotal → project HPP + selling. */
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
    const sub = sec.lineItems.reduce(
      (s, it) => s + finite(it.subtotal, 0),
      0
    );
    segmentSub += sub;
    if (finite(sec.subtotal, 0) !== sub) {
      await prisma.costingSection.update({
        where: { id: sec.id },
        data: { subtotal: sub },
      });
    }
  }
  await prisma.costingSegment.update({
    where: { id: segmentId },
    data: { subtotal: segmentSub },
  });
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
