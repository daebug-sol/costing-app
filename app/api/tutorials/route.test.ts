import { GET, PUT } from "./route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    tutorialProgress: {
      findMany: jest.fn(async () => [
        { tutorialKey: "welcome", status: "done" },
        { tutorialKey: "costing", status: "skipped" },
        { tutorialKey: "retired-key", status: "done" },
      ]),
      upsert: jest.fn(async () => ({})),
      deleteMany: jest.fn(async () => ({ count: 1 })),
    },
  },
}));

jest.mock("@/lib/api-guard", () => ({
  guardApiRoute: jest.fn(async () => ({ userId: "user-1", orgId: "org-a", role: "sales" })),
}));

jest.mock("@/lib/auth", () => ({
  getDisplayName: jest.fn(async () => "Rina W."),
  isAuthBypassed: jest.fn(() => false),
}));

const put = (body: unknown) =>
  PUT(
    new Request("http://test/api/tutorials", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  );

describe("/api/tutorials", () => {
  beforeEach(() => jest.clearAllMocks());

  it("GET returns saved status for the caller only", async () => {
    const res = await GET();
    expect(await res.json()).toEqual({
      progress: { welcome: "done", costing: "skipped" },
      displayName: "Rina W.",
      autoStart: true,
      owner: "org-a:user-1",
    });
    expect(prisma.tutorialProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-a", userId: "user-1" } })
    );
  });

  it("GET turns autoStart off under AUTH_BYPASS", async () => {
    jest.requireMock("@/lib/auth").isAuthBypassed.mockReturnValueOnce(true);
    expect((await (await GET()).json()).autoStart).toBe(false);
  });

  it("PUT upserts by organizationId_userId_tutorialKey", async () => {
    const res = await put({ key: "costing", status: "done" });
    expect(res.status).toBe(200);
    expect(prisma.tutorialProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_userId_tutorialKey: {
            organizationId: "org-a",
            userId: "user-1",
            tutorialKey: "costing",
          },
        },
        create: {
          organizationId: "org-a",
          userId: "user-1",
          tutorialKey: "costing",
          status: "done",
        },
        update: { status: "done" },
      })
    );
  });

  it("PUT null deletes the row", async () => {
    await put({ key: "welcome", status: null });
    expect(prisma.tutorialProgress.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: "org-a", userId: "user-1", tutorialKey: "welcome" },
    });
    expect(prisma.tutorialProgress.upsert).not.toHaveBeenCalled();
  });

  it("PUT rejects unknown key or status with 400", async () => {
    expect((await put({ key: "nope", status: "done" })).status).toBe(400);
    expect((await put({ key: "costing", status: "finished" })).status).toBe(400);
    expect(prisma.tutorialProgress.upsert).not.toHaveBeenCalled();
  });
});
