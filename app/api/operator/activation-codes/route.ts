import { NextResponse } from "next/server";
import {
  generateActivationCode,
  hashActivationCode,
} from "@/lib/activation-code";
import { logger } from "@/lib/logger";
import { sendMail } from "@/lib/mailer";
import { requireOperator } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import {
  ACTIVATION_CODE_VALID_DAYS,
  DEFAULT_TRIAL_DAYS,
  addDays,
} from "@/lib/trial";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Recent activation codes, without the code itself (only its hash is stored). */
export async function GET(request: Request) {
  const auth = await requireOperator(request);
  if (!auth.ok) return auth.response;

  const codes = await prisma.activationCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      trialDays: true,
      withDemoData: true,
      expiresAt: true,
      redeemedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ codes });
}

/** Create a code for an account email. The plain code is returned once. */
export async function POST(request: Request) {
  const auth = await requireOperator(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
  }
  const days = Number(b.trialDays ?? DEFAULT_TRIAL_DAYS);
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    return NextResponse.json(
      { error: "trialDays harus 1 sampai 90" },
      { status: 400 }
    );
  }
  const withDemoData = b.withDemoData === true;

  const code = generateActivationCode();
  const expiresAt = addDays(new Date(), ACTIVATION_CODE_VALID_DAYS);
  await prisma.activationCode.create({
    data: {
      codeHash: hashActivationCode(code),
      email,
      trialDays: days,
      withDemoData,
      expiresAt,
    },
  });

  let emailed = false;
  if (b.sendEmail === true) {
    emailed = await sendMail({
      to: email,
      subject: "Kode aktivasi demo Costing App",
      text: [
        "Terima kasih sudah mencoba Costing App.",
        "",
        `Kode aktivasi Anda: ${code}`,
        `Berlaku sampai ${expiresAt.toLocaleDateString("id-ID")}. Masukkan kode setelah masuk dengan email ini; demo aktif ${days} hari.`,
      ].join("\n"),
    });
    if (!emailed) logger.warn("activation email not sent", { email });
  }

  return NextResponse.json({ code, emailed, expiresAt }, { status: 201 });
}
