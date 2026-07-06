import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  let db: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }

  const status = db === "ok" ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      version: packageJson.version,
      db,
    },
    { status: status === "ok" ? 200 : 503 }
  );
}
