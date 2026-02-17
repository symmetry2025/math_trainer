-- CreateEnum
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('none', 'active', 'past_due', 'cancelled');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "billingStatus" "BillingSubscriptionStatus" NOT NULL DEFAULT 'none',
ADD COLUMN     "billingUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "cpCardMask" TEXT,
ADD COLUMN     "cpSubscriptionId" TEXT,
ADD COLUMN     "cpToken" TEXT,
ADD COLUMN     "paidUntil" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
