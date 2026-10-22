import { NextResponse } from "next/server";

/** Usage caps while an org is on a demo trial (enough to test a flow end to end). */
export const TRIAL_LIMITS = {
  maxProjects: 30,
  maxQuotations: 30,
} as const;

export const DEFAULT_TRIAL_DAYS = 30;
export const ACTIVATION_CODE_VALID_DAYS = 7;

const DAY_MS = 86_400_000;

export type TrialState =
  | { trial: false }
  | { trial: true; expired: boolean; trialEndsAt: string; daysLeft: number };

export function isTrialExpired(
  trialEndsAt: Date | null | undefined,
  now: Date = new Date()
): boolean {
  return trialEndsAt != null && trialEndsAt.getTime() <= now.getTime();
}

export function trialStateOf(
  trialEndsAt: Date | null | undefined,
  now: Date = new Date()
): TrialState {
  if (!trialEndsAt) return { trial: false };
  const expired = isTrialExpired(trialEndsAt, now);
  const daysLeft = expired
    ? 0
    : Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS);
  return { trial: true, expired, trialEndsAt: trialEndsAt.toISOString(), daysLeft };
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

export function trialExpiredResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Akses organisasi dibatasi: demo berakhir atau belum diaktifkan. Hubungi kami untuk melanjutkan.",
      code: "TRIAL_EXPIRED",
    },
    { status: 403 }
  );
}
