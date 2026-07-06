/**
 * Tenant isolation tests — Org A must not access Org B resources (404).
 */
import {
  assertProjectInOrg,
  requireCustomRowInOrg,
  requireCustomTableInOrg,
  requireManualItemInOrg,
  requireProjectInOrg,
  requireSectionInOrg,
  requireSegmentInOrg,
} from "@/lib/tenant-context";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    costingProject: { findFirst: jest.fn() },
    costingSegment: { findFirst: jest.fn() },
    costingSection: { findFirst: jest.fn() },
    manualCostingItem: { findFirst: jest.fn() },
    customDbTable: { findFirst: jest.fn() },
    customDbRow: { findFirst: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mocked = prisma as unknown as {
  costingProject: { findFirst: jest.Mock };
  costingSegment: { findFirst: jest.Mock };
  costingSection: { findFirst: jest.Mock };
  manualCostingItem: { findFirst: jest.Mock };
  customDbTable: { findFirst: jest.Mock };
  customDbRow: { findFirst: jest.Mock };
};

describe("tenant isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("assertProjectInOrg", () => {
    it("returns false when project belongs to another org", async () => {
      mocked.costingProject.findFirst.mockResolvedValue(null);
      const ok = await assertProjectInOrg("proj-b", "org-a");
      expect(ok).toBe(false);
      expect(mocked.costingProject.findFirst).toHaveBeenCalledWith({
        where: { id: "proj-b", organizationId: "org-a" },
        select: { id: true },
      });
    });

    it("returns true when project is in org", async () => {
      mocked.costingProject.findFirst.mockResolvedValue({ id: "proj-a" });
      const ok = await assertProjectInOrg("proj-a", "org-a");
      expect(ok).toBe(true);
    });
  });

  describe("requireProjectInOrg", () => {
    it("returns 404 response when project not in org", async () => {
      mocked.costingProject.findFirst.mockResolvedValue(null);
      const result = await requireProjectInOrg("proj-b", "org-a");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(404);
      }
    });
  });

  describe("requireSegmentInOrg", () => {
    it("scopes segment lookup through project organizationId", async () => {
      mocked.costingSegment.findFirst.mockResolvedValue(null);
      const result = await requireSegmentInOrg("seg-1", "proj-1", "org-a");
      expect(result.ok).toBe(false);
      expect(mocked.costingSegment.findFirst).toHaveBeenCalledWith({
        where: {
          id: "seg-1",
          projectId: "proj-1",
          project: { organizationId: "org-a" },
        },
        select: { id: true },
      });
    });

    it("returns ok when segment belongs to org project", async () => {
      mocked.costingSegment.findFirst.mockResolvedValue({ id: "seg-1" });
      const result = await requireSegmentInOrg("seg-1", "proj-1", "org-a");
      expect(result.ok).toBe(true);
    });
  });

  describe("requireSectionInOrg", () => {
    it("scopes section lookup through project organizationId", async () => {
      mocked.costingSection.findFirst.mockResolvedValue(null);
      const result = await requireSectionInOrg("sec-1", "proj-1", "org-a");
      expect(result.ok).toBe(false);
      expect(mocked.costingSection.findFirst).toHaveBeenCalledWith({
        where: {
          id: "sec-1",
          segment: {
            projectId: "proj-1",
            project: { organizationId: "org-a" },
          },
        },
        select: { id: true },
      });
    });
  });

  describe("requireManualItemInOrg", () => {
    it("scopes manual item through project organizationId", async () => {
      mocked.manualCostingItem.findFirst.mockResolvedValue(null);
      const result = await requireManualItemInOrg("item-1", "proj-1", "org-a");
      expect(result.ok).toBe(false);
      expect(mocked.manualCostingItem.findFirst).toHaveBeenCalledWith({
        where: {
          id: "item-1",
          group: {
            segment: {
              projectId: "proj-1",
              project: { organizationId: "org-a" },
            },
          },
        },
        select: { id: true },
      });
    });
  });

  describe("requireCustomTableInOrg", () => {
    it("returns 404 when table belongs to another org", async () => {
      mocked.customDbTable.findFirst.mockResolvedValue(null);
      const result = await requireCustomTableInOrg("tbl-b", "org-a");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(404);
      }
    });
  });

  describe("requireCustomRowInOrg", () => {
    it("scopes row lookup through table organizationId", async () => {
      mocked.customDbRow.findFirst.mockResolvedValue(null);
      const result = await requireCustomRowInOrg("row-1", "org-a");
      expect(result.ok).toBe(false);
      expect(mocked.customDbRow.findFirst).toHaveBeenCalledWith({
        where: {
          id: "row-1",
          table: { organizationId: "org-a" },
        },
        select: { id: true },
      });
    });

    it("returns ok when row table is in org", async () => {
      mocked.customDbRow.findFirst.mockResolvedValue({ id: "row-1" });
      const result = await requireCustomRowInOrg("row-1", "org-a");
      expect(result.ok).toBe(true);
    });
  });
});
