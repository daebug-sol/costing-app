import { openOnly } from "@/lib/segment-open";

describe("openOnly", () => {
  it("opens exactly one id", () => {
    expect(openOnly(["a", "b"], "b")).toEqual({ a: false, b: true });
  });

  it("closes everything for null", () => {
    expect(openOnly(["a"], null)).toEqual({ a: false });
  });

  it("ignores an id that is not in the list", () => {
    expect(openOnly(["a"], "zzz")).toEqual({ a: false });
  });
});
