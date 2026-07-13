-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL DEFAULT 'PT Thermal True Indonesia',
    "companyAddress" TEXT NOT NULL DEFAULT '',
    "companyPhone" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "companyLogo" TEXT,
    "forexUSD" REAL NOT NULL DEFAULT 15800,
    "forexEUR" REAL NOT NULL DEFAULT 17200,
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

-- CreateTable
CREATE TABLE "MaterialPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "density" REAL NOT NULL,
    "pricePerKg" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProfileData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weightPerM" REAL NOT NULL,
    "pricePerM" REAL NOT NULL,
    "panelThick" INTEGER,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ComponentCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "spec" TEXT,
    "unitPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "moq" INTEGER,
    "leadTimeDays" INTEGER,
    "supplier" TEXT,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CostingProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "ahuModel" TEXT,
    "ahuRef" TEXT,
    "flowCMH" REAL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "dimH" REAL,
    "dimW" REAL,
    "dimD" REAL,
    "profileType" TEXT,
    "overhead" REAL NOT NULL DEFAULT 5.0,
    "contingency" REAL NOT NULL DEFAULT 3.0,
    "eskalasi" REAL NOT NULL DEFAULT 0.0,
    "asuransi" REAL NOT NULL DEFAULT 0.0,
    "mobilisasi" REAL NOT NULL DEFAULT 0.0,
    "margin" REAL NOT NULL DEFAULT 20.0,
    "totalHPP" REAL NOT NULL DEFAULT 0.0,
    "totalSelling" REAL NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CostingSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "subtotal" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CostingSection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CostingProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostingLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "qty" REAL NOT NULL,
    "qtyFormula" TEXT,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "unitPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "wasteFactor" REAL NOT NULL DEFAULT 1.0,
    "subtotal" REAL NOT NULL,
    "componentRef" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CostingLineItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "CostingSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
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
    "totalBeforeDisc" REAL NOT NULL DEFAULT 0.0,
    "totalAfterDisc" REAL NOT NULL DEFAULT 0.0,
    "totalPPN" REAL NOT NULL DEFAULT 0.0,
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
    CONSTRAINT "Quotation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CostingProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialPrice_code_key" ON "MaterialPrice"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileData_code_key" ON "ProfileData"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentCatalog_code_key" ON "ComponentCatalog"("code");
