/** Pure helpers behind the personal dashboard home (target, pace, follow-ups). */

/** null clears the target; a finite number >= 0 sets it; anything else is invalid. */
export function parseMonthlyTarget(input: unknown): number | null | "invalid" {
  if (input === null) return null;
  if (typeof input === "number" && Number.isFinite(input) && input >= 0) return input;
  return "invalid";
}
