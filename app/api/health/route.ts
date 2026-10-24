import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  let db: "ok" | "error" = "ok";
  // Two pings: the first may include opening the pool connection, the second
  // is one bare round trip between the function region and the database.
  const timings: number[] = [];
  try {
    for (let i = 0; i < 2; i++) {
      const start = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      timings.push(Math.round(performance.now() - start));
    }
  } catch {
    db = "error";
  }

  const status = db === "ok" ? "ok" : "degraded";
  const [connectMs, rttMs] = timings;

  return NextResponse.json(
    {
      status,
      version: packageJson.version,
      db,
      region: process.env.VERCEL_REGION ?? null,
    },
    {
      status: status === "ok" ? 200 : 503,
      headers:
        rttMs === undefined
          ? undefined
          : { "Server-Timing": `db-first;dur=${connectMs}, db-rtt;dur=${rttMs}` },
    }
  );
}
