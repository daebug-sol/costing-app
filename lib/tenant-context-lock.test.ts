import { prisma } from "@/lib/prisma";
import { resolveOrganizationId } from "@/lib/tenant-context";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

const org = prisma.organization as unknown as {
  findUnique: jest.Mock;
  create: jest.Mock;
};

describe("resolveOrganizationId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns an existing org without creating", async () => {
    org.findUnique.mockResolvedValue({ id: "o1" });
    expect(await resolveOrganizationId("org_abc", "u1")).toBe("o1");
    expect(org.create).not.toHaveBeenCalled();
  });

  it("creates a never-activated org already locked", async () => {
    org.findUnique.mockResolvedValue(null);
    org.create.mockResolvedValue({ id: "o2" });
    const before = Date.now();
    await resolveOrganizationId("org_abc12345", "u1");
    const data = org.create.mock.calls[0][0].data;
    expect(data.trialEndsAt).toBeInstanceOf(Date);
    expect(data.trialEndsAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(data.trialEndsAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });
});
