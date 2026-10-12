import { nextSaveState } from "@/lib/save-state";

describe("nextSaveState", () => {
  it("follows start -> ok / fail -> reset", () => {
    expect(nextSaveState("idle", "start")).toBe("saving");
    expect(nextSaveState("saving", "ok")).toBe("saved");
    expect(nextSaveState("saving", "fail")).toBe("error");
    expect(nextSaveState("error", "start")).toBe("saving");
    expect(nextSaveState("saved", "reset")).toBe("idle");
  });

  it("ignores ok when nothing is saving", () => {
    expect(nextSaveState("idle", "ok")).toBe("idle");
  });
});
