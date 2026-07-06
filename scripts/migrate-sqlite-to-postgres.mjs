#!/usr/bin/env node
/**
 * One-time migration: SQLite (better-sqlite3) → Postgres with default org assignment.
 * Usage: DATABASE_URL=postgresql://... SQLITE_PATH=./prisma/dev.db node scripts/migrate-sqlite-to-postgres.mjs
 */
import "dotenv/config";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const sqlitePath = process.env.SQLITE_PATH ?? "./prisma/dev.db";
const pg = new PrismaClient();

function readAll(db, table) {
  try {
    return db.prepare(`SELECT * FROM "${table}"`).all();
  } catch {
    return [];
  }
}

async function main() {
  const db = new Database(sqlitePath, { readonly: true });

  const org = await pg.organization.upsert({
    where: { slug: "migrated-default" },
    create: {
      name: "Migrated Organization",
      slug: "migrated-default",
      settings: { create: { companyName: "PT Thermal True Indonesia" } },
    },
    update: {},
  });
  const orgId = org.id;
  console.log("Target organization:", orgId);

  const settings = readAll(db, "AppSettings");
  if (settings.length > 0) {
    const s = settings[0];
    await pg.appSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...pickSettings(s) },
      update: pickSettings(s),
    });
  }

  for (const row of readAll(db, "CostingProject")) {
    await pg.costingProject.create({
      data: { ...row, organizationId: orgId },
    }).catch(() => {});
  }

  console.log("Migration complete — review counts in Postgres manually.");
  await pg.$disconnect();
  db.close();
}

function pickSettings(s) {
  const omit = ["id"];
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (!omit.includes(k)) out[k] = v;
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
