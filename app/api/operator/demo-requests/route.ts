import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";

/** Pending demo requests across all users (operator only). */
export async function GET(request: Request) {
  const auth = await requireOperator(request);
  if (!auth.ok) return auth.response;

  const requests = await prisma.demoRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      phone: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ requests });
}
