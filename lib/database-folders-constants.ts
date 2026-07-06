export const DATABASE_SCOPES = ["custom", "ahu"] as const;
export type DatabaseScope = (typeof DATABASE_SCOPES)[number];

export const AHU_DATASET_KINDS = ["materials", "profiles", "components"] as const;
export type AhuDatasetKind = (typeof AHU_DATASET_KINDS)[number];

/** Legacy constant ids — used in unit tests for shape checks only. */
export const DEFAULT_CUSTOM_FOLDER_ID = "folder_custom_default";
export const DEFAULT_AHU_FOLDER_ID = "folder_ahu_default";

export const DEFAULT_AHU_FILE_IDS: Record<AhuDatasetKind, string> = {
  materials: "ahufile_materials_default",
  profiles: "ahufile_profiles_default",
  components: "ahufile_components_default",
};

export function defaultCustomFolderId(orgId: string) {
  return `folder_custom_${orgId}`;
}

export function defaultAhuFolderId(orgId: string) {
  return `folder_ahu_${orgId}`;
}

export function defaultAhuFileId(orgId: string, kind: AhuDatasetKind) {
  return `ahufile_${kind}_${orgId}`;
}

export function isDatabaseScope(value: string): value is DatabaseScope {
  return (DATABASE_SCOPES as readonly string[]).includes(value);
}

export function isAhuDatasetKind(value: string): value is AhuDatasetKind {
  return (AHU_DATASET_KINDS as readonly string[]).includes(value);
}

const DEFAULT_FOLDER_IDS = new Set([DEFAULT_CUSTOM_FOLDER_ID, DEFAULT_AHU_FOLDER_ID]);
const DEFAULT_AHU_FILE_ID_SET = new Set(Object.values(DEFAULT_AHU_FILE_IDS));

export function isDefaultFolderId(id: string): boolean {
  return DEFAULT_FOLDER_IDS.has(id) || /^folder_(custom|ahu)_/.test(id);
}

export function isDefaultAhuFileId(id: string): boolean {
  return DEFAULT_AHU_FILE_ID_SET.has(id) || /^ahufile_(materials|profiles|components)_/.test(id);
}
