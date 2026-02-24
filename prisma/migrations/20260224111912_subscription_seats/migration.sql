-- CreateTable
CREATE TABLE "SubscriptionSeat" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'none',
    "paidUntil" TIMESTAMP(3),
    "cpSubscriptionId" TEXT,
    "cpToken" TEXT,
    "cpCardMask" TEXT,
    "billingUpdatedAt" TIMESTAMP(3),
    "assignedStudentId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionSeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionSeat_assignedStudentId_key" ON "SubscriptionSeat"("assignedStudentId");

-- CreateIndex
CREATE INDEX "SubscriptionSeat_parentId_idx" ON "SubscriptionSeat"("parentId");

-- CreateIndex
CREATE INDEX "SubscriptionSeat_status_idx" ON "SubscriptionSeat"("status");

-- CreateIndex
CREATE INDEX "SubscriptionSeat_paidUntil_idx" ON "SubscriptionSeat"("paidUntil");

-- CreateIndex
CREATE INDEX "SubscriptionSeat_billingUpdatedAt_idx" ON "SubscriptionSeat"("billingUpdatedAt");

-- AddForeignKey
ALTER TABLE "SubscriptionSeat" ADD CONSTRAINT "SubscriptionSeat_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionSeat" ADD CONSTRAINT "SubscriptionSeat_assignedStudentId_fkey" FOREIGN KEY ("assignedStudentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
