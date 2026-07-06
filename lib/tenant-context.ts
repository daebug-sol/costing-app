import { NextResponse } from "next/server";
import { getClerkOrgId, getSessionUserId, isAuthBypassed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function resolveOrganizationId(
  clerkOrgId: string,
  userId: string
): Promise<string> {
  const existing = await prisma.organization.findUnique({
    where: { clerkOrgId },
  });
  if (existing) return existing.id;

  const slug = `org-${clerkOrgId.slice(-8).toLowerCase()}`;
  const org = await prisma.organization.create({
    data: {
      clerkOrgId,
      name: "Organization",
      slug,
      members: {
        create: { userId, role: "owner" },
      },
      settings: {
        create: {
          companyName: "My Company",
        },
      },
    },
  });
  return org.id;
}

export async function getActiveOrganizationId(): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  if (isAuthBypassed()) {
    return process.env.TEST_ORG_ID ?? "org_test";
  }

  const clerkOrgId = await getClerkOrgId();
  if (!clerkOrgId) return null;

  return resolveOrganizationId(clerkOrgId, userId);
}

type OrgSuccess = { orgId: string; userId: string };
type OrgFailure = { response: NextResponse };

export async function requireOrganization(): Promise<OrgSuccess | OrgFailure> {
  const auth = await import("@/lib/auth").then((m) => m.requireAuth());
  if ("response" in auth) return auth;

  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return {
      response: NextResponse.json(
        { error: "No active organization" },
        { status: 403 }
      ),
    };
  }

  return { orgId, userId: auth.userId };
}

export async function assertProjectInOrg(
  projectId: string,
  orgId: string
): Promise<boolean> {
  const project = await prisma.costingProject.findFirst({
    where: { id: projectId, organizationId: orgId },
    select: { id: true },
  });
  return project !== null;
}

export async function requireProjectInOrg(
  projectId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const inOrg = await assertProjectInOrg(projectId, orgId);
  if (!inOrg) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { ok: true };
}

export async function requireQuotationInOrg(
  quotationId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const q = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId },
    select: { id: true },
  });
  if (!q) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { ok: true };
}

export async function requireCustomTableInOrg(
  tableId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const table = await prisma.customDbTable.findFirst({
    where: { id: tableId, organizationId: orgId },
    select: { id: true },
  });
  if (!table) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { ok: true };
}

export async function requireFolderInOrg(
  folderId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const folder = await prisma.databaseFolder.findFirst({
    where: { id: folderId, organizationId: orgId },
    select: { id: true },
  });
  if (!folder) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { ok: true };
}

export async function requireAhuFileInOrg(
  fileId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const file = await prisma.ahuDatasetFile.findFirst({
    where: { id: fileId, folder: { organizationId: orgId } },
    select: { id: true },
  });
  if (!file) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { ok: true };
}

export async function requireSegmentInOrg(
  segmentId: string,
  projectId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const segment = await prisma.costingSegment.findFirst({
    where: {
      id: segmentId,
      projectId,
      project: { organizationId: orgId },
    },
    select: { id: true },
  });
  if (!segment) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { ok: true };
}

export async function requireSectionInOrg(
  sectionId: string,
  projectId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const section = await prisma.costingSection.findFirst({
    where: {
      id: sectionId,
      segment: {
        projectId,
        project: { organizationId: orgId },
      },
    },
    select: { id: true },
  });
  if (!section) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { ok: true };
}

export async function requireManualItemInOrg(
  itemId: string,
  projectId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const item = await prisma.manualCostingItem.findFirst({
    where: {
      id: itemId,
      group: {
        segment: {
          projectId,
          project: { organizationId: orgId },
        },
      },
    },
    select: { id: true },
  });
  if (!item) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { ok: true };
}

export async function requireCustomRowInOrg(
  rowId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const row = await prisma.customDbRow.findFirst({
    where: {
      id: rowId,
      table: { organizationId: orgId },
    },
    select: { id: true },
  });
  if (!row) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { ok: true };
}
