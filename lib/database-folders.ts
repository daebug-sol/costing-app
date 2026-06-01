import { prisma } from "@/lib/prisma";

export const DATABASE_SCOPES = ["custom", "ahu"] as const;
export type DatabaseScope = (typeof DATABASE_SCOPES)[number];

export const AHU_DATASET_KINDS = ["materials", "profiles", "components"] as const;
export type AhuDatasetKind = (typeof AHU_DATASET_KINDS)[number];

export const DEFAULT_CUSTOM_FOLDER_ID = "folder_custom_default";
export const DEFAULT_AHU_FOLDER_ID = "folder_ahu_default";

export const DEFAULT_AHU_FILE_IDS: Record<AhuDatasetKind, string> = {
  materials: "ahufile_materials_default",
  profiles: "ahufile_profiles_default",
  components: "ahufile_components_default",
};

export function isDatabaseScope(value: string): value is DatabaseScope {
  return (DATABASE_SCOPES as readonly string[]).includes(value);
}

export function isAhuDatasetKind(value: string): value is AhuDatasetKind {
  return (AHU_DATASET_KINDS as readonly string[]).includes(value);
}

export function folderListOrder() {
  return [{ sortOrder: "asc" as const }, { name: "asc" as const }];
}

export function fileListOrder() {
  return [{ sortOrder: "asc" as const }, { name: "asc" as const }];
}

export async function ensureDefaultFolders() {
  await prisma.databaseFolder.upsert({
    where: { id: DEFAULT_CUSTOM_FOLDER_ID },
    create: {
      id: DEFAULT_CUSTOM_FOLDER_ID,
      scope: "custom",
      name: "Umum",
      sortOrder: 0,
    },
    update: {},
  });
  await prisma.databaseFolder.upsert({
    where: { id: DEFAULT_AHU_FOLDER_ID },
    create: {
      id: DEFAULT_AHU_FOLDER_ID,
      scope: "ahu",
      name: "Umum",
      sortOrder: 0,
    },
    update: {},
  });
  for (const kind of AHU_DATASET_KINDS) {
    const id = DEFAULT_AHU_FILE_IDS[kind];
    const names: Record<AhuDatasetKind, string> = {
      materials: "Material Prices",
      profiles: "Profile Data",
      components: "Component Catalog",
    };
    await prisma.ahuDatasetFile.upsert({
      where: { id },
      create: {
        id,
        folderId: DEFAULT_AHU_FOLDER_ID,
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

const DEFAULT_FOLDER_IDS = new Set([DEFAULT_CUSTOM_FOLDER_ID, DEFAULT_AHU_FOLDER_ID]);
const DEFAULT_AHU_FILE_ID_SET = new Set(Object.values(DEFAULT_AHU_FILE_IDS));

export function isDefaultFolderId(id: string): boolean {
  return DEFAULT_FOLDER_IDS.has(id);
}

export function isDefaultAhuFileId(id: string): boolean {
  return DEFAULT_AHU_FILE_ID_SET.has(id);
}

export async function resolveAhuDatasetFileId(
  fileId: string | null | undefined,
  kind: AhuDatasetKind
): Promise<string | null> {
  if (!fileId) return null;
  await ensureDefaultFolders();
  const file = await prisma.ahuDatasetFile.findUnique({ where: { id: fileId } });
  if (!file || file.kind !== kind) return null;
  return file.id;
}
