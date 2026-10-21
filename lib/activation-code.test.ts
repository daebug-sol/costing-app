import {
  checkRedeemable,
  generateActivationCode,
  hashActivationCode,
  isWellFormedActivationCode,
  normalizeActivationCode,
} from "@/lib/activation-code";

const now = new Date("2026-10-21T00:00:00Z");
const future = new Date("2026-10-25T00:00:00Z");

describe("activation code", () => {
  it("generates well-formed, distinct codes without ambiguous characters", () => {
    const a = generateActivationCode();
    expect(isWellFormedActivationCode(a)).toBe(true);
    expect(a).not.toMatch(/[01OIL]/);
    expect(generateActivationCode()).not.toBe(a);
  });

  it("normalizes user input", () => {
    expect(normalizeActivationCode(" abcd efgh-jkmn ")).toBe("ABCD-EFGH-JKMN");
    expect(isWellFormedActivationCode(normalizeActivationCode("abc"))).toBe(false);
  });

  it("hashes deterministically without storing the code", () => {
    const h = hashActivationCode("ABCD-EFGH-JKMN");
    expect(h).toHaveLength(64);
    expect(h).toBe(hashActivationCode("ABCD-EFGH-JKMN"));
    expect(h).not.toContain("ABCD");
  });

  it("checks redeemability", () => {
    const row = { email: "a@x.com", expiresAt: future, redeemedAt: null };
    expect(checkRedeemable(row, "A@x.com", now)).toEqual({ ok: true });
    expect(checkRedeemable(row, "b@x.com", now)).toEqual({ ok: false, reason: "email_mismatch" });
    expect(checkRedeemable(row, null, now)).toEqual({ ok: false, reason: "email_mismatch" });
    expect(checkRedeemable({ ...row, redeemedAt: now }, "a@x.com", now)).toEqual({ ok: false, reason: "used" });
    expect(checkRedeemable({ ...row, expiresAt: now }, "a@x.com", now)).toEqual({ ok: false, reason: "expired" });
  });
});
