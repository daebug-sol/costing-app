-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('free', 'standard', 'enterprise');

-- AlterTable: new orgs default Free; backfill existing below
ALTER TABLE "Organization" ADD COLUMN "plan" "OrgPlan" NOT NULL DEFAULT 'free';

-- Existing orgs: AHU clients → enterprise; others → standard (avoid surprise Free caps)
UPDATE "Organization" SET "plan" = 'enterprise' WHERE "ahuModuleEnabled" = true;
UPDATE "Organization" SET "plan" = 'standard' WHERE "ahuModuleEnabled" = false;
