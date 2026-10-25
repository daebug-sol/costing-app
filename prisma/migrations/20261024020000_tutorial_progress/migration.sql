-- CreateTable
CREATE TABLE "TutorialProgress" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tutorialKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorialProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TutorialProgress_organizationId_userId_idx" ON "TutorialProgress"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialProgress_organizationId_userId_tutorialKey_key" ON "TutorialProgress"("organizationId", "userId", "tutorialKey");

-- AddForeignKey
ALTER TABLE "TutorialProgress" ADD CONSTRAINT "TutorialProgress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
