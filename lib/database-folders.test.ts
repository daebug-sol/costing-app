import {
  AHU_DATASET_KINDS,
  DATABASE_SCOPES,
  DEFAULT_AHU_FILE_IDS,
  DEFAULT_AHU_FOLDER_ID,
  DEFAULT_CUSTOM_FOLDER_ID,
  isAhuDatasetKind,
  isDatabaseScope,
  isDefaultAhuFileId,
  isDefaultFolderId,
} from "./database-folders-constants";

describe("database-folders", () => {
  it("recognizes valid scopes and kinds", () => {
    for (const scope of DATABASE_SCOPES) {
      expect(isDatabaseScope(scope)).toBe(true);
    }
    expect(isDatabaseScope("other")).toBe(false);

    for (const kind of AHU_DATASET_KINDS) {
      expect(isAhuDatasetKind(kind)).toBe(true);
    }
    expect(isAhuDatasetKind("fans")).toBe(false);
  });

  it("marks seeded default ids", () => {
    expect(isDefaultFolderId(DEFAULT_CUSTOM_FOLDER_ID)).toBe(true);
    expect(isDefaultFolderId(DEFAULT_AHU_FOLDER_ID)).toBe(true);
    expect(isDefaultFolderId("folder_other")).toBe(false);

    expect(isDefaultAhuFileId(DEFAULT_AHU_FILE_IDS.materials)).toBe(true);
    expect(isDefaultAhuFileId("ahufile_custom")).toBe(false);
  });
});
