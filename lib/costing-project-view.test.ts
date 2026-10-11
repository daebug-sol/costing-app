import { resolveProjectView } from "./costing-project-view";

describe("resolveProjectView", () => {
  it("shows the list when the URL has no project", () => {
    expect(resolveProjectView(null, null, "A")).toBe("list");
  });

  it("is loading until the store holds the URL's project", () => {
    expect(resolveProjectView("B", null, null)).toBe("loading");
    expect(resolveProjectView("B", { id: "A", status: "ready" }, "A")).toBe("loading");
  });

  it("never shows a stale project under another id", () => {
    expect(resolveProjectView("B", { id: "B", status: "ready" }, "A")).toBe("loading");
  });

  it("is ready when the store holds the URL's project", () => {
    expect(resolveProjectView("B", { id: "B", status: "ready" }, "B")).toBe("ready");
    expect(resolveProjectView("B", null, "B")).toBe("ready");
  });

  it("shows not-found only when the load failed for this id and the store lacks it", () => {
    expect(resolveProjectView("B", { id: "B", status: "error" }, null)).toBe("error");
    expect(resolveProjectView("B", { id: "B", status: "error" }, "A")).toBe("error");
  });

  it("keeps an already loaded project on screen when a refetch fails", () => {
    expect(resolveProjectView("B", { id: "B", status: "error" }, "B")).toBe("ready");
  });

  it("ignores an error recorded for a previous id", () => {
    expect(resolveProjectView("C", { id: "B", status: "error" }, null)).toBe("loading");
  });
});
