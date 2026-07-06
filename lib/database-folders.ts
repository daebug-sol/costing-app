import { prisma } from "@/lib/prisma";
import {
  AHU_DATASET_KINDS,
  type AhuDatasetKind,
  type DatabaseScope,
  defaultAhuFileId,
  defaultAhuFolderId,
  defaultCustomFolderId,
} from "@/lib/database-folders-constants";

export * from "@/lib/database-folders-constants";

export function folderListOrder() {
  return [{ sortOrder: "asc" as const }, { name: "asc" as const }];
}

export function fileListOrder() {
  return [{ sortOrder: "asc" as const }, { name: "asc" as const }];
}

export async function ensureDefaultFolders(organizationId: string) {
  const customId = defaultCustomFolderId(organizationId);
  const ahuId = defaultAhuFolderId(organizationId);

  await prisma.databaseFolder.upsert({
    where: { id: customId },
    create: {
      id: customId,
      organizationId,
      scope: "custom",
      name: "Umum",
      sortOrder: 0,
    },
    update: {},
  });
  await prisma.databaseFolder.upsert({
    where: { id: ahuId },
    create: {
      id: ahuId,
      organizationId,
      scope: "ahu",
      name: "Umum",
      sortOrder: 0,
    },
    update: {},
  });
  for (const kind of AHU_DATASET_KINDS) {
    const id = defaultAhuFileId(organizationId, kind);
    const names: Record<AhuDatasetKind, string> = {
      materials: "Material Prices",
      profiles: "Profile Data",
      components: "Component Catalog",
    };
    await prisma.ahuDatasetFile.upsert({
      where: { id },
      create: {
        id,
        folderId: ahuId,
        kind,
        name: names[kind],
        sortOrder: AHU_DATASET_KINDS.indexOf(kind),
      },
      update: {},
    });
  }
}

export type FolderSummary = {
  id: string;
  scope: DatabaseScope;
  name: string;
  sortOrder: number;
  filesCount: number;
  updatedAt: string;
};

export type AhuFileSummary = {
  id: string;
  folderId: string;
  kind: AhuDatasetKind;
  name: string;
  sortOrder: number;
  rowsCount: number;
  updatedAt: string;
};

export type CustomFileSummary = {
  id: string;
  folderId: string | null;
  name: string;
  rowsCount: number;
  columnsCount: number;
  updatedAt: string;
};

export async function resolveAhuDatasetFileId(
  fileId: string | null | undefined,
  kind: AhuDatasetKind,
  organizationId: string
): Promise<string | null> {
  if (!fileId) return null;
  await ensureDefaultFolders(organizationId);
  const file = await prisma.ahuDatasetFile.findUnique({
    where: { id: fileId },
    include: { folder: { select: { organizationId: true } } },
  });
  if (!file || file.kind !== kind || file.folder.organizationId !== organizationId) {
    return null;
  }
  return file.id;
}
