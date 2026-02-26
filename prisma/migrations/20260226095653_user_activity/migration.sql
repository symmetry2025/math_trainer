-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenPath" TEXT,
ADD COLUMN     "lastTrainerAt" TIMESTAMP(3),
ADD COLUMN     "lastTrainerId" TEXT;

-- CreateIndex
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");

-- CreateIndex
CREATE INDEX "User_lastSeenAt_idx" ON "User"("lastSeenAt");

-- CreateIndex
CREATE INDEX "User_lastTrainerAt_idx" ON "User"("lastTrainerAt");
