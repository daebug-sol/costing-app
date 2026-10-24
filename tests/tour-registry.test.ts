import { TOUR_KEYS, type Localized } from "@/lib/tour/types";
import { TUTORIALS, tutorialForRoute } from "@/content/tutorials";

function expectLocalized(value: Localized) {
  expect(value.id.trim()).not.toBe("");
  expect(value.en.trim()).not.toBe("");
}

describe("tour registry", () => {
  it("has a definition for every key, under its own key", () => {
    for (const key of TOUR_KEYS) {
      expect(TUTORIALS[key]?.key).toBe(key);
    }
  });

  it("keeps step ids unique within each tutorial and fully localized", () => {
    for (const key of TOUR_KEYS) {
      const ids = TUTORIALS[key].steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const step of TUTORIALS[key].steps) {
        expectLocalized(step.title);
        expectLocalized(step.body);
      }
    }
  });

  it("gives every module tutorial a route, a permission and an invite", () => {
    for (const key of TOUR_KEYS) {
      if (key === "welcome") continue;
      const def = TUTORIALS[key];
      expect(def.route).toMatch(/^\//);
      expect(def.permission).toBeTruthy();
      expect(def.invite?.minutes).toBeGreaterThan(0);
      expectLocalized(def.invite!.title);
    }
  });

  it("maps routes to their module tutorial", () => {
    expect(tutorialForRoute("/costing")?.key).toBe("costing");
    expect(tutorialForRoute("/costing/abc")?.key).toBe("costing");
    expect(tutorialForRoute("/")?.key).toBe("dashboard");
    expect(tutorialForRoute("/sales-orders")?.key).toBe("sales-orders");
    expect(tutorialForRoute("/operator")).toBeNull();
  });
});
