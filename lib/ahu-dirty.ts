/** Stable, key-order-independent JSON so two equal param objects compare equal. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** True when the editor's AHU parameters differ from the last saved ones. */
export function isAhuParamsDirty(saved: unknown, current: unknown): boolean {
  return stableStringify(saved) !== stableStringify(current);
}
