
-- AlterTable
ALTER TABLE "ManualCostingGroup" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "ManualCostingGroup_parentId_idx" ON "ManualCostingGroup"("parentId");

-- AddForeignKey
ALTER TABLE "ManualCostingGroup" ADD CONSTRAINT "ManualCostingGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ManualCostingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

