-- CreateTable
CREATE TABLE "AuthProviderLinkRequest" (
    "id" TEXT NOT NULL,
    "provider" "IdentityProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthProviderLinkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthProviderLinkRequest_tokenHash_key" ON "AuthProviderLinkRequest"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AuthProviderLinkRequest_provider_providerUserId_key" ON "AuthProviderLinkRequest"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "AuthProviderLinkRequest_provider_idx" ON "AuthProviderLinkRequest"("provider");

-- CreateIndex
CREATE INDEX "AuthProviderLinkRequest_expiresAt_idx" ON "AuthProviderLinkRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthProviderLinkRequest_usedAt_idx" ON "AuthProviderLinkRequest"("usedAt");

