import { getMainNav } from "@/lib/nav-items";
import { permissionsFor } from "@/lib/permissions";

const hrefs = (items: ReturnType<typeof getMainNav>) => items.map((i) => i.href);

describe("getMainNav", () => {
  it("returns the four main items in order for a full-permission role", () => {
    expect(hrefs(getMainNav("owner", permissionsFor("owner"), false))).toEqual([
      "/",
      "/database",
      "/costing",
      "/documentation",
    ]);
  });

  it("never includes Help", () => {
    expect(hrefs(getMainNav("owner", permissionsFor("owner"), true))).not.toContain("/help");
  });

  it("omits Database without db:read", () => {
    const perms = permissionsFor("owner").filter((p) => p !== "db:read");
    expect(hrefs(getMainNav("owner", perms, false))).not.toContain("/database");
  });

  it("appends Operator last only for operators", () => {
    const perms = permissionsFor("owner");
    expect(hrefs(getMainNav("owner", perms, true)).at(-1)).toBe("/operator");
    expect(hrefs(getMainNav("owner", perms, false))).not.toContain("/operator");
  });
});
