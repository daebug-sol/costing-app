import { DELETE } from "./route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: { costingProject: { delete: jest.fn(async () => ({})) } },
}));

jest.mock("@/lib/api-guard", () => ({
  guardApiRoute: jest.fn(async () => ({ userId: "user-1", orgId: "org-a", role: "admin" })),
}));

jest.mock("@/lib/tenant-context", () => ({
  requireProjectInOrg: jest.fn(async () => ({ ok: true })),
}));

const del = () =>
  DELETE(new Request("http://test/api/projects/p1", { method: "DELETE" }), {
    params: Promise.resolve({ id: "p1" }),
  });

describe("DELETE /api/projects/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes a project of the caller's organization", async () => {
    const res = await del();
    expect(res.status).toBe(204);
    const { requireProjectInOrg } = jest.requireMock("@/lib/tenant-context");
    expect(requireProjectInOrg).toHaveBeenCalledWith("p1", "org-a");
    expect(prisma.costingProject.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("answers 409 when a quotation still uses the project", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    (prisma.costingProject.delete as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error("Foreign key constraint violated"), { code: "P2003" })
    );
    const res = await del();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/penawaran/);
  });
});
