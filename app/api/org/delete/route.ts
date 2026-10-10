import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { enforceRateLimit } from "@/lib/rate-limit";
import { deleteOrganizationData } from "@/lib/tenant-queries";

export async function DELETE(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "org:danger");
  if (denied) return denied;
  const { orgId, userId } = guard;

  const limited = await enforceRateLimit({
    orgId,
    bucket: "org-delete",
    limit: 3,
    windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      confirm?: string;
    };
    if (body.confirm !== "DELETE") {
      return NextResponse.json(
        { error: 'Kirim { "confirm": "DELETE" } untuk menghapus organisasi' },
        { status: 400 }
      );
    }

    await deleteOrganizationData(orgId);
    return NextResponse.json({ deleted: true, orgId, requestedBy: userId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
