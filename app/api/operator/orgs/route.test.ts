import { NextResponse } from "next/server";
import { GET as listOrgs } from "@/app/api/operator/orgs/route";
import { PATCH as patchOrg } from "@/app/api/operator/orgs/[id]/route";
import { requireOperator } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/operator-auth", () => ({
  requireOperator: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockedRequire = requireOperator as jest.MockedFunction<typeof requireOperator>;
const mockedOrg = prisma.organization as unknown as {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
};

describe("GET /api/operator/orgs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when requireOperator denies", async () => {
    mockedRequire.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await listOrgs(new Request("http://localhost/api/operator/orgs"));
    expect(res.status).toBe(401);
    expect(mockedOrg.findMany).not.toHaveBeenCalled();
  });

  it("lists orgs when operator key auth succeeds", async () => {
    mockedRequire.mockResolvedValue({ ok: true, via: "api_key" });
    mockedOrg.findMany.mockResolvedValue([
      {
        id: "org-1",
        name: "Acme",
        slug: "acme",
        plan: "free",
        ahuModuleEnabled: false,
        createdAt: new Date("2026-01-01"),
      },
    ]);
    const res = await listOrgs(
      new Request("http://localhost/api/operator/orgs", {
        headers: { Authorization: "Bearer secret" },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orgs).toHaveLength(1);
    expect(json.orgs[0].slug).toBe("acme");
  });
});

describe("PATCH /api/operator/orgs/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequire.mockResolvedValue({ ok: true, via: "api_key" });
  });

  it("returns 401 without operator creds", async () => {
    mockedRequire.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await patchOrg(
      new Request("http://localhost/api/operator/orgs/org-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "enterprise" }),
      }),
      { params: Promise.resolve({ id: "org-1" }) }
    );
    expect(res.status).toBe(401);
    expect(mockedOrg.update).not.toHaveBeenCalled();
  });

  it("rejects free plan request that tries to keep AHU on by clearing AHU", async () => {
    mockedOrg.findUnique.mockResolvedValue({
      plan: "enterprise",
      ahuModuleEnabled: true,
    });
    mockedOrg.update.mockResolvedValue({
      id: "org-1",
      name: "Acme",
      slug: "acme",
      plan: "free",
      ahuModuleEnabled: false,
      createdAt: new Date("2026-01-01"),
    });

    const res = await patchOrg(
      new Request("http://localhost/api/operator/orgs/org-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "free", ahuModuleEnabled: true }),
      }),
      { params: Promise.resolve({ id: "org-1" }) }
    );
    expect(res.status).toBe(200);
    expect(mockedOrg.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { plan: "free", ahuModuleEnabled: false },
      })
    );
  });

  it("rejects AHU on without enterprise", async () => {
    mockedOrg.findUnique.mockResolvedValue({
      plan: "standard",
      ahuModuleEnabled: false,
    });

    const res = await patchOrg(
      new Request("http://localhost/api/operator/orgs/org-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ahuModuleEnabled: true }),
      }),
      { params: Promise.resolve({ id: "org-1" }) }
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("INVALID_ENTITLEMENTS");
    expect(mockedOrg.update).not.toHaveBeenCalled();
  });

  it("sets enterprise + AHU with key auth", async () => {
    mockedOrg.findUnique.mockResolvedValue({
      plan: "free",
      ahuModuleEnabled: false,
    });
    mockedOrg.update.mockResolvedValue({
      id: "org-1",
      name: "Acme",
      slug: "acme",
      plan: "enterprise",
      ahuModuleEnabled: true,
      createdAt: new Date("2026-01-01"),
    });

    const res = await patchOrg(
      new Request("http://localhost/api/operator/orgs/org-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer secret",
        },
        body: JSON.stringify({ plan: "enterprise", ahuModuleEnabled: true }),
      }),
      { params: Promise.resolve({ id: "org-1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plan).toBe("enterprise");
    expect(json.ahuModuleEnabled).toBe(true);
  });
});
