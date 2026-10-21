import { createHash, randomInt } from "crypto";

/** No 0/O/1/I/L so a code read aloud or typed from email is unambiguous. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUPS = 3;
const GROUP_LEN = 4;

export function generateActivationCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let part = "";
    for (let i = 0; i < GROUP_LEN; i++) {
      part += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(part);
  }
  return groups.join("-");
}

/** Uppercase and strip everything but the code alphabet, then regroup. */
export function normalizeActivationCode(input: string): string {
  const chars = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const out: string[] = [];
  for (let i = 0; i < chars.length; i += GROUP_LEN) {
    out.push(chars.slice(i, i + GROUP_LEN));
  }
  return out.join("-");
}

export function isWellFormedActivationCode(normalized: string): boolean {
  return /^[A-Z0-9]{4}(-[A-Z0-9]{4}){2}$/.test(normalized);
}

export function hashActivationCode(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex");
}

export type RedeemableRow = {
  email: string;
  expiresAt: Date;
  redeemedAt: Date | null;
};

export type RedeemCheck =
  | { ok: true }
  | { ok: false; reason: "used" | "expired" | "email_mismatch" };

export function checkRedeemable(
  row: RedeemableRow,
  accountEmail: string | null,
  now: Date = new Date()
): RedeemCheck {
  if (row.redeemedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (
    !accountEmail ||
    accountEmail.trim().toLowerCase() !== row.email.trim().toLowerCase()
  ) {
    return { ok: false, reason: "email_mismatch" };
  }
  return { ok: true };
}
