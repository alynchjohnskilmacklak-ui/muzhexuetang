CREATE TYPE "AcademicTermStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "AcademicTermKind" AS ENUM ('REGULAR', 'SUMMER', 'WINTER', 'WEEKEND', 'OTHER');
CREATE TYPE "TermMembershipStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'WITHDRAWN');
CREATE TYPE "StudyHallPlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
CREATE TYPE "HomeworkCompletionStatus" AS ENUM ('NOT_RECORDED', 'COMPLETED', 'PARTIAL', 'NEEDS_FOLLOW_UP');

CREATE TABLE "AcademicTerm" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "division" TEXT NOT NULL DEFAULT 'JUNIOR',
  "kind" "AcademicTermKind" NOT NULL DEFAULT 'REGULAR',
  "status" "AcademicTermStatus" NOT NULL DEFAULT 'DRAFT',
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "description" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentTermMembership" (
  "id" TEXT NOT NULL,
  "termId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "grade" TEXT,
  "classLabel" TEXT,
  "status" "TermMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentTermMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyHallPlan" (
  "id" TEXT NOT NULL,
  "termId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "StudyHallPlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "defaultSessionMinutes" INTEGER NOT NULL DEFAULT 120,
  "pickupContact" TEXT,
  "pickupPhone" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyHallPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyHallRecord" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "studyDate" DATE NOT NULL,
  "checkInAt" TIMESTAMP(3),
  "checkOutAt" TIMESTAMP(3),
  "homeworkStatus" "HomeworkCompletionStatus" NOT NULL DEFAULT 'NOT_RECORDED',
  "homeworkItems" JSONB,
  "teacherComment" TEXT,
  "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyHallRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParentActivationToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "parentUserId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentActivationToken_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ClassGroup" ADD COLUMN "termId" TEXT;

CREATE UNIQUE INDEX "AcademicTerm_division_code_key" ON "AcademicTerm"("division", "code");
CREATE INDEX "AcademicTerm_division_status_startDate_idx" ON "AcademicTerm"("division", "status", "startDate");
CREATE UNIQUE INDEX "StudentTermMembership_termId_studentId_key" ON "StudentTermMembership"("termId", "studentId");
CREATE INDEX "StudentTermMembership_studentId_status_idx" ON "StudentTermMembership"("studentId", "status");
CREATE INDEX "StudentTermMembership_termId_status_grade_idx" ON "StudentTermMembership"("termId", "status", "grade");
CREATE UNIQUE INDEX "StudyHallPlan_termId_studentId_key" ON "StudyHallPlan"("termId", "studentId");
CREATE INDEX "StudyHallPlan_termId_status_idx" ON "StudyHallPlan"("termId", "status");
CREATE INDEX "StudyHallPlan_studentId_status_idx" ON "StudyHallPlan"("studentId", "status");
CREATE UNIQUE INDEX "StudyHallRecord_planId_studyDate_key" ON "StudyHallRecord"("planId", "studyDate");
CREATE INDEX "StudyHallRecord_studentId_studyDate_idx" ON "StudyHallRecord"("studentId", "studyDate");
CREATE INDEX "StudyHallRecord_studyDate_homeworkStatus_idx" ON "StudyHallRecord"("studyDate", "homeworkStatus");
CREATE UNIQUE INDEX "ParentActivationToken_tokenHash_key" ON "ParentActivationToken"("tokenHash");
CREATE INDEX "ParentActivationToken_parentUserId_expiresAt_idx" ON "ParentActivationToken"("parentUserId", "expiresAt");
CREATE INDEX "ParentActivationToken_expiresAt_usedAt_idx" ON "ParentActivationToken"("expiresAt", "usedAt");
CREATE INDEX "ClassGroup_termId_status_idx" ON "ClassGroup"("termId", "status");

ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTermMembership" ADD CONSTRAINT "StudentTermMembership_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentTermMembership" ADD CONSTRAINT "StudentTermMembership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyHallPlan" ADD CONSTRAINT "StudyHallPlan_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyHallPlan" ADD CONSTRAINT "StudyHallPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyHallRecord" ADD CONSTRAINT "StudyHallRecord_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudyHallPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyHallRecord" ADD CONSTRAINT "StudyHallRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyHallRecord" ADD CONSTRAINT "StudyHallRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentActivationToken" ADD CONSTRAINT "ParentActivationToken_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentActivationToken" ADD CONSTRAINT "ParentActivationToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
