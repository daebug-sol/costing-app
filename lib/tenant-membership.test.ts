/**
 * Membership upsert + auth-bypass role defaults.
 */
import { bypassOrgRole, ensureOrganizationMember } from "@/lib/tenant-context";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mocked = prisma as unknown as {
  organizationMember: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

describe("ensureOrganizationMember", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TEST_ORG_ROLE;
  });

  it("returns existing role without overwrite", async () => {
    mocked.organizationMember.findUnique.mockResolvedValue({ role: "sales" });
    await expect(ensureOrganizationMember("org-a", "u1")).resolves.toBe(
      "sales"
    );
    expect(mocked.organizationMember.create).not.toHaveBeenCalled();
  });

  it("creates member when missing", async () => {
    mocked.organizationMember.findUnique.mockResolvedValue(null);
    mocked.organizationMember.create.mockResolvedValue({ role: "member" });
    await expect(ensureOrganizationMember("org-a", "u1")).resolves.toBe(
      "member"
    );
    expect(mocked.organizationMember.create).toHaveBeenCalledWith({
      data: { organizationId: "org-a", userId: "u1", role: "member" },
      select: { role: true },
    });
  });
});

describe("bypassOrgRole", () => {
  afterEach(() => {
    delete process.env.TEST_ORG_ROLE;
  });

  it("defaults to owner", () => {
    delete process.env.TEST_ORG_ROLE;
    expect(bypassOrgRole()).toBe("owner");
  });

  it("honors TEST_ORG_ROLE", () => {
    process.env.TEST_ORG_ROLE = "ppic";
    expect(bypassOrgRole()).toBe("ppic");
  });
});
