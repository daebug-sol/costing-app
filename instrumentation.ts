import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: process.env.NODE_ENV,
  });
}

export async function register() {
  if (dsn) {
    // Sentry Next.js SDK auto-instruments when DSN is set.
  }
}

export const onRequestError = dsn
  ? Sentry.captureRequestError
  : undefined;
