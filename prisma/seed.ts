import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "PT Thermal True Indonesia",
      forexUSD: 15800,
      forexEUR: 17200,
      forexRM: 3500,
      forexSGD: 11700,
      defaultOverhead: 5.0,
      defaultContingency: 3.0,
      defaultMargin: 20.0,
      ppnRate: 11.0,
    },
  });

  const materials = [
    {
      code: "SGCC-1.0",
      name: "SGCC (GI) 1.0mm",
      category: "Sheet Metal",
      density: 8030,
      pricePerKg: 22500,
      currency: "IDR",
      unit: "kg",
      notes: "Galvanised Steel Sheet",
    },
    {
      code: "SGCC-1.5",
      name: "SGCC (GI) 1.5mm",
      category: "Sheet Metal",
      density: 8030,
      pricePerKg: 24000,
      currency: "IDR",
      unit: "kg",
      notes: "Galvanised Steel Sheet",
    },
    {
      code: "SPHC-1.0",
      name: "SPHC (Hot Rolled) 1.0mm",
      category: "Sheet Metal",
      density: 7700,
      pricePerKg: 18000,
      currency: "IDR",
      unit: "kg",
      notes: "Hot Rolled Steel",
    },
    {
      code: "SUS304-1.5",
      name: "SUS304 Stainless 1.5mm",
      category: "Sheet Metal",
      density: 7800,
      pricePerKg: 65000,
      currency: "IDR",
      unit: "kg",
      notes: "Stainless Steel 304",
    },
    {
      code: "SUS316-1.5",
      name: "SUS316L Stainless 1.5mm",
      category: "Sheet Metal",
      density: 8000,
      pricePerKg: 90000,
      currency: "IDR",
      unit: "kg",
      notes: "Stainless Steel 316L",
    },
    {
      code: "AL6063",
      name: "Aluminium 6063 Extrusion",
      category: "Aluminium",
      density: 2720,
      pricePerKg: 94085,
      currency: "IDR",
      unit: "kg",
      notes: "Mill finished profile",
    },
    {
      code: "COPPER-TUBE",
      name: "Copper Tube",
      category: "Copper",
      density: 8900,
      pricePerKg: 207000,
      currency: "IDR",
      unit: "kg",
      notes: "For coil tubes",
    },
    {
      code: "AL-FIN",
      name: "Aluminium Fin 0.11mm",
      category: "Aluminium",
      density: 2700,
      pricePerKg: 108000,
      currency: "IDR",
      unit: "kg",
      notes: "Coil fin stock",
    },
    {
      code: "PU-FOAM",
      name: "Polyurethane Foam 40kg/m3",
      category: "Insulation",
      density: 40,
      pricePerKg: 50000,
      currency: "IDR",
      unit: "kg",
      notes: "Panel insulation 50mm",
    },
    {
      code: "UNP100-304",
      name: "UNP100 SUS304 Channel",
      category: "Steel Section",
      density: 7800,
      pricePerKg: 30000,
      currency: "IDR",
      unit: "kg",
      notes: "For skid/base frame",
    },
  ];
  for (const mat of materials) {
    await prisma.materialPrice.upsert({
      where: { code: mat.code },
      update: mat,
      create: mat,
    });
  }

  const profiles = [
    {
      code: "1540T-NA06",
      name: "Pentapost DS1540 NA06",
      type: "Pentapost",
      weightPerM: 0.711,
      pricePerM: 46215,
      panelThick: 15,
    },
    {
      code: "2540Y-NA06",
      name: "Pentapost DS2540 NA06",
      type: "Pentapost",
      weightPerM: 1.337,
      pricePerM: 130250,
      panelThick: 25,
    },
    {
      code: "5060Y-NA06",
      name: "Pentapost DS5060 NA06",
      type: "Pentapost",
      weightPerM: 1.773,
      pricePerM: 174015,
      panelThick: 50,
    },
    {
      code: "5060Y-NA20",
      name: "Pentapost DS5060 NA20",
      type: "Pentapost",
      weightPerM: 1.773,
      pricePerM: 181310,
      panelThick: 50,
    },
    {
      code: "5060N-NA06",
      name: "Interpost DS5060 NA06",
      type: "Interpost",
      weightPerM: 1.612,
      pricePerM: 126976,
      panelThick: 50,
    },
    {
      code: "5060A-NA20",
      name: "Centerpost DS5060 NA20",
      type: "Centerpost",
      weightPerM: 1.933,
      pricePerM: 183476,
      panelThick: 50,
    },
    {
      code: "PANEL-CLIP-50",
      name: "Panel Clip 50mm",
      type: "Clip",
      weightPerM: 0.227,
      pricePerM: 24358,
      panelThick: 50,
    },
    {
      code: "CORNER-NA06",
      name: "Cornerpiece DS5060",
      type: "Cornerpiece",
      weightPerM: 0.57476,
      pricePerM: 90500,
      panelThick: 50,
    },
    {
      code: "OMEGA-NA06",
      name: "Omega Joint DS5060",
      type: "Omega",
      weightPerM: 0.036,
      pricePerM: 14500,
      panelThick: 50,
    },
    {
      code: "GASKET-3MM",
      name: "Gasket 3mmT x 18mmW",
      type: "Gasket",
      weightPerM: 0.00135,
      pricePerM: 24991,
      panelThick: null,
    },
    {
      code: "RUBBER-INSERT",
      name: "Rubber Insert",
      type: "Rubber",
      weightPerM: 0.00135,
      pricePerM: 9000,
      panelThick: null,
    },
  ];
  for (const prof of profiles) {
    await prisma.profileData.upsert({
      where: { code: prof.code },
      update: prof,
      create: prof,
    });
  }

  const components = [
    {
      code: "FILTER-G4-50",
      name: "Panel Filter G4 50mm",
      category: "Filter",
      subcategory: "Pre-Filter",
      brand: "Generic",
      spec: "Synthetic Fibre Washable, MERV6",
      unitPrice: 350000,
      currency: "IDR",
      unit: "pcs",
    },
    {
      code: "FILTER-F8-292",
      name: "Bag Filter F8 292mm",
      category: "Filter",
      subcategory: "Bag Filter",
      brand: "Generic",
      spec: "Rigid Fiber Glass, MERV14",
      unitPrice: 850000,
      currency: "IDR",
      unit: "pcs",
    },
    {
      code: "DRAIN-PAN-SS304",
      name: "Drain Pan SS304",
      category: "Drain Pan",
      subcategory: null,
      brand: null,
      spec: "450mm depth, SS304",
      unitPrice: 1800000,
      currency: "IDR",
      unit: "pcs",
    },
    {
      code: "ACCESS-DOOR-576",
      name: "Access Door Hinged",
      category: "Access Door",
      subcategory: null,
      brand: null,
      spec: "881H x 576W mm",
      unitPrice: 1200000,
      currency: "IDR",
      unit: "pcs",
    },
    {
      code: "SPRING-ISOLATOR",
      name: "Spring Isolator",
      category: "Vibration",
      subcategory: null,
      brand: null,
      spec: "Anti-vibration spring mount",
      unitPrice: 350000,
      currency: "IDR",
      unit: "pcs",
    },
    {
      code: "FLEX-CONN",
      name: "Flexible Connector",
      category: "Duct",
      subcategory: null,
      brand: null,
      spec: "Canvas flexible connector",
      unitPrice: 450000,
      currency: "IDR",
      unit: "pcs",
    },
  ];
  for (const comp of components) {
    await prisma.componentCatalog.upsert({
      where: { code: comp.code },
      update: comp,
      create: comp,
    });
  }

  console.log("✅ Seed data berhasil dimasukkan");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
