import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import {
  ADMIN_ASSIGNABLE_ROLES,
  isOrgRole,
  ORG_ROLE_LABELS,
  parseOrgRole,
  type OrgRole,
} from "@/lib/org-roles";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "members:manage");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      members: members.map((m) => ({
        ...m,
        role: parseOrgRole(m.role),
        roleLabel: ORG_ROLE_LABELS[parseOrgRole(m.role)],
      })),
      roleLabels: ORG_ROLE_LABELS,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to list members" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "members:manage");
  if (denied) return denied;
  const { orgId, role: actorRole, userId: actorUserId } = guard;

  try {
    const body = (await request.json()) as {
      userId?: unknown;
      role?: unknown;
    };
    const targetUserId =
      typeof body.userId === "string" ? body.userId.trim() : "";
    if (!targetUserId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!isOrgRole(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    const nextRole: OrgRole = body.role;

    if (nextRole === "owner" && actorRole !== "owner") {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          error: "Only an owner can assign the owner role",
        },
        { status: 403 }
      );
    }

    if (actorRole !== "owner" && !ADMIN_ASSIGNABLE_ROLES.includes(nextRole)) {
      return NextResponse.json(
        { code: "FORBIDDEN", error: "Cannot assign that role" },
        { status: 403 }
      );
    }

    const target = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUserId,
        },
      },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const currentRole = parseOrgRole(target.role);
    if (currentRole === "owner" && nextRole !== "owner") {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: orgId, role: "owner" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          {
            code: "LAST_OWNER",
            error: "Cannot demote the last owner",
          },
          { status: 400 }
        );
      }
    }

    // Non-owners cannot change an owner’s role (including self-demotion via admin).
    if (currentRole === "owner" && actorRole !== "owner") {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          error: "Only an owner can change an owner's role",
        },
        { status: 403 }
      );
    }

    const updated = await prisma.organizationMember.update({
      where: { id: target.id },
      data: { role: nextRole },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ...updated,
      role: parseOrgRole(updated.role),
      roleLabel: ORG_ROLE_LABELS[parseOrgRole(updated.role)],
      updatedBy: actorUserId,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}
