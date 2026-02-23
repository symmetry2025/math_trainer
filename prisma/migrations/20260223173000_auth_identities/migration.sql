-- CreateEnum
CREATE TYPE "IdentityProvider" AS ENUM ('password', 'max', 'telegram');

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "IdentityProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthLinkToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "IdentityProvider" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerUserId_key" ON "AuthIdentity"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

-- CreateIndex
CREATE INDEX "AuthIdentity_provider_idx" ON "AuthIdentity"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "AuthLinkToken_tokenHash_key" ON "AuthLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthLinkToken_userId_idx" ON "AuthLinkToken"("userId");

-- CreateIndex
CREATE INDEX "AuthLinkToken_provider_idx" ON "AuthLinkToken"("provider");

-- CreateIndex
CREATE INDEX "AuthLinkToken_expiresAt_idx" ON "AuthLinkToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthLinkToken_usedAt_idx" ON "AuthLinkToken"("usedAt");

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthLinkToken" ADD CONSTRAINT "AuthLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

