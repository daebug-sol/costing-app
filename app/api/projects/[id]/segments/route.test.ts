import { NextResponse } from "next/server";
import { POST } from "./route";
import { requireAhuModule } from "@/lib/org-modules";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    costingSegment: { aggregate: jest.fn(), create: jest.fn() },
    costingProject: { findFirst: jest.fn() },
  },
}));

jest.mock("@/lib/api-guard", () => ({
  guardApiRoute: jest.fn(async () => ({ userId: "test-user", orgId: "org-a" })),
}));

jest.mock("@/lib/tenant-context", () => ({
  requireProjectInOrg: jest.fn(async () => ({ ok: true })),
}));

jest.mock("@/lib/org-modules", () => ({
  getOrgModules: jest.fn(async () => ({ ahu: true })),
  requireAhuModule: jest.fn(async () => ({ ok: true })),
}));

jest.mock("@/lib/manual-costing-rollup", () => ({
  ensureDefaultUmumGroup: jest.fn(async () => undefined),
  rollupManualSegmentFinancials: jest.fn(async () => undefined),
}));

jest.mock("@/lib/costing-project-include", () => ({
  costingProjectDetailInclude: {},
}));

import { getOrgModules } from "@/lib/org-modules";

describe("POST /api/projects/[id]/segments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getOrgModules as jest.Mock).mockResolvedValue({ ahu: true });
    (requireAhuModule as jest.Mock).mockResolvedValue({ ok: true });
  });

  it("returns 403 AHU_MODULE_DISABLED when creating type=ahu and module is off", async () => {
    (requireAhuModule as jest.Mock).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json(
        { error: "AHU module not enabled", code: "AHU_MODULE_DISABLED" },
        { status: 403 }
      ),
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ type: "ahu" }),
      headers: { "content-type": "application/json" },
    });
    const response = await POST(req, {
      params: Promise.resolve({ id: "proj-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toEqual({
      error: "AHU module not enabled",
      code: "AHU_MODULE_DISABLED",
    });
    expect(prisma.costingSegment.create).not.toHaveBeenCalled();
  });

  it("defaults omitted type to manual when AHU module is off", async () => {
    (getOrgModules as jest.Mock).mockResolvedValueOnce({ ahu: false });
    const mocked = prisma as unknown as {
      costingSegment: { aggregate: jest.Mock; create: jest.Mock };
      costingProject: { findFirst: jest.Mock };
    };
    mocked.costingSegment.aggregate.mockResolvedValue({
      _max: { sortOrder: -1 },
    });
    mocked.costingSegment.create.mockResolvedValue({
      id: "seg-1",
      type: "manual",
    });
    mocked.costingProject.findFirst.mockResolvedValue({ id: "proj-1" });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const response = await POST(req, {
      params: Promise.resolve({ id: "proj-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocked.costingSegment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "manual" }),
      })
    );
  });

  it("creates AHU segment when module is enabled", async () => {
    const mocked = prisma as unknown as {
      costingSegment: { aggregate: jest.Mock; create: jest.Mock };
      costingProject: { findFirst: jest.Mock };
    };
    mocked.costingSegment.aggregate.mockResolvedValue({
      _max: { sortOrder: 0 },
    });
    mocked.costingSegment.create.mockResolvedValue({
      id: "seg-ahu",
      type: "ahu",
    });
    mocked.costingProject.findFirst.mockResolvedValue({ id: "proj-1" });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ type: "ahu" }),
      headers: { "content-type": "application/json" },
    });
    const response = await POST(req, {
      params: Promise.resolve({ id: "proj-1" }),
    });

    expect(response.status).toBe(200);
    expect(requireAhuModule).toHaveBeenCalledWith("org-a");
    expect(mocked.costingSegment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "ahu" }),
      })
    );
  });
});
