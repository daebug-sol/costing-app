-- AlterTable: org-tunable AHU waste factors (defaults = original workbook values)
ALTER TABLE "AppSettings" ADD COLUMN "profileWasteFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.05;
ALTER TABLE "AppSettings" ADD COLUMN "linerWasteFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.05;
ALTER TABLE "AppSettings" ADD COLUMN "plateWasteFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.15;
