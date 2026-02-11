-- CreateTable
CREATE TABLE "TrainerProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "progress" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainerProgress_userId_idx" ON "TrainerProgress"("userId");

-- CreateIndex
CREATE INDEX "TrainerProgress_trainerId_idx" ON "TrainerProgress"("trainerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerProgress_userId_trainerId_key" ON "TrainerProgress"("userId", "trainerId");

-- CreateIndex
CREATE INDEX "TrainerAttempt_userId_idx" ON "TrainerAttempt"("userId");

-- CreateIndex
CREATE INDEX "TrainerAttempt_trainerId_idx" ON "TrainerAttempt"("trainerId");

-- CreateIndex
CREATE INDEX "TrainerAttempt_createdAt_idx" ON "TrainerAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "TrainerProgress" ADD CONSTRAINT "TrainerProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerAttempt" ADD CONSTRAINT "TrainerAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
