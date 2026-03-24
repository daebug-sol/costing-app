export type ParsedQuotationItemInput = {
  /** Existing DB id — used to preserve snapshot unit price when project is unchanged. */
  id?: string;
  projectId: string;
  description: string;
  spec: string | null;
  qty: number;
  uom: string;
};

export function parseQuotationItemsFromBody(
  items: unknown
): ParsedQuotationItemInput[] {
  if (!Array.isArray(items)) return [];
  const out: ParsedQuotationItemInput[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const projectId =
      typeof o.projectId === "string" && o.projectId.trim()
        ? o.projectId.trim()
        : typeof o.costingProjectId === "string" && o.costingProjectId.trim()
          ? o.costingProjectId.trim()
          : "";
    if (!projectId) continue;

    const description = String(o.description ?? "").trim();
    if (!description) continue;

    const qty = Number(o.qty);
    if (!Number.isFinite(qty)) continue;

    let id: string | undefined;
    if (typeof o.id === "string" && o.id.trim()) id = o.id.trim();

    const specStr =
      o.spec === undefined || o.spec === null || o.spec === ""
        ? null
        : String(o.spec).slice(0, 4000);

    out.push({
      id,
      projectId,
      description,
      spec: specStr,
      qty,
      uom: String(o.uom ?? "Unit").trim() || "Unit",
    });
  }
  return out;
}
