import type { OrgRole } from "@/lib/org-roles";

export const ALL_SALESMEN = "__all__";

export type SalesmanScope = {
  mode: "own" | "all" | "person";
  salesman: string | null;
};

/** Roles that may look beyond their own numbers. */
const BROAD_ROLES: readonly OrgRole[] = ["owner", "admin", "ceo"];

/**
 * Who the dashboard is about. Everyone else is always scoped to themselves,
 * whatever they request: a salesperson only sees their own numbers.
 */
export function resolveSalesmanScope(args: {
  role: OrgRole;
  requested: string | null;
  displayName: string | null;
}): SalesmanScope {
  const { role, requested, displayName } = args;
  if (!BROAD_ROLES.includes(role)) {
    return { mode: "own", salesman: displayName?.trim() || null };
  }
  const wanted = requested?.trim() ?? "";
  if (wanted === "" || wanted === ALL_SALESMEN) return { mode: "all", salesman: null };
  return { mode: "person", salesman: wanted };
}

const norm = (value: string) => value.trim().toLowerCase();

export function matchesSalesman(quotationSalesman: string | null, wanted: string): boolean {
  if (!quotationSalesman || !wanted.trim()) return false;
  return norm(quotationSalesman) === norm(wanted);
}

export function listSalesmen(quotations: ReadonlyArray<{ salesman: string | null }>): string[] {
  const seen = new Map<string, string>();
  for (const { salesman } of quotations) {
    const name = salesman?.trim();
    if (name && !seen.has(norm(name))) seen.set(norm(name), name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

type ScopeRows<Q, S, I, P> = { quotations: Q[]; salesOrders: S[]; invoices: I[]; projects: P[] };

/**
 * Narrows dashboard rows to one salesperson: their quotations, the orders and
 * invoices reachable from those quotations, and the projects they quote.
 */
export function applySalesmanScope<
  Q extends { id: string; salesman: string | null; projectId: string | null },
  S extends { id: string; quotationId: string | null },
  I extends { salesOrderId: string | null },
  P extends { id: string },
>(scope: SalesmanScope, rows: ScopeRows<Q, S, I, P>): ScopeRows<Q, S, I, P> {
  if (scope.mode === "all") return rows;
  const wanted = scope.salesman;
  const quotations = wanted ? rows.quotations.filter((q) => matchesSalesman(q.salesman, wanted)) : [];
  const quotationIds = new Set(quotations.map((q) => q.id));
  const salesOrders = rows.salesOrders.filter((s) => s.quotationId && quotationIds.has(s.quotationId));
  const orderIds = new Set(salesOrders.map((s) => s.id));
  const invoices = rows.invoices.filter((i) => i.salesOrderId && orderIds.has(i.salesOrderId));
  const projectIds = new Set(quotations.map((q) => q.projectId).filter((id): id is string => !!id));
  const projects = rows.projects.filter((p) => projectIds.has(p.id));
  return { quotations, salesOrders, invoices, projects };
}
