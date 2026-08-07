import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "@/lib/tenant-queries";

export async function GET(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();

    const rows = await prisma.customer.findMany({
      where: {
        ...tenantWhere.customers(orgId),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { company: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { company: "asc" }],
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal memuat pelanggan" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Nama pelanggan wajib diisi" },
        { status: 400 }
      );
    }

    const row = await prisma.customer.create({
      data: {
        organizationId: orgId,
        name,
        company: String(body.company ?? "").trim(),
        address: String(body.address ?? "").trim(),
        attn: String(body.attn ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        email:
          body.email === null || body.email === undefined || body.email === ""
            ? null
            : String(body.email).trim(),
        npwp:
          body.npwp === null || body.npwp === undefined || body.npwp === ""
            ? null
            : String(body.npwp).trim(),
        notes:
          body.notes === null || body.notes === undefined || body.notes === ""
            ? null
            : String(body.notes).trim(),
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal membuat pelanggan" },
      { status: 500 }
    );
  }
}
