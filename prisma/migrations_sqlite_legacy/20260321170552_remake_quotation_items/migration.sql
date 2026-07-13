/*
  Warnings:

  - You are about to drop the `QuotationProject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `costingProjectId` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to alter the column `qty` on the `QuotationItem` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - Added the required column `projectId` to the `QuotationItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "QuotationProject_quotationId_projectId_key";

-- DropIndex
DROP INDEX "QuotationProject_quotationId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "QuotationProject";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "noSurat" TEXT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "perihal" TEXT,
    "clientName" TEXT,
    "clientCompany" TEXT,
    "clientAddress" TEXT,
    "clientAttn" TEXT,
    "clientPhone" TEXT,
    "projectLocation" TEXT,
    "ourRef" TEXT,
    "yourRef" TEXT,
    "discount" REAL NOT NULL DEFAULT 0.0,
    "ppn" REAL NOT NULL DEFAULT 11.0,
    "pphEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pphRate" REAL NOT NULL DEFAULT 0.0,
    "totalBeforeDisc" REAL NOT NULL DEFAULT 0.0,
    "totalAfterDisc" REAL NOT NULL DEFAULT 0.0,
    "totalPPN" REAL NOT NULL DEFAULT 0.0,
    "totalPPH" REAL NOT NULL DEFAULT 0.0,
    "grandTotal" REAL NOT NULL DEFAULT 0.0,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "warrantyTerms" TEXT,
    "validityDays" INTEGER NOT NULL DEFAULT 14,
    "termsConditions" TEXT,
    "notes" TEXT,
    "signedBy" TEXT,
    "checkedBy" TEXT,
    "approvedBy" TEXT,
    "logoPath" TEXT,
    "signaturePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quotation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CostingProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quotation" ("approvedBy", "checkedBy", "clientAddress", "clientAttn", "clientCompany", "clientName", "clientPhone", "createdAt", "deliveryTerms", "discount", "grandTotal", "id", "logoPath", "noSurat", "notes", "ourRef", "paymentTerms", "perihal", "ppn", "projectId", "projectLocation", "signaturePath", "signedBy", "status", "tanggal", "termsConditions", "totalAfterDisc", "totalBeforeDisc", "totalPPN", "updatedAt", "validityDays", "warrantyTerms", "yourRef") SELECT "approvedBy", "checkedBy", "clientAddress", "clientAttn", "clientCompany", "clientName", "clientPhone", "createdAt", "deliveryTerms", "discount", "grandTotal", "id", "logoPath", "noSurat", "notes", "ourRef", "paymentTerms", "perihal", "ppn", "projectId", "projectLocation", "signaturePath", "signedBy", "status", "tanggal", "termsConditions", "totalAfterDisc", "totalBeforeDisc", "totalPPN", "updatedAt", "validityDays", "warrantyTerms", "yourRef" FROM "Quotation";
DROP TABLE "Quotation";
ALTER TABLE "new_Quotation" RENAME TO "Quotation";
CREATE TABLE "new_QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "spec" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "uom" TEXT NOT NULL DEFAULT 'Unit',
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CostingProject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_QuotationItem" ("createdAt", "description", "id", "qty", "quotationId", "sortOrder", "spec", "totalPrice", "unitPrice", "uom", "updatedAt") SELECT "createdAt", "description", "id", "qty", "quotationId", "sortOrder", "spec", "totalPrice", "unitPrice", "uom", "updatedAt" FROM "QuotationItem";
DROP TABLE "QuotationItem";
ALTER TABLE "new_QuotationItem" RENAME TO "QuotationItem";
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");
CREATE INDEX "QuotationItem_projectId_idx" ON "QuotationItem"("projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
