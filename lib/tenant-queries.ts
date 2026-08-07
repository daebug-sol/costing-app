import { prisma } from "@/lib/prisma";

/** Typed where-clause helpers — centralize organization scoping. */
export const tenantWhere = {
  projects: (orgId: string) => ({ organizationId: orgId }),
  quotations: (orgId: string) => ({ organizationId: orgId }),
  materials: (orgId: string) => ({ organizationId: orgId }),
  profiles: (orgId: string) => ({ organizationId: orgId }),
  components: (orgId: string) => ({ organizationId: orgId }),
  customTables: (orgId: string) => ({ organizationId: orgId }),
  folders: (orgId: string) => ({ organizationId: orgId }),
  settings: (orgId: string) => ({ organizationId: orgId }),
  customers: (orgId: string) => ({ organizationId: orgId }),
  salesOrders: (orgId: string) => ({ organizationId: orgId }),
  deliveryOrders: (orgId: string) => ({ organizationId: orgId }),
  invoices: (orgId: string) => ({ organizationId: orgId }),
  payments: (orgId: string) => ({ organizationId: orgId }),
  project: (orgId: string, projectId: string) => ({
    id: projectId,
    organizationId: orgId,
  }),
  quotation: (orgId: string, quotationId: string) => ({
    id: quotationId,
    organizationId: orgId,
  }),
  customer: (orgId: string, customerId: string) => ({
    id: customerId,
    organizationId: orgId,
  }),
  salesOrder: (orgId: string, soId: string) => ({
    id: soId,
    organizationId: orgId,
  }),
  deliveryOrder: (orgId: string, doId: string) => ({
    id: doId,
    organizationId: orgId,
  }),
  invoice: (orgId: string, invId: string) => ({
    id: invId,
    organizationId: orgId,
  }),
  payment: (orgId: string, payId: string) => ({
    id: payId,
    organizationId: orgId,
  }),
  material: (orgId: string, id: string) => ({
    id,
    organizationId: orgId,
  }),
  profile: (orgId: string, id: string) => ({
    id,
    organizationId: orgId,
  }),
  component: (orgId: string, id: string) => ({
    id,
    organizationId: orgId,
  }),
  customTable: (orgId: string, tableId: string) => ({
    id: tableId,
    organizationId: orgId,
  }),
  folder: (orgId: string, folderId: string) => ({
    id: folderId,
    organizationId: orgId,
  }),
};

export async function getOrCreateSettings(orgId: string) {
  return prisma.appSettings.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      companyName: "PT Thermal True Indonesia",
    },
    update: {},
  });
}

export async function listProjectsForOrg(orgId: string) {
  return prisma.costingProject.findMany({
    where: tenantWhere.projects(orgId),
    orderBy: { updatedAt: "desc" },
  });
}

export async function listQuotationsForOrg(orgId: string) {
  return prisma.quotation.findMany({
    where: tenantWhere.quotations(orgId),
    orderBy: { updatedAt: "desc" },
  });
}

export async function listMaterialsForOrg(
  orgId: string,
  datasetFileId?: string | null
) {
  return prisma.materialPrice.findMany({
    where: {
      organizationId: orgId,
      ...(datasetFileId ? { datasetFileId } : {}),
    },
    orderBy: { code: "asc" },
  });
}

export async function listProfilesForOrg(
  orgId: string,
  datasetFileId?: string | null
) {
  return prisma.profileData.findMany({
    where: {
      organizationId: orgId,
      ...(datasetFileId ? { datasetFileId } : {}),
    },
    orderBy: { code: "asc" },
  });
}

export async function listComponentsForOrg(
  orgId: string,
  datasetFileId?: string | null
) {
  return prisma.componentCatalog.findMany({
    where: {
      organizationId: orgId,
      ...(datasetFileId ? { datasetFileId } : {}),
    },
    orderBy: { code: "asc" },
  });
}

export async function exportOrgData(orgId: string) {
  const [
    organization,
    settings,
    projects,
    quotations,
    materials,
    profiles,
    components,
    customTables,
    folders,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.appSettings.findUnique({ where: { organizationId: orgId } }),
    prisma.costingProject.findMany({
      where: { organizationId: orgId },
      include: {
        segments: {
          include: {
            sections: { include: { lineItems: true } },
            manualGroups: { include: { items: true } },
          },
        },
      },
    }),
    prisma.quotation.findMany({
      where: { organizationId: orgId },
      include: { items: true },
    }),
    prisma.materialPrice.findMany({ where: { organizationId: orgId } }),
    prisma.profileData.findMany({ where: { organizationId: orgId } }),
    prisma.componentCatalog.findMany({ where: { organizationId: orgId } }),
    prisma.customDbTable.findMany({
      where: { organizationId: orgId },
      include: { columns: true, rows: { include: { cells: true } } },
    }),
    prisma.databaseFolder.findMany({
      where: { organizationId: orgId },
      include: { ahuFiles: true },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    organization,
    settings,
    projects,
    quotations,
    materials,
    profiles,
    components,
    customTables,
    folders,
  };
}

export async function deleteOrganizationData(orgId: string) {
  await prisma.organization.delete({ where: { id: orgId } });
}
