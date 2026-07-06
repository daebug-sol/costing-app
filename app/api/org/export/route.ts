import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { exportOrgData } from "@/lib/tenant-queries";

export async function GET() {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

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
