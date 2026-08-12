/**
 * @jest-environment node
 */
import {
  isOperatorApiKey,
  isOperatorUserId,
  parseOperatorUserIds,
  requireOperator,
} from "@/lib/operator-auth";
import { resolveOperatorOrgPatch } from "@/lib/operator-org-patch";

jest.mock("@/lib/auth", () => ({
  getSessionUserId: jest.fn(),
}));

import { getSessionUserId } from "@/lib/auth";

const mockedGetSessionUserId = getSessionUserId as jest.MockedFunction<
  typeof getSessionUserId
>;

describe("parseOperatorUserIds", () => {
  const prev = process.env.OPERATOR_USER_IDS;

  afterEach(() => {
    if (prev === undefined) delete process.env.OPERATOR_USER_IDS;
    else process.env.OPERATOR_USER_IDS = prev;
  });

  it("returns empty when unset (fail closed)", () => {
    delete process.env.OPERATOR_USER_IDS;
    expect(parseOperatorUserIds()).toEqual([]);
  });

  it("parses comma-separated IDs with trim", () => {
    process.env.OPERATOR_USER_IDS = " user_a ,user_b,  ";
    expect(parseOperatorUserIds()).toEqual(["user_a", "user_b"]);
  });
});

describe("isOperatorUserId", () => {
  const prev = process.env.OPERATOR_USER_IDS;

  afterEach(() => {
    if (prev === undefined) delete process.env.OPERATOR_USER_IDS;
    else process.env.OPERATOR_USER_IDS = prev;
  });

  it("is false when allowlist empty", () => {
    delete process.env.OPERATOR_USER_IDS;
    expect(isOperatorUserId("test-user")).toBe(false);
  });

  it("treats TEST_USER_ID as operator when listed", () => {
    process.env.OPERATOR_USER_IDS = "test-user,other";
    expect(isOperatorUserId("test-user")).toBe(true);
    expect(isOperatorUserId("nope")).toBe(false);
  });
});

describe("isOperatorApiKey", () => {
  const prev = process.env.OPERATOR_API_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.OPERATOR_API_KEY;
    else process.env.OPERATOR_API_KEY = prev;
  });

  it("returns false when key unset (fail closed)", () => {
    delete process.env.OPERATOR_API_KEY;
    const req = new Request("http://localhost", {
      headers: { Authorization: "Bearer secret" },
    });
    expect(isOperatorApiKey(req)).toBe(false);
  });

  it("accepts matching Bearer key", () => {
    process.env.OPERATOR_API_KEY = "op-secret-key";
    const req = new Request("http://localhost", {
      headers: { Authorization: "Bearer op-secret-key" },
    });
    expect(isOperatorApiKey(req)).toBe(true);
  });

  it("rejects wrong key", () => {
    process.env.OPERATOR_API_KEY = "op-secret-key";
    const req = new Request("http://localhost", {
      headers: { Authorization: "Bearer wrong" },
    });
    expect(isOperatorApiKey(req)).toBe(false);
  });
});

describe("requireOperator", () => {
  const prevIds = process.env.OPERATOR_USER_IDS;
  const prevKey = process.env.OPERATOR_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.OPERATOR_USER_IDS;
    delete process.env.OPERATOR_API_KEY;
  });

  afterEach(() => {
    if (prevIds === undefined) delete process.env.OPERATOR_USER_IDS;
    else process.env.OPERATOR_USER_IDS = prevIds;
    if (prevKey === undefined) delete process.env.OPERATOR_API_KEY;
    else process.env.OPERATOR_API_KEY = prevKey;
  });

  it("returns 401 when neither key nor session", async () => {
    mockedGetSessionUserId.mockResolvedValue(null);
    const result = await requireOperator(new Request("http://localhost"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
  });

  it("returns 403 when signed in but not allowlisted", async () => {
    mockedGetSessionUserId.mockResolvedValue("test-user");
    process.env.OPERATOR_USER_IDS = "someone-else";
    const result = await requireOperator(new Request("http://localhost"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(403);
  });

  it("accepts allowlisted session user", async () => {
    mockedGetSessionUserId.mockResolvedValue("test-user");
    process.env.OPERATOR_USER_IDS = "test-user";
    const result = await requireOperator(new Request("http://localhost"));
    expect(result).toEqual({
      ok: true,
      userId: "test-user",
      via: "user",
    });
  });

  it("accepts Bearer API key without session", async () => {
    mockedGetSessionUserId.mockResolvedValue(null);
    process.env.OPERATOR_API_KEY = "op-secret-key";
    const req = new Request("http://localhost", {
      headers: { Authorization: "Bearer op-secret-key" },
    });
    const result = await requireOperator(req);
    expect(result).toEqual({ ok: true, via: "api_key" });
  });
});

describe("resolveOperatorOrgPatch", () => {
  it("forces AHU off when plan is free", () => {
    const result = resolveOperatorOrgPatch(
      { plan: "enterprise", ahuModuleEnabled: true },
      { plan: "free", ahuModuleEnabled: true }
    );
    expect(result).toEqual({
      ok: true,
      data: { plan: "free", ahuModuleEnabled: false },
    });
  });

  it("rejects AHU on without enterprise", () => {
    const result = resolveOperatorOrgPatch(
      { plan: "standard", ahuModuleEnabled: false },
      { ahuModuleEnabled: true }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_ENTITLEMENTS");
  });

  it("rejects plan standard while AHU remains on", () => {
    const result = resolveOperatorOrgPatch(
      { plan: "enterprise", ahuModuleEnabled: true },
      { plan: "standard" }
    );
    expect(result.ok).toBe(false);
  });

  it("allows enterprise + AHU on", () => {
    const result = resolveOperatorOrgPatch(
      { plan: "free", ahuModuleEnabled: false },
      { plan: "enterprise", ahuModuleEnabled: true }
    );
    expect(result).toEqual({
      ok: true,
      data: { plan: "enterprise", ahuModuleEnabled: true },
    });
  });
});
