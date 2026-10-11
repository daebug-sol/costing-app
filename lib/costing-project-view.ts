export type ProjectLoadState = { id: string; status: "ready" | "error" } | null;

export type ProjectView = "list" | "loading" | "ready" | "error";

/**
 * Which `/costing` view to render. The store's project is only trusted when its id
 * equals the URL's id, so a stale or late-arriving project is never shown under
 * another `?project=`.
 */
export function resolveProjectView(
  urlId: string | null,
  load: ProjectLoadState,
  storeId: string | null
): ProjectView {
  if (!urlId) return "list";
  if (storeId === urlId) return "ready";
  if (load?.id === urlId && load.status === "error") return "error";
  return "loading";
}
