import { addDays, isTrialExpired, trialStateOf } from "@/lib/trial";

const now = new Date("2026-10-21T00:00:00Z");

describe("trial", () => {
  it("is not a trial without trialEndsAt", () => {
    expect(isTrialExpired(null, now)).toBe(false);
    expect(trialStateOf(null, now)).toEqual({ trial: false });
  });

  it("counts remaining days, rounding up", () => {
    const state = trialStateOf(addDays(now, 29.2), now);
    expect(state).toMatchObject({ trial: true, expired: false, daysLeft: 30 });
  });

  it("expires at the end instant", () => {
    expect(isTrialExpired(now, now)).toBe(true);
    expect(trialStateOf(addDays(now, -1), now)).toMatchObject({
      trial: true,
      expired: true,
      daysLeft: 0,
    });
  });
});
