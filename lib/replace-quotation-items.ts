import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { finite } from "@/lib/calculations";
import type { ParsedQuotationItemInput } from "@/lib/quotation-items-parse";

export async function replaceQuotationItems(
  quotationId: string,
  inputs: ParsedQuotationItemInput[],
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;

  const run = async (trx: Prisma.TransactionClient) => {
    const existing = await trx.quotationItem.findMany({ where: { quotationId } });
    const byId = new Map(existing.map((e) => [e.id, e]));

    await trx.quotationItem.deleteMany({ where: { quotationId } });

    if (inputs.length === 0) return;

    const projectIds = [...new Set(inputs.map((i) => i.projectId))];
    const projects = await trx.costingProject.findMany({
      where: { id: { in: projectIds } },
    });
    if (projects.length !== projectIds.length) {
      const err = new Error("INVALID_PROJECT");
      (err as Error & { code?: string }).code = "INVALID_PROJECT";
      throw err;
    }
    const projById = new Map(projects.map((p) => [p.id, p]));

    for (let i = 0; i < inputs.length; i++) {
      const inp = inputs[i]!;
      const proj = projById.get(inp.projectId)!;
      const prev = inp.id ? byId.get(inp.id) : undefined;

      let unitPrice: number;
      if (prev && prev.projectId === inp.projectId) {
        unitPrice = finite(prev.unitPrice, 0);
      } else {
        unitPrice = finite(proj.totalSelling, 0);
      }

      const qty = Math.max(1, Math.floor(Math.abs(inp.qty)) || 1);
      await trx.quotationItem.create({
        data: {
          quotationId,
          projectId: inp.projectId,
          sortOrder: i,
          description: inp.description.trim(),
          spec: inp.spec,
          qty,
          uom: inp.uom.trim() || "Unit",
          unitPrice,
          totalPrice: qty * unitPrice,
        },
      });
    }
  };

  if (tx) {
    await run(tx);
  } else {
    await prisma.$transaction(async (trx) => run(trx));
  }
}
