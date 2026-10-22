import { logger } from "@/lib/logger";

/**
 * Minimal transactional mail via the Resend REST API. Without RESEND_API_KEY
 * and MAIL_FROM it does nothing and reports false, so callers must never
 * depend on delivery for correctness (requests are also stored in the DB).
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      logger.warn("mail send failed", { status: res.status });
      return false;
    }
    return true;
  } catch (e) {
    logger.warn("mail send error", { error: String(e) });
    return false;
  }
}
