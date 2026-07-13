-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL DEFAULT 'PT Thermal True Indonesia',
    "companyAddress" TEXT NOT NULL DEFAULT '',
    "companyPhone" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "companyLogo" TEXT,
    "forexUSD" REAL NOT NULL DEFAULT 15800,
    "forexEUR" REAL NOT NULL DEFAULT 17200,
    "forexRM" REAL NOT NULL DEFAULT 3500,
    "forexSGD" REAL NOT NULL DEFAULT 11700,
    "defaultOverhead" REAL NOT NULL DEFAULT 5.0,
    "defaultContingency" REAL NOT NULL DEFAULT 3.0,
    "defaultMargin" REAL NOT NULL DEFAULT 20.0,
    "defaultEskalasi" REAL NOT NULL DEFAULT 0.0,
    "defaultAsuransi" REAL NOT NULL DEFAULT 0.0,
    "defaultMobilisasi" REAL NOT NULL DEFAULT 0.0,
    "ppnRate" REAL NOT NULL DEFAULT 11.0,
    "paymentTerms" TEXT NOT NULL DEFAULT 'DP 50%, balance CBD',
    "deliveryTerms" TEXT NOT NULL DEFAULT 'Ex-work Cikarang',
    "warrantyTerms" TEXT NOT NULL DEFAULT '12 months since delivery',
    "validityDays" INTEGER NOT NULL DEFAULT 14,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("companyAddress", "companyEmail", "companyLogo", "companyName", "companyPhone", "defaultAsuransi", "defaultContingency", "defaultEskalasi", "defaultMargin", "defaultMobilisasi", "defaultOverhead", "deliveryTerms", "forexEUR", "forexUSD", "id", "paymentTerms", "ppnRate", "updatedAt", "validityDays", "warrantyTerms") SELECT "companyAddress", "companyEmail", "companyLogo", "companyName", "companyPhone", "defaultAsuransi", "defaultContingency", "defaultEskalasi", "defaultMargin", "defaultMobilisasi", "defaultOverhead", "deliveryTerms", "forexEUR", "forexUSD", "id", "paymentTerms", "ppnRate", "updatedAt", "validityDays", "warrantyTerms" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
