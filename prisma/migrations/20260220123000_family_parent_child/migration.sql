-- Add authProvider/onboarding to support MAX role selection.
CREATE TYPE "AuthProvider" AS ENUM ('web', 'max');

ALTER TABLE "User"
  ADD COLUMN "authProvider" "AuthProvider" NOT NULL DEFAULT 'web',
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Backfill: if user came from MAX previously (has maxUserId + technical email), mark as max provider.
UPDATE "User"
SET "authProvider" = 'max'
WHERE "maxUserId" IS NOT NULL AND "email" LIKE 'max+%@max.local';

-- Parent invites (one active code per parent).
CREATE TABLE "ParentInvite" (
  "id" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentInvite_parentId_key" ON "ParentInvite"("parentId");
CREATE UNIQUE INDEX "ParentInvite_code_key" ON "ParentInvite"("code");
ALTER TABLE "ParentInvite"
  ADD CONSTRAINT "ParentInvite_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Parent -> many students link (student can be linked only once in MVP).
CREATE TABLE "ParentStudentLink" (
  "id" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentStudentLink_studentId_key" ON "ParentStudentLink"("studentId");
CREATE UNIQUE INDEX "ParentStudentLink_parentId_studentId_key" ON "ParentStudentLink"("parentId","studentId");
CREATE INDEX "ParentStudentLink_parentId_idx" ON "ParentStudentLink"("parentId");
CREATE INDEX "ParentStudentLink_createdAt_idx" ON "ParentStudentLink"("createdAt");

ALTER TABLE "ParentStudentLink"
  ADD CONSTRAINT "ParentStudentLink_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentStudentLink"
  ADD CONSTRAINT "ParentStudentLink_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

