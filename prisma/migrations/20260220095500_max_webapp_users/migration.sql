-- Add MAX user binding to app users.
ALTER TABLE "User" ADD COLUMN "maxUserId" TEXT;

-- Unique binding: one MAX user -> one app user.
CREATE UNIQUE INDEX "User_maxUserId_key" ON "User"("maxUserId");

