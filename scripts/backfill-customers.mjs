#!/usr/bin/env node
/**
 * Idempotent backfill: unique clientName+clientCompany from Quotation → Customer,
 * then set Quotation.customerId. Snapshot text fields are left intact.
 *
 * Usage: node scripts/backfill-customers.mjs
 * Requires DATABASE_URL.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function normalizeKey(name, company) {
  const n = (name ?? "").trim().toLowerCase();
  const c = (company ?? "").trim().toLowerCase();
  return `${n}|${c}`;
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const orgs = await prisma.organization.findMany({ select: { id: true } });
    let created = 0;
    let linked = 0;

    for (const org of orgs) {
      const quotes = await prisma.quotation.findMany({
        where: { organizationId: org.id },
        select: {
          id: true,
          customerId: true,
          clientName: true,
          clientCompany: true,
          clientAddress: true,
          clientAttn: true,
          clientPhone: true,
        },
      });

      const existing = await prisma.customer.findMany({
        where: { organizationId: org.id },
      });
      const byKey = new Map(
        existing.map((c) => [normalizeKey(c.name, c.company), c])
      );

      for (const q of quotes) {
        const name = (q.clientName ?? "").trim();
        const company = (q.clientCompany ?? "").trim();
        if (!name && !company) continue;

        const key = normalizeKey(name || company, company);
        let customer = byKey.get(key);
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              organizationId: org.id,
              name: name || company || "Pelanggan",
              company,
              address: (q.clientAddress ?? "").trim(),
              attn: (q.clientAttn ?? "").trim(),
              phone: (q.clientPhone ?? "").trim(),
            },
          });
          byKey.set(key, customer);
          created += 1;
        }

        if (q.customerId !== customer.id) {
          await prisma.quotation.update({
            where: { id: q.id },
            data: { customerId: customer.id },
          });
          linked += 1;
        }
      }
    }

    console.log(
      JSON.stringify({ ok: true, customersCreated: created, quotationsLinked: linked })
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
