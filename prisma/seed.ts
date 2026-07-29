import "dotenv/config";
import {
  defaultAhuFileId,
  defaultAhuFolderId,
  defaultCustomFolderId,
  ensureDefaultFolders,
} from "../lib/database-folders";
import { prisma } from "../lib/prisma";

const ORG_A_ID = process.env.TEST_ORG_ID ?? "org_seed_a";
const ORG_B_ID = "org_seed_b";

async function seedOrg(
  id: string,
  slug: string,
  name: string,
  companyName: string,
  materialCodePrefix: string
) {
  await prisma.organization.upsert({
    where: { id },
    create: {
      id,
      slug,
      name,
      ahuModuleEnabled: true,
      settings: {
        create: { companyName, onboardingComplete: true },
      },
    },
    update: { name, ahuModuleEnabled: true },
  });

  await ensureDefaultFolders(id);

  const materials = [
    {
      code: `${materialCodePrefix}-SGCC-1.5`,
      name: "SGCC (GI) 1.5mm",
      category: "Sheet Metal",
      density: 8030,
      pricePerKg: 24000,
      currency: "IDR",
      unit: "kg",
    },
    {
      code: `${materialCodePrefix}-SUS304-1.5`,
      name: "SUS304 Stainless 1.5mm",
      category: "Sheet Metal",
      density: 7800,
      pricePerKg: 65000,
      currency: "IDR",
      unit: "kg",
    },
  ];

  const fileId = defaultAhuFileId(id, "materials");

  for (const mat of materials) {
    await prisma.materialPrice.upsert({
      where: {
        organizationId_code: {
          organizationId: id,
          code: mat.code,
        },
      },
      create: {
        organizationId: id,
        datasetFileId: fileId,
        ...mat,
      },
      update: mat,
    });
  }

  await prisma.costingProject.upsert({
    where: { id: `project_${slug}` },
    create: {
      id: `project_${slug}`,
      organizationId: id,
      name: `Demo Project ${name}`,
      status: "draft",
      qty: 1,
    },
    update: {},
  });

  console.log(`  ✓ ${name} (${id}) — folders: ${defaultCustomFolderId(id)}, ${defaultAhuFolderId(id)}`);
}

async function main() {
  console.log("Seeding multi-tenant data…");
  await seedOrg(ORG_A_ID, "thermal-true", "PT Thermal True", "PT Thermal True Indonesia", "TTI");
  await seedOrg(ORG_B_ID, "acme-hvac", "ACME HVAC", "ACME HVAC Indonesia", "ACME");
  console.log("✅ Seed complete — 2 organizations with isolated data");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
