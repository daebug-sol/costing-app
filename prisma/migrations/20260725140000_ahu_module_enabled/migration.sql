-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "ahuModuleEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing tenants keep AHU (no surprise for current clients)
UPDATE "Organization" SET "ahuModuleEnabled" = true;
