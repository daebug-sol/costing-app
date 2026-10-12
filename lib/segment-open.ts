/** Accordion helper: only `openId` is open; every other id is closed. */
export function openOnly(
  ids: readonly string[],
  openId: string | null
): Record<string, boolean> {
  return Object.fromEntries(ids.map((id) => [id, id === openId]));
}
