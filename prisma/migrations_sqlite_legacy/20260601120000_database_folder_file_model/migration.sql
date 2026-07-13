-- CreateTable
CREATE TABLE "DatabaseFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AhuDatasetFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "folderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AhuDatasetFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DatabaseFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "MaterialPrice" ADD COLUMN "datasetFileId" TEXT;
ALTER TABLE "ProfileData" ADD COLUMN "datasetFileId" TEXT;
ALTER TABLE "ComponentCatalog" ADD COLUMN "datasetFileId" TEXT;
ALTER TABLE "CustomDbTable" ADD COLUMN "folderId" TEXT;

-- CreateIndex
CREATE INDEX "DatabaseFolder_scope_sortOrder_idx" ON "DatabaseFolder"("scope", "sortOrder");
CREATE INDEX "AhuDatasetFile_folderId_kind_idx" ON "AhuDatasetFile"("folderId", "kind");
CREATE INDEX "AhuDatasetFile_folderId_sortOrder_idx" ON "AhuDatasetFile"("folderId", "sortOrder");
CREATE INDEX "MaterialPrice_datasetFileId_idx" ON "MaterialPrice"("datasetFileId");
CREATE INDEX "ProfileData_datasetFileId_idx" ON "ProfileData"("datasetFileId");
CREATE INDEX "ComponentCatalog_datasetFileId_idx" ON "ComponentCatalog"("datasetFileId");
CREATE INDEX "CustomDbTable_folderId_idx" ON "CustomDbTable"("folderId");

-- Backfill: default folders and AHU dataset files
INSERT INTO "DatabaseFolder" ("id", "scope", "name", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('folder_custom_default', 'custom', 'Umum', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('folder_ahu_default', 'ahu', 'Umum', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "AhuDatasetFile" ("id", "folderId", "kind", "name", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('ahufile_materials_default', 'folder_ahu_default', 'materials', 'Material Prices', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ahufile_profiles_default', 'folder_ahu_default', 'profiles', 'Profile Data', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ahufile_components_default', 'folder_ahu_default', 'components', 'Component Catalog', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "CustomDbTable" SET "folderId" = 'folder_custom_default' WHERE "folderId" IS NULL;

UPDATE "MaterialPrice" SET "datasetFileId" = 'ahufile_materials_default' WHERE "datasetFileId" IS NULL;
UPDATE "ProfileData" SET "datasetFileId" = 'ahufile_profiles_default' WHERE "datasetFileId" IS NULL;
UPDATE "ComponentCatalog" SET "datasetFileId" = 'ahufile_components_default' WHERE "datasetFileId" IS NULL;
