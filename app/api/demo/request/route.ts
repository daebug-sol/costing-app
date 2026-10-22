import { NextResponse } from "next/server";
import { getUserEmail, requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** A signed-in user without an organization asks the operator for a demo code. */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const limited = await enforceRateLimit({
    orgId: `user:${userId}`,
    bucket: "demo-request",
    limit: 3,
    windowMs: 60 * 60_000,
    message: "Terlalu banyak permintaan. Coba lagi nanti.",
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const name = str(b.name, 120);
  const company = str(b.company, 160);
  const phone = str(b.phone, 40);
  if (!name || !company) {
    return NextResponse.json(
      { error: "Nama dan perusahaan wajib diisi." },
      { status: 400 }
    );
  }

  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json(
      { error: "Email akun tidak ditemukan." },
      { status: 400 }
    );
  }

  const pending = await prisma.demoRequest.findFirst({
    where: { userId, status: "pending" },
    select: { id: true },
  });
  if (pending) {
    return NextResponse.json({ ok: true, alreadyRequested: true });
  }

  await prisma.demoRequest.create({
    data: { userId, email, name, company, phone },
  });

  const notify = process.env.OPERATOR_NOTIFY_EMAIL;
  if (notify) {
    const sent = await sendMail({
      to: notify,
      subject: `Permintaan demo: ${company}`,
      text: [
        "Ada permintaan demo baru.",
        `Nama: ${name}`,
        `Perusahaan: ${company}`,
        `Email akun: ${email}`,
        `WA: ${phone || "-"}`,
        "",
        "Buat kode aktivasi di halaman /operator.",
      ].join("\n"),
    });
    if (!sent) logger.warn("demo request notify email not sent", { userId });
  }

  return NextResponse.json({ ok: true });
}
