import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type OrgModules = {
  ahu: boolean;
};

export async function getOrgModules(orgId: string): Promise<OrgModules> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ahuModuleEnabled: true },
  });
  return { ahu: org?.ahuModuleEnabled === true };
}

export type RequireAhuModuleResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export async function requireAhuModule(
  orgId: string
): Promise<RequireAhuModuleResult> {
  const modules = await getOrgModules(orgId);
  if (modules.ahu) return { ok: true };
  return {
    ok: false,
    response: NextResponse.json(
      { error: "AHU module not enabled", code: "AHU_MODULE_DISABLED" },
      { status: 403 }
    ),
  };
}
