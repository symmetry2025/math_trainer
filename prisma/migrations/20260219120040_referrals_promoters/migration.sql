-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'promoter';

-- CreateTable
CREATE TABLE "Promoter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promoter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralAttribution" (
    "id" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstPaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Promoter_userId_key" ON "Promoter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Promoter_code_key" ON "Promoter"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralAttribution_userId_key" ON "ReferralAttribution"("userId");

-- CreateIndex
CREATE INDEX "ReferralAttribution_promoterId_idx" ON "ReferralAttribution"("promoterId");

-- CreateIndex
CREATE INDEX "ReferralAttribution_attributedAt_idx" ON "ReferralAttribution"("attributedAt");

-- CreateIndex
CREATE INDEX "ReferralAttribution_firstPaidAt_idx" ON "ReferralAttribution"("firstPaidAt");

-- AddForeignKey
ALTER TABLE "Promoter" ADD CONSTRAINT "Promoter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
