-- CreateTable
CREATE TABLE "QuotationProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuotationProject_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CostingProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "costingProjectId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "spec" TEXT,
    "qty" REAL NOT NULL DEFAULT 1,
    "uom" TEXT NOT NULL DEFAULT 'Unit',
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationItem_costingProjectId_fkey" FOREIGN KEY ("costingProjectId") REFERENCES "CostingProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuotationItem" ("createdAt", "description", "id", "qty", "quotationId", "sortOrder", "spec", "totalPrice", "unitPrice", "uom", "updatedAt") SELECT "createdAt", "description", "id", "qty", "quotationId", "sortOrder", "spec", "totalPrice", "unitPrice", "uom", "updatedAt" FROM "QuotationItem";
DROP TABLE "QuotationItem";
ALTER TABLE "new_QuotationItem" RENAME TO "QuotationItem";
CREATE INDEX "QuotationItem_costingProjectId_idx" ON "QuotationItem"("costingProjectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "QuotationProject_quotationId_idx" ON "QuotationProject"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationProject_quotationId_projectId_key" ON "QuotationProject"("quotationId", "projectId");
