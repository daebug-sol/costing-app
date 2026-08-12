import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { permissionsFor } from "@/lib/permissions";

/** Lightweight session caps for the active org member. */
export async function GET() {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { role, userId, orgId } = guard;
  return NextResponse.json({
    userId,
    orgId,
    role,
    permissions: permissionsFor(role),
  });
}
