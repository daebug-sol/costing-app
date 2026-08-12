/**
 * Org plan entitlements (Free caps + plan exposure).
 */
import {
  FREE_LIMITS,
  assertWithinPlanLimits,
  getOrgEntitlements,
} from "@/lib/org-entitlements";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: jest.fn() },
    costingProject: { count: jest.fn() },
    quotation: { count: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mocked = prisma as unknown as {
  organization: { findUnique: jest.Mock };
  costingProject: { count: jest.Mock };
  quotation: { count: jest.Mock };
};

describe("org-entitlements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("FREE_LIMITS", () => {
    it("defines Free caps", () => {
      expect(FREE_LIMITS).toEqual({ maxProjects: 2, maxQuotations: 3 });
    });
  });

  describe("getOrgEntitlements", () => {
    it("returns plan and modules from org", async () => {
      mocked.organization.findUnique.mockResolvedValue({
        plan: "enterprise",
        ahuModuleEnabled: true,
      });
      await expect(getOrgEntitlements("org-a")).resolves.toEqual({
        plan: "enterprise",
        modules: { ahu: true },
      });
      expect(mocked.organization.findUnique).toHaveBeenCalledWith({
        where: { id: "org-a" },
        select: { plan: true, ahuModuleEnabled: true },
      });
    });

    it("defaults to free / ahu off when org is missing", async () => {
      mocked.organization.findUnique.mockResolvedValue(null);
      await expect(getOrgEntitlements("missing")).resolves.toEqual({
        plan: "free",
        modules: { ahu: false },
      });
    });
  });

  describe("assertWithinPlanLimits", () => {
    it("allows Standard without counting", async () => {
      mocked.organization.findUnique.mockResolvedValue({ plan: "standard" });
      await expect(
        assertWithinPlanLimits("org-a", "projects")
      ).resolves.toEqual({ ok: true });
      expect(mocked.costingProject.count).not.toHaveBeenCalled();
    });

    it("allows Enterprise without counting", async () => {
      mocked.organization.findUnique.mockResolvedValue({ plan: "enterprise" });
      await expect(
        assertWithinPlanLimits("org-a", "quotations")
      ).resolves.toEqual({ ok: true });
      expect(mocked.quotation.count).not.toHaveBeenCalled();
    });

    it("allows Free under project cap", async () => {
      mocked.organization.findUnique.mockResolvedValue({ plan: "free" });
      mocked.costingProject.count.mockResolvedValue(1);
      await expect(
        assertWithinPlanLimits("org-a", "projects")
      ).resolves.toEqual({ ok: true });
      expect(mocked.costingProject.count).toHaveBeenCalledWith({
        where: { organizationId: "org-a" },
      });
    });

    it("returns 403 PLAN_LIMIT_REACHED when Free at project cap", async () => {
      mocked.organization.findUnique.mockResolvedValue({ plan: "free" });
      mocked.costingProject.count.mockResolvedValue(FREE_LIMITS.maxProjects);
      const result = await assertWithinPlanLimits("org-a", "projects");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body.code).toBe("PLAN_LIMIT_REACHED");
        expect(body.resource).toBe("projects");
        expect(body.limit).toBe(FREE_LIMITS.maxProjects);
        expect(String(body.error)).toMatch(/Free plan limit/i);
      }
    });

    it("returns 403 PLAN_LIMIT_REACHED when Free at quotation cap", async () => {
      mocked.organization.findUnique.mockResolvedValue({ plan: "free" });
      mocked.quotation.count.mockResolvedValue(FREE_LIMITS.maxQuotations);
      const result = await assertWithinPlanLimits("org-a", "quotations");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body).toMatchObject({
          code: "PLAN_LIMIT_REACHED",
          resource: "quotations",
          limit: FREE_LIMITS.maxQuotations,
        });
      }
    });

    it("treats missing org as Free", async () => {
      mocked.organization.findUnique.mockResolvedValue(null);
      mocked.costingProject.count.mockResolvedValue(FREE_LIMITS.maxProjects);
      const result = await assertWithinPlanLimits("missing", "projects");
      expect(result.ok).toBe(false);
    });
  });
});
