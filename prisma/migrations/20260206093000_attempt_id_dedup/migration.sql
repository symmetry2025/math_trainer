-- AddColumn
ALTER TABLE "TrainerAttempt" ADD COLUMN "attemptId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TrainerAttempt_userId_trainerId_attemptId_key" ON "TrainerAttempt"("userId", "trainerId", "attemptId");

