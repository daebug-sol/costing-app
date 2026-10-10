import { resolveManualSource } from "./manual-source-resolve";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    materialPrice: { findFirst: jest.fn(async () => null) },
    profileData: { findFirst: jest.fn(async () => null) },
    componentCatalog: { findFirst: jest.fn(async () => null) },
    customDbRow: { findFirst: jest.fn(async () => null) },
  },
}));

describe("resolveManualSource tenant scoping", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ["material", prisma.materialPrice, { id: "s1", organizationId: "org-a" }],
    ["profile", prisma.profileData, { id: "s1", organizationId: "org-a" }],
    ["component", prisma.componentCatalog, { id: "s1", organizationId: "org-a" }],
    ["custom", prisma.customDbRow, { id: "s1", table: { organizationId: "org-a" } }],
  ])("%s lookup is limited to the caller's org", async (type, model, where) => {
    expect(await resolveManualSource(type, "s1", "org-a")).toBeNull();
    expect((model.findFirst as jest.Mock).mock.calls[0][0].where).toEqual(where);
  });
});
