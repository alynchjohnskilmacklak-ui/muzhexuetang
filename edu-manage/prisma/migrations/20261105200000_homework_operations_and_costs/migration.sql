ALTER TABLE "Fee"
ADD COLUMN "overdueNotifiedAt" TIMESTAMP(3);

CREATE INDEX "Fee_status_dueDate_overdueNotifiedAt_idx"
ON "Fee"("status", "dueDate", "overdueNotifiedAt");

ALTER TABLE "NotifyConfig"
ADD COLUMN "overdueFeeAlert" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "OperatingExpense" (
  "id" TEXT NOT NULL,
  "division" TEXT NOT NULL DEFAULT 'JUNIOR',
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "occurredAt" DATE NOT NULL,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "OperatingExpense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperatingExpense_division_occurredAt_idx"
ON "OperatingExpense"("division", "occurredAt");

CREATE INDEX "OperatingExpense_division_category_occurredAt_idx"
ON "OperatingExpense"("division", "category", "occurredAt");

CREATE INDEX "OperatingExpense_deletedAt_idx"
ON "OperatingExpense"("deletedAt");

CREATE TABLE "HomeworkAssignment" (
  "id" TEXT NOT NULL,
  "termId" TEXT,
  "groupId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "instructions" TEXT,
  "teacherAttachmentUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "studentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "dueAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeworkAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomeworkAssignment_teacherId_status_createdAt_idx"
ON "HomeworkAssignment"("teacherId", "status", "createdAt");

CREATE INDEX "HomeworkAssignment_groupId_createdAt_idx"
ON "HomeworkAssignment"("groupId", "createdAt");

CREATE INDEX "HomeworkAssignment_termId_status_idx"
ON "HomeworkAssignment"("termId", "status");

ALTER TABLE "HomeworkAssignment"
ADD CONSTRAINT "HomeworkAssignment_termId_fkey"
FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HomeworkAssignment"
ADD CONSTRAINT "HomeworkAssignment_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomeworkAssignment"
ADD CONSTRAINT "HomeworkAssignment_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "HomeworkSubmission" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "parentUserId" TEXT NOT NULL,
  "content" TEXT,
  "attachmentUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "score" DOUBLE PRECISION,
  "teacherComment" TEXT,
  "reviewedById" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomeworkSubmission_assignmentId_studentId_key"
ON "HomeworkSubmission"("assignmentId", "studentId");

CREATE INDEX "HomeworkSubmission_studentId_submittedAt_idx"
ON "HomeworkSubmission"("studentId", "submittedAt");

CREATE INDEX "HomeworkSubmission_parentUserId_submittedAt_idx"
ON "HomeworkSubmission"("parentUserId", "submittedAt");

CREATE INDEX "HomeworkSubmission_assignmentId_status_idx"
ON "HomeworkSubmission"("assignmentId", "status");

ALTER TABLE "HomeworkSubmission"
ADD CONSTRAINT "HomeworkSubmission_assignmentId_fkey"
FOREIGN KEY ("assignmentId") REFERENCES "HomeworkAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomeworkSubmission"
ADD CONSTRAINT "HomeworkSubmission_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomeworkSubmission"
ADD CONSTRAINT "HomeworkSubmission_parentUserId_fkey"
FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RenewalFollowUp" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "termId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "ownerUserId" TEXT,
  "note" TEXT,
  "lastContactedAt" TIMESTAMP(3),
  "nextFollowUpAt" TIMESTAMP(3),
  "reminderSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RenewalFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RenewalFollowUp_studentId_termId_key"
ON "RenewalFollowUp"("studentId", "termId");

CREATE INDEX "RenewalFollowUp_termId_status_idx"
ON "RenewalFollowUp"("termId", "status");

CREATE INDEX "RenewalFollowUp_nextFollowUpAt_status_idx"
ON "RenewalFollowUp"("nextFollowUpAt", "status");

ALTER TABLE "RenewalFollowUp"
ADD CONSTRAINT "RenewalFollowUp_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RenewalFollowUp"
ADD CONSTRAINT "RenewalFollowUp_termId_fkey"
FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
