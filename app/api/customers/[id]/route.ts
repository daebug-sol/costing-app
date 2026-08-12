import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireCustomerInOrg } from "@/lib/tenant-context";
import { tenantWhere } from "@/lib/tenant-queries";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireCustomerInOrg(id, orgId);
    if (!check.ok) return check.response;

    const row = await prisma.customer.findFirst({
      where: tenantWhere.customer(orgId, id),
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal memuat pelanggan" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "customers:write");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireCustomerInOrg(id, orgId);
    if (!check.ok) return check.response;

    const body = (await request.json()) as Record<string, unknown>;
    const data: {
      name?: string;
      company?: string;
      address?: string;
      attn?: string;
      phone?: string;
      email?: string | null;
      npwp?: string | null;
      notes?: string | null;
    } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json(
          { error: "Nama pelanggan wajib diisi" },
          { status: 400 }
        );
      }
      data.name = name;
    }
    if (body.company !== undefined) data.company = String(body.company).trim();
    if (body.address !== undefined) data.address = String(body.address).trim();
    if (body.attn !== undefined) data.attn = String(body.attn).trim();
    if (body.phone !== undefined) data.phone = String(body.phone).trim();
    if (body.email !== undefined) {
      data.email =
        body.email === null || body.email === ""
          ? null
          : String(body.email).trim();
    }
    if (body.npwp !== undefined) {
      data.npwp =
        body.npwp === null || body.npwp === ""
          ? null
          : String(body.npwp).trim();
    }
    if (body.notes !== undefined) {
      data.notes =
        body.notes === null || body.notes === ""
          ? null
          : String(body.notes).trim();
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada field untuk diubah" },
        { status: 400 }
      );
    }

    const updated = await prisma.customer.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal memperbarui pelanggan" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "customers:write");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireCustomerInOrg(id, orgId);
    if (!check.ok) return check.response;

    await prisma.customer.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    console.error(e);
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "Pelanggan masih dipakai di dokumen. Hapus atau ubah referensi terlebih dahulu.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Gagal menghapus pelanggan" },
      { status: 500 }
    );
  }
}
