import { isAhuParamsDirty } from "./ahu-dirty";

describe("isAhuParamsDirty", () => {
  it("is false for equal params regardless of key order", () => {
    expect(isAhuParamsDirty({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 })).toBe(false);
  });
  it("ignores undefined values", () => {
    expect(isAhuParamsDirty({ a: 1 }, { a: 1, b: undefined })).toBe(false);
  });
  it("is true when a value changes", () => {
    expect(isAhuParamsDirty({ nSections: 1 }, { nSections: 2 })).toBe(true);
  });
  it("detects arrays that differ", () => {
    expect(isAhuParamsDirty({ l: [1, 2] }, { l: [2, 1] })).toBe(true);
  });
});
