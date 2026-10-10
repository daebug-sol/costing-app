import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { enforceRateLimit } from "@/lib/rate-limit";
import { exportOrgData } from "@/lib/tenant-queries";

export async function GET() {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  const limited = await enforceRateLimit({
    orgId,
    bucket: "org-export",
    limit: 3,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const payload = await exportOrgData(orgId);
    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="org-export-${orgId}.json"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
