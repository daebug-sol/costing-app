import { subscribeTourEvents, tourEvent } from "@/lib/tour/events";

describe("tour events", () => {
  it("delivers event names to subscribers until they unsubscribe", () => {
    const seen: string[] = [];
    const off = subscribeTourEvents((name) => seen.push(name));
    tourEvent("costing.project-created");
    off();
    tourEvent("costing.item-added");
    expect(seen).toEqual(["costing.project-created"]);
  });

  it("is a no-op without subscribers", () => {
    expect(() => tourEvent("database.searched")).not.toThrow();
  });
});
