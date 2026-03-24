import { NextResponse } from "next/server";
import { hasColumnKey } from "@/lib/custom-db";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [materials, profiles, components, customRows] = await Promise.all([
      prisma.materialPrice.findMany({ orderBy: { code: "asc" } }),
      prisma.profileData.findMany({ orderBy: { code: "asc" } }),
      prisma.componentCatalog.findMany({ orderBy: { code: "asc" } }),
      prisma.customDbRow.findMany({
        include: {
          cells: true,
          table: { include: { columns: true } },
        },
      }),
    ]);

    const items = [
      ...materials.map((m) => ({
        sourceType: "material",
        sourceId: m.id,
        code: m.code,
        name: m.name,
        category: m.category,
        price: m.pricePerKg,
        uom: m.unit,
      })),
      ...profiles.map((p) => ({
        sourceType: "profile",
        sourceId: p.id,
        code: p.code,
        name: p.name,
        category: p.type,
        price: p.pricePerM,
        uom: "m",
      })),
      ...components.map((c) => ({
        sourceType: "component",
        sourceId: c.id,
        code: c.code,
        name: c.name,
        category: c.category,
        price: c.unitPrice,
        uom: c.unit,
      })),
      ...customRows
        .map((r) => {
          const codeCol = r.table.columns.find((c) => hasColumnKey(c.id, "col_code"))?.id;
          const nameCol = r.table.columns.find((c) => hasColumnKey(c.id, "col_name"))?.id;
          const uomCol = r.table.columns.find((c) => hasColumnKey(c.id, "col_uom"))?.id;
          const priceCol = r.table.columns.find((c) => hasColumnKey(c.id, "col_price"))?.id;
          const cellById = new Map(r.cells.map((c) => [c.columnId, c]));
          const code = (codeCol ? cellById.get(codeCol)?.rawValue : "")?.trim() ?? "";
          const name = (nameCol ? cellById.get(nameCol)?.rawValue : "")?.trim() ?? "";
          const uom = (uomCol ? cellById.get(uomCol)?.rawValue : "unit")?.trim() ?? "unit";
          const priceCell = priceCol ? cellById.get(priceCol) : null;
          const price = Number(priceCell?.computedValue ?? priceCell?.rawValue ?? 0);
          return {
            sourceType: "custom",
            sourceId: r.id,
            code,
            name,
            category: "Custom",
            price: Number.isFinite(price) ? price : 0,
            uom,
          };
        })
        .filter((x) => x.code && x.name),
    ];

    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load database items" }, { status: 500 });
  }
}
