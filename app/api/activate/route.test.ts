import { POST } from "@/app/api/activate/route";
import { hashActivationCode } from "@/lib/activation-code";
import { prisma } from "@/lib/prisma";
import { resetRateLimitMemory } from "@/lib/rate-limit";
import { seedDemoData } from "@/lib/demo-seed";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    activationCode: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    organization: { create: jest.fn() },
    demoRequest: { findFirst: jest.fn(), updateMany: jest.fn() },
  },
}));
jest.mock("@/lib/demo-seed", () => ({ seedDemoData: jest.fn() }));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const db = prisma as unknown as {
  activationCode: { findUnique: jest.Mock; updateMany: jest.Mock; update: jest.Mock };
  organization: { create: jest.Mock };
  demoRequest: { findFirst: jest.Mock; updateMany: jest.Mock };
};

const CODE = "ABCD-EFGH-JKMN";

function req(code: string) {
  return new Request("http://localhost/api/activate", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

function row(over: Record<string, unknown> = {}) {
  return {
    id: "c1",
    email: "klien@x.com",
    trialDays: 30,
    withDemoData: false,
    expiresAt: new Date(Date.now() + 86_400_000),
    redeemedAt: null,
    ...over,
  };
}

describe("POST /api/activate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimitMemory();
    process.env.TEST_USER_EMAIL = "klien@x.com";
    db.demoRequest.findFirst.mockResolvedValue({ company: "PT Klien" });
    db.activationCode.updateMany.mockResolvedValue({ count: 1 });
    db.organization.create.mockResolvedValue({ id: "org1" });
  });
  afterAll(() => {
    delete process.env.TEST_USER_EMAIL;
  });

  it("rejects malformed codes without a lookup", async () => {
    const res = await POST(req("nope"));
    expect(res.status).toBe(400);
    expect(db.activationCode.findUnique).not.toHaveBeenCalled();
  });

  it("rejects unknown codes", async () => {
    db.activationCode.findUnique.mockResolvedValue(null);
    expect((await POST(req(CODE))).status).toBe(400);
    expect(db.organization.create).not.toHaveBeenCalled();
  });

  it("rejects a code bound to a different email", async () => {
    db.activationCode.findUnique.mockResolvedValue(row({ email: "lain@x.com" }));
    expect((await POST(req(CODE))).status).toBe(400);
    expect(db.activationCode.updateMany).not.toHaveBeenCalled();
  });

  it("rejects when another request already claimed the code", async () => {
    db.activationCode.findUnique.mockResolvedValue(row());
    db.activationCode.updateMany.mockResolvedValue({ count: 0 });
    expect((await POST(req(CODE))).status).toBe(400);
    expect(db.organization.create).not.toHaveBeenCalled();
  });

  it("creates a trial org for a valid code", async () => {
    db.activationCode.findUnique.mockResolvedValue(row());
    const res = await POST(req("abcd efgh jkmn"));
    expect(res.status).toBe(200);
    expect(db.activationCode.findUnique).toHaveBeenCalledWith({
      where: { codeHash: hashActivationCode(CODE) },
    });
    const data = db.organization.create.mock.calls[0][0].data;
    expect(data.name).toBe("PT Klien");
    expect(data.plan).toBe("standard");
    expect(data.trialEndsAt).toBeInstanceOf(Date);
    expect(data.members.create.role).toBe("owner");
  });

  it("seeds sample data only when the code asks for it", async () => {
    db.activationCode.findUnique.mockResolvedValue(row());
    await POST(req(CODE));
    expect(seedDemoData).not.toHaveBeenCalled();

    resetRateLimitMemory();
    db.activationCode.findUnique.mockResolvedValue(row({ withDemoData: true }));
    const res = await POST(req(CODE));
    expect(seedDemoData).toHaveBeenCalledWith("org1", expect.objectContaining({ ownerUserId: expect.any(String) }));
    expect((await res.json()).seeded).toBe(true);
  });

  it("still activates when the sample seed fails", async () => {
    db.activationCode.findUnique.mockResolvedValue(row({ withDemoData: true }));
    (seedDemoData as jest.Mock).mockRejectedValueOnce(new Error("slow db"));
    const res = await POST(req(CODE));
    expect(res.status).toBe(200);
    expect((await res.json()).seeded).toBe(false);
    expect(db.activationCode.update).toHaveBeenCalledTimes(1); // redeemedOrgId only, not released
  });

  it("releases the code when org creation fails", async () => {
    db.activationCode.findUnique.mockResolvedValue(row());
    db.organization.create.mockRejectedValue(new Error("db down"));
    db.activationCode.update.mockResolvedValue({});
    const res = await POST(req(CODE));
    expect(res.status).toBe(500);
    expect(db.activationCode.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { redeemedAt: null, redeemedByUserId: null } })
    );
  });
});
