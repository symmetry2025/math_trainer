-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailConfirmationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailConfirmationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailConfirmationToken_tokenHash_key" ON "EmailConfirmationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailConfirmationToken_userId_idx" ON "EmailConfirmationToken"("userId");

-- CreateIndex
CREATE INDEX "EmailConfirmationToken_expiresAt_idx" ON "EmailConfirmationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailConfirmationToken_usedAt_idx" ON "EmailConfirmationToken"("usedAt");

-- AddForeignKey
ALTER TABLE "EmailConfirmationToken" ADD CONSTRAINT "EmailConfirmationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
