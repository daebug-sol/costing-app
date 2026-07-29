/**
 * Org product-module entitlements (AHU SKU gate).
 */
import { getOrgModules, requireAhuModule } from "@/lib/org-modules";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mocked = prisma as unknown as {
  organization: { findUnique: jest.Mock };
};

describe("org-modules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getOrgModules", () => {
    it("returns ahu: true when ahuModuleEnabled is true", async () => {
      mocked.organization.findUnique.mockResolvedValue({
        ahuModuleEnabled: true,
      });
      await expect(getOrgModules("org-a")).resolves.toEqual({ ahu: true });
      expect(mocked.organization.findUnique).toHaveBeenCalledWith({
        where: { id: "org-a" },
        select: { ahuModuleEnabled: true },
      });
    });

    it("returns ahu: false when ahuModuleEnabled is false", async () => {
      mocked.organization.findUnique.mockResolvedValue({
        ahuModuleEnabled: false,
      });
      await expect(getOrgModules("org-a")).resolves.toEqual({ ahu: false });
    });

    it("returns ahu: false when org is missing", async () => {
      mocked.organization.findUnique.mockResolvedValue(null);
      await expect(getOrgModules("missing")).resolves.toEqual({ ahu: false });
    });
  });

  describe("requireAhuModule", () => {
    it("returns ok when AHU is enabled", async () => {
      mocked.organization.findUnique.mockResolvedValue({
        ahuModuleEnabled: true,
      });
      const result = await requireAhuModule("org-a");
      expect(result).toEqual({ ok: true });
    });

    it("returns 403 AHU_MODULE_DISABLED when AHU is off", async () => {
      mocked.organization.findUnique.mockResolvedValue({
        ahuModuleEnabled: false,
      });
      const result = await requireAhuModule("org-a");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body).toEqual({
          error: "AHU module not enabled",
          code: "AHU_MODULE_DISABLED",
        });
      }
    });
  });
});
