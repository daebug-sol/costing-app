/**
 * Demo organization seed: one year of realistic activity for client pitches.
 *
 *   npm run db:seed:demo            wipe + recreate the demo org's business data
 *   npm run db:seed:demo -- --reset delete the demo org entirely, then stop
 *
 * Touches ONLY the organization `org_demo_sinar_dingin`. Refuses to run against a
 * non-local database unless DEMO_SEED_ALLOW_REMOTE=1 (see docs/DEMO-ORG.md).
 * The generator lives in `lib/demo-seed.ts` (also used by trial organizations).
 *
 * Optional env: DEMO_CLERK_ORG_ID, DEMO_OWNER_USER_ID, DEMO_OWNER_NAME,
 * DEMO_VIEWER_USER_IDS (comma separated, read-only "ceo" role), DEMO_ANCHOR (YYYY-MM-DD).
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { seedDemoData, todayAnchor, wipeBusinessData } from "../lib/demo-seed";
import { DEMO_ORG_ID, DEMO_ORG_NAME, DEMO_ORG_SLUG, SALES } from "./demo/data";

function assertSafeTarget() {
  const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/costing_dev";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL tidak valid.");
  }
  const local = ["localhost", "127.0.0.1", "::1", "postgres", "db"].includes(host);
  if (!local && process.env.DEMO_SEED_ALLOW_REMOTE !== "1") {
    throw new Error(
      `Menolak berjalan ke database non-lokal (${host}). Set DEMO_SEED_ALLOW_REMOTE=1 hanya setelah persetujuan eksplisit.`
    );
  }
  console.log(`Target DB: ${host}${local ? " (lokal)" : " (REMOTE, diizinkan eksplisit)"}`);
}

function parseAnchor(): Date {
  const raw = process.env.DEMO_ANCHOR?.trim();
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T05:00:00Z`);
  return todayAnchor();
}

async function main() {
  assertSafeTarget();
  const orgId = DEMO_ORG_ID;

  if (process.argv.includes("--reset")) {
    await wipeBusinessData(orgId);
    await prisma.organization.deleteMany({ where: { id: orgId } });
    console.log(`Organisasi demo ${orgId} dihapus.`);
    return;
  }

  const anchor = parseAnchor();
  const ownerUserId = process.env.DEMO_OWNER_USER_ID?.trim() || "demo_sales_rina";
  const ownerName = process.env.DEMO_OWNER_NAME?.trim() || SALES[0].name;
  const clerkOrgId = process.env.DEMO_CLERK_ORG_ID?.trim() || null;
  const viewers = (process.env.DEMO_VIEWER_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  console.log(`Seeding organisasi demo (${orgId}), anchor ${anchor.toISOString().slice(0, 10)}…`);

  await prisma.organization.upsert({
    where: { id: orgId },
    create: {
      id: orgId, slug: DEMO_ORG_SLUG, name: DEMO_ORG_NAME, plan: "enterprise", ahuModuleEnabled: true,
      clerkOrgId,
      settings: {
        create: {
          companyName: "PT Sinar Dingin Nusantara",
          companyAddress: "Jl. Industri Raya Blok C-7, Kawasan Industri Jababeka, Cikarang, Bekasi",
          companyPhone: "021-8934-5521",
          companyEmail: "sales@sinardingin.example",
          onboardingComplete: true,
          presetSignedByName: ownerName,
        },
      },
    },
    update: { name: DEMO_ORG_NAME, plan: "enterprise", ahuModuleEnabled: true, ...(clerkOrgId ? { clerkOrgId } : {}) },
  });

  await seedDemoData(orgId, {
    anchor, ownerUserId, ownerName, viewerUserIds: viewers, idTag: "demo", log: (m) => console.log(m),
  });
  console.log("✅ Seed demo selesai. Jalankan ulang kapan saja untuk menyegarkan tanggal.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
